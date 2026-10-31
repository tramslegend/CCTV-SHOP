// Media library queries: list (search, used/unused filter, newest first, paginated) and single items.
import type { Filter } from "mongodb";
import { fileNameOf, MEDIA_PAGE_SIZE, type MediaFilter, type MediaItem, type MediaListState } from "@/components/admin/media/types";
import { contains, db, type Doc } from "@/db";
import type { MediaRow } from "@/db/schema";
import { storageKind } from "@/lib/storage";
import { usageCounts } from "./usage";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

/** "29 Oct 2026, 14:03" in UK time. */
export const formatDate = (d: Date) => dateFormat.format(d);

const FILTERS: MediaFilter[] = ["all", "used", "unused"];

export function parseMediaParams(sp: Record<string, string | string[] | undefined>): MediaListState {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const filter = one("filter") as MediaFilter;
  const page = Number.parseInt(one("page"), 10);
  return {
    q: one("q").trim().slice(0, 120),
    filter: FILTERS.includes(filter) ? filter : "all",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

export function toMediaItem(r: MediaRow, usedIn = 0): MediaItem {
  const created = new Date(r.createdAt);
  return {
    id: r.id,
    url: r.url,
    fileName: fileNameOf(r.pathname || r.url),
    alt: r.alt,
    contentType: r.contentType,
    size: r.size,
    width: r.width,
    height: r.height,
    uploaded: r.uploadedBy !== null,
    storage: storageKind(r.url),
    usedIn: Number(usedIn) || 0,
    createdAt: created.toISOString(),
    createdLabel: formatDate(created),
  };
}

type MediaFilterQuery = Filter<Doc<MediaRow>>;

/** The address, alt text or file path contains the search (ignoring case). */
function searchCondition(q: string): MediaFilterQuery {
  if (!q) return {};
  return { $or: [{ url: contains(q) }, { alt: contains(q) }, { pathname: contains(q) }] };
}

const both = (a: MediaFilterQuery, b: MediaFilterQuery): MediaFilterQuery => ({ $and: [a, b] });

export async function listMedia(state: MediaListState, pageSize = MEDIA_PAGE_SIZE) {
  const usage = await usageCounts();
  const usedUrls = [...usage.keys()];
  const search = searchCondition(state.q);
  const used: MediaFilterQuery = { url: { $in: usedUrls } };
  const filters: Record<MediaFilter, MediaFilterQuery> = { all: search, used: both(search, used), unused: both(search, { url: { $nin: usedUrls } }) };
  const offset = (state.page - 1) * pageSize;
  const [rows, all, usedCount] = await Promise.all([
    db.media.find(filters[state.filter]).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(pageSize).toArray(),
    db.media.countDocuments(search),
    db.media.countDocuments(both(search, used)),
  ]);
  const c = { all, used: usedCount };
  const total = state.filter === "used" ? c.used : state.filter === "unused" ? c.all - c.used : c.all;
  return {
    items: rows.map((r) => toMediaItem(r, usage.get(r.url) ?? 0)),
    total,
    counts: { all: c.all, used: c.used, unused: c.all - c.used },
  };
}

/** One media entry; `usedIn` is left at 0 — callers that need it use findUsage(). */
export async function getMediaItem(id: number): Promise<MediaItem | null> {
  const row = await db.media.findOne({ _id: id });
  return row ? toMediaItem(row) : null;
}
