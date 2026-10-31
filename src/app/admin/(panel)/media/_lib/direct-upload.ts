// Rules for browser → Vercel Blob uploads, checked by the token route before it signs a client token.
// Kept free of request/session code so it can be unit-checked on its own.
import { IMAGE_TYPES, type ImageType, isImageType, MAX_UPLOAD_BYTES, UPLOAD_FOLDERS } from "@/lib/storage";

/** "<folder>/<safe-name>.<ext>" — the client builds it from the file name; Blob adds a random suffix. */
const PATHNAME_RE = new RegExp(`^(${UPLOAD_FOLDERS.join("|")})/[a-z0-9]+(?:-[a-z0-9]+)*\\.(jpg|png|webp|avif|gif)$`);

export const ALLOWED_CONTENT_TYPES = Object.keys(IMAGE_TYPES) as ImageType[];

/** Lifetime of a client token: long enough for an 8 MB upload on a slow connection. */
export const TOKEN_LIFETIME_MS = 15 * 60 * 1000;

export type DirectUploadCheck = { ok: true; contentType: ImageType; size: number } | { ok: false; message: string };

/**
 * Checks a client token request. `clientPayload` is the JSON string the browser sends with upload():
 * { contentType, size }. The token is then limited to that one content type and to 8 MB, so Blob itself refuses
 * anything else even if the browser lies here.
 */
export function checkDirectUpload(pathname: string, clientPayload: string | null): DirectUploadCheck {
  let payload: unknown;
  try {
    payload = clientPayload ? JSON.parse(clientPayload) : null;
  } catch {
    payload = null;
  }
  const { contentType, size } = (payload && typeof payload === "object" ? payload : {}) as { contentType?: unknown; size?: unknown };
  if (typeof contentType !== "string" || !isImageType(contentType))
    return { ok: false, message: "Only JPEG, PNG, WebP, AVIF and GIF images can be uploaded." };
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) return { ok: false, message: "The file size is missing." };
  if (size > MAX_UPLOAD_BYTES) return { ok: false, message: "Images can be up to 8 MB." };
  if (pathname.length > 100 || !PATHNAME_RE.test(pathname)) return { ok: false, message: "That file name or folder isn't allowed." };
  if (!pathname.endsWith(`.${IMAGE_TYPES[contentType]}`)) return { ok: false, message: "The file extension doesn't match the image type." };
  return { ok: true, contentType, size };
}
