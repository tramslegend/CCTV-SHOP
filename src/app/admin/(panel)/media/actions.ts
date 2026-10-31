"use server";

// Media library mutations. Every action: requireAdmin("media") → validation → database write → activity log.
// Library changes don't alter the shop (images are referenced by URL and only unused images can be deleted), so no
// catalogue reload is needed.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MediaActionResult, MediaItem } from "@/components/admin/media/types";
import { db, insert, type NewRow, transaction } from "@/db";
import { logActivity, requireAdmin } from "@/lib/admin/session";
import { deleteStoredFile, inspectStoredImage, isOwnBlobUrl, MAX_UPLOAD_BYTES, storageKind } from "@/lib/storage";
import { getMediaItem } from "./_lib/data";
import { recordMedia } from "./_lib/record";
import { findUsage, referencedImageUrls, usageTotal } from "./_lib/usage";

const fail = (message: string) => ({ ok: false as const, message });
const idSchema = z.number().int().positive();

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;

// ---------- alt text ----------

export async function updateMediaAlt(id: number, alt: string): Promise<MediaActionResult> {
  const { user } = await requireAdmin("media");
  const parsedId = idSchema.safeParse(id);
  const parsedAlt = z.string().max(300, "Keep alt text under 300 characters.").safeParse(alt);
  if (!parsedId.success) return fail("This image is no longer in the library.");
  if (!parsedAlt.success) return fail(parsedAlt.error.issues[0]?.message ?? "Check the alt text.");
  const next = parsedAlt.data.replace(/\s+/g, " ").trim() || null;

  const row = await db.media.findOne({ _id: parsedId.data }, { projection: { alt: 1 } });
  if (!row) return fail("This image is no longer in the library.");
  if ((row.alt ?? null) === next) return { ok: true, message: "No changes to save." };

  await db.media.updateOne({ _id: parsedId.data }, { $set: { alt: next } });
  await logActivity(user, "update", "media", parsedId.data, { alt: { from: row.alt ?? null, to: next } });
  revalidatePath("/admin/media");
  return { ok: true, message: next ? "Alt text saved." : "Alt text removed." };
}

// ---------- delete ----------

export async function deleteMedia(id: number): Promise<MediaActionResult> {
  const { user } = await requireAdmin("media");
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return fail("This image is no longer in the library.");
  const item = await db.media.findOne({ _id: parsed.data });
  if (!item) return fail("This image is no longer in the library.");

  const usage = await findUsage(item.url);
  const used = usageTotal(usage);
  if (used > 0) return fail(`This image is used in ${plural(used, "place")}, so it can't be deleted. Remove it from there first.`);

  // Another library entry pointing at the same file keeps the file.
  const twins = await db.media.countDocuments({ url: item.url, _id: { $ne: item.id } });

  let file: "deleted" | "missing" | "kept" = "kept";
  if (!twins) {
    try {
      file = await deleteStoredFile(item.url);
    } catch (error) {
      console.error("Deleting media file failed", item.url, error);
      return fail("The file couldn't be deleted from storage, so the image was kept. Try again.");
    }
  }
  await db.media.deleteOne({ _id: item.id });
  await logActivity(user, "delete", "media", item.id, { url: item.url, alt: item.alt, file });
  revalidatePath("/admin/media");
  return {
    ok: true,
    message:
      file === "kept"
        ? storageKind(item.url) === "external"
          ? "Removed from the library. The original catalogue file stays on the server."
          : "Removed from the library. The file is still listed under another entry."
        : "Image deleted.",
  };
}

// ---------- import existing images ----------

/** Runs `fn` over `items` with at most `limit` in flight. */
async function eachLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/**
 * Creates library entries for every image the catalogue and content already reference (product, kit, category and
 * blog images, including the original catalogue files under /sites/…) that the library doesn't list yet. Idempotent:
 * URLs already in the library are skipped, so a second run adds nothing. Files that are missing on disk are skipped.
 */
export async function importExistingImages(): Promise<MediaActionResult<{ added: number; missing: number; skipped: number }>> {
  const { user } = await requireAdmin("media");
  const [urls, inLibrary] = await Promise.all([referencedImageUrls(), db.media.find().project<{ url: string }>({ _id: 0, url: 1 }).toArray()]);
  const known = new Set(inLibrary.map((r) => r.url));
  const candidates = urls.filter((u) => !known.has(u));
  if (!candidates.length)
    return { ok: true, message: "Nothing new to import: the library already lists every image the shop uses.", data: { added: 0, missing: 0, skipped: 0 } };

  // Alt text hints: the product image's alt, else the category name or post title the image belongs to.
  const hintLists = await Promise.all([
    db.productImages.find({ alt: { $nin: [null, ""] } }).project<{ url: string; alt: string }>({ _id: 0, url: 1, alt: 1 }).toArray(),
    db.categories.find({ imageUrl: { $ne: null } }).project<{ url: string; alt: string }>({ _id: 0, url: "$imageUrl", alt: "$name" }).toArray(),
    db.blogPosts.find({ coverImage: { $ne: null } }).project<{ url: string; alt: string }>({ _id: 0, url: "$coverImage", alt: "$title" }).toArray(),
  ]);
  const altFor = new Map<string, string>();
  for (const h of hintLists.flat()) if (!altFor.has(h.url)) altFor.set(h.url, h.alt.slice(0, 300));

  const rows: (NewRow<"media"> & { url: string })[] = [];
  const missing: string[] = [];
  let skipped = 0;
  await eachLimit(candidates, 16, async (url) => {
    // Images on other sites aren't stored by the shop: nothing to inspect, and next/image wouldn't serve them.
    if (!url.startsWith("/") && !isOwnBlobUrl(url)) {
      skipped++;
      return;
    }
    const info = await inspectStoredImage(url);
    if (!info) {
      missing.push(url);
      return;
    }
    rows.push({ url, ...info, alt: altFor.get(url) ?? null, uploadedBy: null });
  });
  rows.sort((a, b) => a.url.localeCompare(b.url));
  missing.sort();

  // One import at a time; re-check inside the lock so overlapping runs never add the same URL twice. Writing the lock
  // document first makes overlapping imports conflict, so a later one is retried after the first has committed.
  const added = await transaction(async (session) => {
    await db.counters.updateOne({ _id: "lock:media-import" }, { $inc: { seq: 1 } }, { upsert: true, session });
    const now = new Set((await db.media.find({}, { session }).project<{ url: string }>({ _id: 0, url: 1 }).toArray()).map((r) => r.url));
    const fresh = rows.filter((r) => !now.has(r.url));
    for (let i = 0; i < fresh.length; i += 500) await insert("media", fresh.slice(i, i + 500), { session });
    return fresh.length;
  });

  if (added) {
    await logActivity(user, "import", "media", null, { added, missing: missing.length, skipped });
    revalidatePath("/admin/media");
  }
  const notes = [
    missing.length &&
      `${plural(missing.length, "referenced file")} ${missing.length === 1 ? "is" : "are"} missing and can't be listed: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}.`,
    skipped && `${plural(skipped, "image")} on other websites ${skipped === 1 ? "was" : "were"} skipped.`,
  ].filter(Boolean);
  const head = added ? `Imported ${plural(added, "image")}.` : "Nothing new to import: the library already lists every image the shop uses.";
  return { ok: true, message: [head, ...notes].join(" "), data: { added, missing: missing.length, skipped } };
}

// ---------- direct (browser → Blob) uploads ----------

const directUploadSchema = z.object({
  url: z.string().url().max(2000),
  width: z.number().int().positive().max(100_000).nullable(),
  height: z.number().int().positive().max(100_000).nullable(),
});

/**
 * Called by the browser right after upload() put a file in Vercel Blob. Checks the blob really is in this shop's store
 * and is an image (sniffing its first bytes, as the server upload path does), then adds it to the library.
 * Width/height come from the file header; the browser's values are only a fallback.
 */
export async function recordDirectUpload(input: { url: string; width: number | null; height: number | null }): Promise<MediaActionResult<{ media: MediaItem }>> {
  const { user } = await requireAdmin("media");
  const parsed = directUploadSchema.safeParse(input);
  if (!parsed.success) return fail("The upload couldn't be recorded.");
  const { url, width, height } = parsed.data;
  if (!isOwnBlobUrl(url)) return fail("That file isn't in the shop's image store.");

  const info = await inspectStoredImage(url);
  if (!info || info.size > MAX_UPLOAD_BYTES) {
    await deleteStoredFile(url).catch((error: unknown) => console.error("Removing a rejected upload failed", url, error));
    return fail(info ? "Images can be up to 8 MB, so the upload was removed." : "The file isn't a valid JPEG, PNG, WebP, AVIF or GIF image, so it was removed.");
  }
  const id = await recordMedia({ url, ...info, width: info.width ?? width, height: info.height ?? height, uploadedBy: user.id });
  const media = await getMediaItem(id);
  if (!media) return fail("The upload couldn't be recorded.");
  return { ok: true, message: "Uploaded.", data: { media } };
}
