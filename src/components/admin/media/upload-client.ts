// Browser side of image uploads, shared by the media library and the product images editor.
//  - Production (BLOB_READ_WRITE_TOKEN set on the server): the file goes straight from the browser to Vercel Blob with
//    upload() from @vercel/blob/client, using the token route /admin/media/api/blob; the library entry is then
//    recorded by the recordDirectUpload action. Vercel caps request bodies at ~4.5 MB, so this is the only way to
//    upload larger images in production.
//  - Local development: the file is posted to an upload route handler, which stores it under public/uploads/.
// Both report progress (0–100).
import { upload } from "@vercel/blob/client";
import { recordDirectUpload } from "@/app/admin/(panel)/media/actions";
import type { MediaItem } from "./types";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };

export type UploadMode = "blob" | "server";

export interface UploadResult {
  id: number | null;
  url: string;
  width: number | null;
  height: number | null;
  size: number;
  media: MediaItem | null;
}

const SESSION_ENDED = "Your session has ended. Sign in again in another tab, then retry.";

/** A readable reason the file can't be uploaded, or null when it's fine. */
export function checkImageFile(file: File): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return `${file.name}: use a JPEG, PNG, WebP, AVIF or GIF image.`;
  if (!file.size) return `${file.name} is empty.`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name} is larger than 8 MB.`;
  return null;
}

let modeRequest: Promise<UploadMode> | null = null;

/** Asks the server once per page load whether uploads go straight to Blob. */
export function getUploadMode(): Promise<UploadMode> {
  modeRequest ??= fetch("/admin/media/api/upload", { headers: { accept: "application/json" }, cache: "no-store" })
    .then(async (res) => {
      if (res.redirected) throw new Error(SESSION_ENDED);
      const data = (await res.json().catch(() => ({}))) as { mode?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Uploads aren't available right now.");
      return data.mode === "blob" ? ("blob" as const) : ("server" as const);
    })
    .catch((error: unknown) => {
      modeRequest = null;
      throw error;
    });
  return modeRequest;
}

/** Pixel size measured by the browser (a fallback for direct uploads; the server reads the header itself). */
function measure(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const src = URL.createObjectURL(file);
    const img = new window.Image();
    const done = (v: { width: number; height: number } | null) => {
      URL.revokeObjectURL(src);
      resolve(v);
    };
    img.onload = () => done(img.naturalWidth && img.naturalHeight ? { width: img.naturalWidth, height: img.naturalHeight } : null);
    img.onerror = () => done(null);
    img.src = src;
  });
}

const safeName = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "") || "image";

/** Server path: multipart POST with upload progress (fetch can't report it, XMLHttpRequest can). */
function postFile(endpoint: string, file: File, onProgress?: (percent: number) => void): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      // A redirect (to the login page) means the session ended.
      if (xhr.responseURL && new URL(xhr.responseURL).pathname !== endpoint) return reject(new Error(SESSION_ENDED));
      const data = (xhr.response ?? {}) as Partial<UploadResult> & { error?: string };
      if (xhr.status === 401) return reject(new Error(SESSION_ENDED));
      if (xhr.status < 200 || xhr.status >= 300 || !data.url) return reject(new Error(data.error ?? "Upload failed."));
      onProgress?.(100);
      resolve({
        id: data.id ?? null,
        url: data.url,
        width: data.width ?? null,
        height: data.height ?? null,
        size: data.size ?? file.size,
        media: data.media ?? null,
      });
    };
    xhr.onerror = () => reject(new Error("The upload was interrupted. Check your connection and try again."));
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

/** Direct path: browser → Vercel Blob, then the library entry is recorded (and the file re-checked) on the server. */
async function uploadToBlob(file: File, folder: string, onProgress?: (percent: number) => void): Promise<UploadResult> {
  const dims = await measure(file);
  const pathname = `${folder}/${safeName(file.name)}.${EXTENSIONS[file.type]}`;
  let blobUrl: string;
  try {
    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/admin/media/api/blob",
      contentType: file.type,
      clientPayload: JSON.stringify({ contentType: file.type, size: file.size }),
      onUploadProgress: ({ percentage }) => onProgress?.(Math.min(99, Math.round(percentage))),
    });
    blobUrl = blob.url;
  } catch (error) {
    // The token route's own message doesn't survive upload(); the usual cause is an ended session.
    const message = error instanceof Error ? error.message : "";
    throw new Error(/client token/i.test(message) ? `The upload was refused. ${SESSION_ENDED}` : "The upload failed. Try again.");
  }
  const result = await recordDirectUpload({ url: blobUrl, width: dims?.width ?? null, height: dims?.height ?? null });
  if (!result.ok) throw new Error(result.message);
  onProgress?.(100);
  const { media } = result.data;
  return { id: media.id, url: media.url, width: media.width, height: media.height, size: media.size ?? file.size, media };
}

/**
 * Uploads one image and adds it to the media library. `folder` is the storage folder ("media", "products",
 * "categories" — must be one of UPLOAD_FOLDERS in src/lib/storage.ts); `serverEndpoint` is the route used when uploads
 * go through the server (local development).
 */
export async function uploadImage(
  file: File,
  { folder, serverEndpoint, onProgress, mode }: { folder: "media" | "products" | "categories"; serverEndpoint: string; onProgress?: (percent: number) => void; mode?: UploadMode },
): Promise<UploadResult> {
  const problem = checkImageFile(file);
  if (problem) throw new Error(problem);
  const how = mode ?? (await getUploadMode());
  return how === "blob" ? uploadToBlob(file, folder, onProgress) : postFile(serverEndpoint, file, onProgress);
}
