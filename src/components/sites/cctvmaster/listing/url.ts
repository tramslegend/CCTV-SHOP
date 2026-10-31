import type { QueryState } from "./types";

/**
 * Builds a listing URL from the current query with some keys changed (null removes a key).
 * Any change other than `page` sends the visitor back to page 1.
 */
export function listingHref(basePath: string, current: QueryState, patch: Record<string, string | null> = {}): string {
  const next: QueryState = { ...current };
  if (!("page" in patch)) delete next.page;
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") delete next[key];
    else next[key] = value;
  }
  if (next.page === "1") delete next.page;
  const qs = new URLSearchParams(next).toString().replace(/%2C/g, ",");
  return qs ? `${basePath}?${qs}` : basePath;
}
