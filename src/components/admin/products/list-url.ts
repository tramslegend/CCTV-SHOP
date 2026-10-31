// URL state of the products list (/admin/products?q=…&type=…&status=…&availability=…&category=…&sort=…&dir=…&page=…).
// Shared by the server page (tabs, sort headers, pagination) and the client filter bar. Defaults are left out of the URL.
import type { Availability, ProductStatus } from "./types";

export type ListSort = "updated" | "name" | "price" | "stock";

export interface ListState {
  q: string;
  type: "all" | "products" | "kits";
  status: ProductStatus | "all";
  availability: Availability | "all";
  category: number | null;
  sort: ListSort;
  dir: "asc" | "desc";
  page: number;
}

export const defaultSortDir = (sort: ListSort): "asc" | "desc" => (sort === "name" ? "asc" : "desc");

export function listHref(state: ListState, patch: Partial<ListState> = {}): string {
  const next = { ...state, ...patch };
  // Any change other than paging starts again from page 1.
  if (!("page" in patch)) next.page = 1;
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.type !== "all") params.set("type", next.type);
  if (next.status !== "all") params.set("status", next.status);
  if (next.availability !== "all") params.set("availability", next.availability);
  if (next.category !== null) params.set("category", String(next.category));
  if (next.sort !== "updated") params.set("sort", next.sort);
  if (next.dir !== defaultSortDir(next.sort)) params.set("dir", next.dir);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}
