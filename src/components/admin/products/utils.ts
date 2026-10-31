// Client-safe helpers for the product form.
import type { ProductPick } from "./types";

/** URL slug from a product name: "Hikvision 4MP Turret (White)" → "hikvision-4mp-turret-white". */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

/** Returns a copy of the list with item `from` moved to index `to`. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

let counter = 0;
/** Stable client-side key for new list rows. */
export const newKey = (prefix: string) => `${prefix}-new-${Date.now().toString(36)}-${counter++}`;

/** Parses a typed amount ("£1,234.50") to a number, or null. */
export function parseAmount(v: string): number | null {
  const clean = v.replace(/[£,\s]/g, "");
  if (!clean || !/^\d+(\.\d+)?$/.test(clean)) return null;
  return Number(clean);
}

/** Product search for pickers (GET /admin/products/api/search). */
export async function searchProductPicks(q: string, type: "all" | "products" | "kits", exclude?: string): Promise<ProductPick[]> {
  const params = new URLSearchParams({ q, type });
  if (exclude) params.set("exclude", exclude);
  const res = await fetch(`/admin/products/api/search?${params}`, { headers: { accept: "application/json" } });
  if (res.redirected || !res.ok) throw new Error("Search failed");
  const body = (await res.json()) as { results: ProductPick[] };
  return body.results;
}

/** System monospace stack (the theme's --font-mono names a font that isn't loaded). */
export const MONO = "font-[family-name:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace]";
