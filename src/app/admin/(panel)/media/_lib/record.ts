// Recording uploaded images in the media library. Used by the upload route handlers (local / server uploads) and by
// the recordDirectUpload action (browser → Vercel Blob uploads in production).
import { db, insert } from "@/db";
import { type UploadFolder, uploadFile } from "@/lib/storage";
import { getMediaItem } from "./data";

interface NewMedia {
  url: string;
  pathname: string | null;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt?: string | null;
  uploadedBy: string | null;
}

/** Inserts a media row, or returns the existing one's id when the URL is already in the library (retries are harmless). */
export async function recordMedia(values: NewMedia): Promise<number> {
  const existing = await db.media.findOne({ url: values.url }, { projection: { _id: 0, id: 1 } });
  if (existing) return existing.id;
  const [row] = await insert("media", { ...values, alt: values.alt?.trim() || null });
  return row.id;
}

/** Validates and stores an uploaded image (server upload path) and adds it to the library. Throws UploadError. */
export async function storeUpload(file: File, folder: UploadFolder, userId: string) {
  const stored = await uploadFile(file, folder);
  const id = await recordMedia({ ...stored, uploadedBy: userId });
  const media = await getMediaItem(id);
  return { stored, id, media };
}
