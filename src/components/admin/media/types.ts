// Client-safe types and helpers for the media library (/admin/media) and the "Choose from library" picker.

/** Where the file behind a media entry lives. Only "uploads" and "blob" files are deleted with the entry. */
export type MediaStorage = "uploads" | "blob" | "external";

export interface MediaItem {
  id: number;
  url: string;
  /** Last path segment of the URL, e.g. "front-door-camera-lx3k9a1b2c3d.jpg". */
  fileName: string;
  alt: string | null;
  contentType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  /** Uploaded by someone in the back office (false for images imported from the existing catalogue). */
  uploaded: boolean;
  storage: MediaStorage;
  /** Number of distinct places (products, kits, categories, posts, orders…) that show this image. */
  usedIn: number;
  createdAt: string;
  /** createdAt formatted on the server in UK time, so server and client markup match. */
  createdLabel: string;
}

export type UsageKind = "product" | "kit" | "category" | "post" | "page" | "setting" | "order";

export interface UsageEntry {
  kind: UsageKind;
  id: string;
  label: string;
  /** How the image is used there, e.g. "Product image", "Kit component picture", "Cover image". */
  detail: string;
  /** Back-office page to edit it, when there is one. */
  href: string | null;
  /** Public page, when there is one. */
  publicHref: string | null;
}

export interface MediaUsage {
  entries: UsageEntry[];
  /** Past orders are summarised: only the latest few are listed in `entries`. */
  orderCount: number;
}

export type MediaFilter = "all" | "used" | "unused";

export interface MediaListState {
  q: string;
  filter: MediaFilter;
  page: number;
}

export const MEDIA_PAGE_SIZE = 48;

export function mediaListHref(state: MediaListState, patch: Partial<MediaListState> = {}): string {
  const next = { ...state, ...patch };
  if (!("page" in patch)) next.page = 1;
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.filter !== "all") params.set("filter", next.filter);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/admin/media?${qs}` : "/admin/media";
}

export type MediaActionResult<T = undefined> =
  | ({ ok: true; message: string } & (T extends undefined ? object : { data: T }))
  | { ok: false; message: string };

/** "1.4 MB", "820 KB", "512 bytes". */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "Unknown size";
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const formatDimensions = (w: number | null, h: number | null) => (w && h ? `${w} × ${h}` : null);

export const TYPE_LABELS: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/gif": "GIF",
};

/** Last path segment of a URL, decoded. */
export function fileNameOf(url: string): string {
  const last = url.split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? url;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}
