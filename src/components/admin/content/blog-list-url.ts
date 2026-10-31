// URL state of the blog list (/admin/content/blog?q=…&status=…&listed=…&page=…). Shared by the server page and the
// client filter bar. Defaults are left out of the URL.
import type { PostStatus } from "./types";

export interface BlogListState {
  q: string;
  status: PostStatus | "all";
  listed: "all" | "listed" | "unlisted";
  page: number;
}

export const BLOG_PAGE_SIZE = 25;

export function blogListHref(state: BlogListState, patch: Partial<BlogListState> = {}): string {
  const next = { ...state, ...patch };
  if (!("page" in patch)) next.page = 1;
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.status !== "all") params.set("status", next.status);
  if (next.listed !== "all") params.set("listed", next.listed);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/admin/content/blog?${qs}` : "/admin/content/blog";
}
