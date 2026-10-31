// File uploads for the back office. With BLOB_READ_WRITE_TOKEN set (Vercel) files go to Vercel Blob (public);
// without it (local development) they are written to public/uploads/<folder>/ and served by Next.js as static files.
// In production the browser uploads straight to Blob (see /admin/media/api/blob) because Vercel caps request bodies at
// ~4.5 MB; the server upload path (uploadFile) is what local development uses.
// Server-only: uses the file system and the Blob API token.
import { randomBytes } from "node:crypto";
import { mkdir, open, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// turbopackIgnore: these paths are only read at runtime (local uploads, image headers); without the marker the
// build traces the whole project (including public/) into the server bundle.
const PUBLIC_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

/** Accepted image types and the extension each is stored with. */
export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
} as const;
export type ImageType = keyof typeof IMAGE_TYPES;

/** Folders uploads may be stored under (local: public/uploads/<folder>, Blob: <folder>/…). */
export const UPLOAD_FOLDERS = ["media", "products", "categories"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export interface UploadedFile {
  url: string;
  pathname: string;
  contentType: ImageType;
  size: number;
  width: number | null;
  height: number | null;
}

export class UploadError extends Error {}

export const isImageType = (type: string): type is ImageType => type in IMAGE_TYPES;

/** Checks the file's leading bytes, so a renamed non-image is refused whatever its declared type. */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /^avi[fs]$/.test(ascii(8, 12))) return "image/avif";
  return null;
}

/**
 * Pixel size read from the image header (no decoding). Needs the first few KB of the file — JPEGs with large EXIF
 * blocks may need more; 256 KB covers practically every camera file. Returns null when the size can't be found.
 */
export function readImageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const type = sniffImageType(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ok = (w: number, h: number) => (w > 0 && h > 0 ? { width: w, height: h } : null);
  const has = (n: number) => bytes.byteLength >= n;
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  try {
    switch (type) {
      case "image/png":
        // Signature (8) + IHDR length (4) + "IHDR" (4), then width and height as big-endian uint32.
        return has(24) && ascii(12, 16) === "IHDR" ? ok(view.getUint32(16), view.getUint32(20)) : null;
      case "image/gif":
        return has(10) ? ok(view.getUint16(6, true), view.getUint16(8, true)) : null;
      case "image/webp": {
        const chunk = ascii(12, 16);
        if (chunk === "VP8 " && has(30)) return ok(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
        if (chunk === "VP8L" && has(25) && bytes[20] === 0x2f) {
          const [b0, b1, b2, b3] = bytes.subarray(21, 25);
          return ok(1 + (b0 | ((b1 & 0x3f) << 8)), 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10)));
        }
        if (chunk === "VP8X" && has(30)) {
          const u24 = (at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
          return ok(1 + u24(24), 1 + u24(27));
        }
        return null;
      }
      case "image/jpeg": {
        let i = 2;
        while (i + 9 < bytes.byteLength) {
          if (bytes[i] !== 0xff) return null;
          const marker = bytes[i + 1];
          if (marker === 0xff) {
            i += 1; // fill byte
            continue;
          }
          // Start-of-frame markers (baseline, progressive, lossless…), excluding DHT (C4), JPG (C8) and DAC (CC).
          if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
            return ok(view.getUint16(i + 7), view.getUint16(i + 5));
          if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
            i += 2; // markers without a length
            continue;
          }
          i += 2 + view.getUint16(i + 2);
        }
        return null;
      }
      case "image/avif": {
        // ISO-BMFF: the first "ispe" (image spatial extents) property box holds the primary image's size.
        for (let i = 4; i + 16 <= bytes.byteLength; i++) {
          if (bytes[i] === 0x69 && ascii(i, i + 4) === "ispe") return ok(view.getUint32(i + 8), view.getUint32(i + 12));
        }
        return null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

const safeSegment = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

/** Validates an uploaded image and returns its verified content type, or throws UploadError with a readable message. */
export async function validateImage(file: File): Promise<{ type: ImageType; bytes: Uint8Array }> {
  if (!file.size) throw new UploadError(`${file.name || "File"} is empty.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError(`${file.name} is larger than 8 MB.`);
  if (!isImageType(file.type)) throw new UploadError(`${file.name} is not a JPEG, PNG, WebP, AVIF or GIF image.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageType(bytes);
  if (!sniffed) throw new UploadError(`${file.name} does not look like a valid image.`);
  return { type: sniffed, bytes };
}

/**
 * Stores an image and returns its public URL: a Vercel Blob URL in production, `/uploads/<folder>/<name>` locally.
 * `folder` is a short label such as "products"; it is sanitised before use. Width and height come from the header.
 */
export async function uploadFile(file: File, folder: string): Promise<UploadedFile> {
  const { type, bytes } = await validateImage(file);
  const dir = folder.split("/").map(safeSegment).filter(Boolean).join("/") || "misc";
  const base = safeSegment(file.name.replace(/\.[^.]+$/, "")) || "image";
  const name = `${base}-${Date.now().toString(36)}${randomBytes(4).toString("hex")}.${IMAGE_TYPES[type]}`;
  const pathname = `${dir}/${name}`;
  const size = readImageSize(bytes);
  const meta = { contentType: type, size: bytes.byteLength, width: size?.width ?? null, height: size?.height ?? null };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(pathname, Buffer.from(bytes), { access: "public", contentType: type, addRandomSuffix: false });
    return { url: blob.url, pathname: blob.pathname, ...meta };
  }

  const target = path.join(UPLOADS_DIR, ...pathname.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return { url: `/uploads/${pathname}`, pathname, ...meta };
}

// ---------- where a stored file lives ----------

/** Whether uploads go straight from the browser to Vercel Blob (production) instead of through the server. */
export const directUploadsEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

/** Host of this shop's public Blob store ("<storeid>.public.blob.vercel-storage.com"), from the read-write token. */
export function blobStoreHost(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  // Token format: vercel_blob_rw_<storeId>_<secret>.
  const storeId = token?.split("_")[3];
  return storeId ? `${storeId.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

/** True for an https URL inside this shop's own Blob store (never another store or site). */
export function isOwnBlobUrl(url: string): boolean {
  const host = blobStoreHost();
  if (!host) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.toLowerCase() === host && u.pathname.length > 1;
  } catch {
    return false;
  }
}

/** Absolute path of a site-relative URL ("/sites/…", "/uploads/…") inside `root`, or null if it would escape it. */
function localPath(url: string, root: string): string | null {
  if (!url.startsWith("/") || url.startsWith("//") || url.includes("\\")) return null;
  let rel: string;
  try {
    rel = decodeURIComponent(url.split(/[?#]/)[0]);
  } catch {
    return null;
  }
  if (rel.includes("\0")) return null;
  const target = path.resolve(PUBLIC_DIR, `.${rel}`);
  return target.startsWith(root + path.sep) ? target : null;
}

/** Where an image URL is stored: an upload we may delete, our Blob store, or a file we never touch (catalogue, other sites). */
export type StorageKind = "uploads" | "blob" | "external";
export function storageKind(url: string): StorageKind {
  if (url.startsWith("/uploads/") && localPath(url, UPLOADS_DIR)) return "uploads";
  if (isOwnBlobUrl(url)) return "blob";
  return "external";
}

/**
 * Deletes the stored file behind a media URL. Only files under public/uploads/ (local) or in this shop's Blob store are
 * ever deleted; anything else (the original catalogue images, other sites) is left alone and reported as "kept".
 */
export async function deleteStoredFile(url: string): Promise<"deleted" | "missing" | "kept"> {
  const kind = storageKind(url);
  if (kind === "blob") {
    const { del } = await import("@vercel/blob");
    await del(url);
    return "deleted";
  }
  if (kind === "uploads") {
    const target = localPath(url, UPLOADS_DIR);
    if (!target) return "kept";
    try {
      await unlink(target);
      return "deleted";
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return "missing";
      throw error;
    }
  }
  return "kept";
}

export interface StoredImageInfo {
  contentType: ImageType;
  size: number;
  width: number | null;
  height: number | null;
  /** Blob pathname, or the path under public/uploads for local uploads; null for other files. */
  pathname: string | null;
}

const HEADER_BYTES = 256 * 1024;

/**
 * Type, size and dimensions of an image the shop already serves: a file under public/ (catalogue images, local uploads)
 * or a blob in this shop's store. Returns null when the file is missing or isn't a supported image.
 */
export async function inspectStoredImage(url: string): Promise<StoredImageInfo | null> {
  if (isOwnBlobUrl(url)) {
    const { head } = await import("@vercel/blob");
    let info: Awaited<ReturnType<typeof head>>;
    try {
      info = await head(url);
    } catch {
      return null;
    }
    const res = await fetch(url, { headers: { range: `bytes=0-${HEADER_BYTES - 1}` }, cache: "no-store" });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) return null;
    const dims = readImageSize(bytes);
    return { contentType: type, size: info.size, width: dims?.width ?? null, height: dims?.height ?? null, pathname: info.pathname };
  }

  const target = localPath(url, PUBLIC_DIR);
  if (!target) return null;
  let handle: Awaited<ReturnType<typeof open>> | null = null;
  try {
    handle = await open(/* turbopackIgnore: true */ target, "r");
    const stat = await handle.stat();
    if (!stat.isFile()) return null;
    const buffer = new Uint8Array(Math.min(HEADER_BYTES, stat.size));
    await handle.read(buffer, 0, buffer.byteLength, 0);
    const type = sniffImageType(buffer);
    if (!type) return null;
    const dims = readImageSize(buffer);
    const pathname = url.startsWith("/uploads/") ? path.relative(UPLOADS_DIR, target).split(path.sep).join("/") : null;
    return { contentType: type, size: stat.size, width: dims?.width ?? null, height: dims?.height ?? null, pathname };
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}
