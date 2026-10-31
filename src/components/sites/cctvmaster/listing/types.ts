// Shapes shared by the listing server code and its client components (no server imports here).

export type SortKey = "featured" | "name-asc" | "name-desc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
];

/** Default for listings without their own product order (/products, search results). */
export const DEFAULT_SORT: SortKey = "name-asc";

/** Category pages open in the owner's order (Admin → Categories → Products in this category). */
export const defaultSortFor = (hasOwnOrder: boolean): SortKey => (hasOwnOrder ? "featured" : DEFAULT_SORT);

/** Listing query string, flattened: facet values are comma-joined. */
export type QueryState = Record<string, string>;

/** A category in the listing sidebar, with the number of listed products it holds. */
export interface SidebarNode {
  slug: string;
  name: string;
  href: string;
  count: number;
  children: SidebarNode[];
}

export interface KitNavLink {
  name: string;
  href: string;
  count: number;
}

export interface KitNavSystem {
  slug: string;
  name: string;
  href: string;
  count: number;
  groups: { label: string; links: KitNavLink[] }[];
}

export interface KitNav {
  name: string;
  href: string;
  count: number;
  systems: KitNavSystem[];
}

/** What the compare tray keeps for each picked product. */
export interface CompareItem {
  slug: string;
  sku: string;
  title: string;
  image?: string;
}

/** Minimal product data a card hands to its client-side buttons. */
export interface CartItemData {
  slug: string;
  name: string;
  sku?: string;
  price: number;
  image?: string;
}
