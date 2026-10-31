// Server-only helpers behind every product listing (/products, categories, collections, brands).
import {
  getCard,
  getCategories,
  getCategory,
  getCategoryTree,
  getProduct,
  getShopProducts,
  getTaxonomy,
  searchProducts,
} from "@/lib/cctvmaster/catalog";
import { withVat } from "@/lib/cctvmaster/money";
import type { Category, ProductCard } from "@/lib/cctvmaster/types";
import { DEFAULT_SORT, type KitNav, type QueryState, type SidebarNode, type SortKey } from "./types";

export const PAGE_SIZE = 24;

export type SearchParams = Record<string, string | string[] | undefined>;

const collator = new Intl.Collator("en");
const byName = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name);
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Caches a value derived from the catalogue until the snapshot reloads after an admin change. `source` is an array
 * from the current snapshot (getShopProducts(), getCategories()); a reload replaces it, which rebuilds the value.
 */
function perSnapshot<T>() {
  let entry: { source: unknown; value: T } | undefined;
  return (source: unknown, build: () => T): T => {
    if (!entry || entry.source !== source) entry = { source, value: build() };
    return entry.value;
  };
}
const shopCardsCache = perSnapshot<ProductCard[]>();
const newestCache = perSnapshot<Map<string, number>>();
const skuCache = perSnapshot<Map<string, string>>();

/** Listing cards for every non-kit product that has its own page. */
export function getShopCards(): ProductCard[] {
  const products = getShopProducts();
  return shopCardsCache(products, () => products.map((p) => getCard(p.slug)).filter((c): c is ProductCard => !!c));
}

/** Cards for a list of slugs, skipping anything without a product page. */
export const cardsFor = (slugs: string[]) =>
  slugs
    .filter((s) => getProduct(s))
    .map((s) => getCard(s))
    .filter((c): c is ProductCard => !!c);

/** Product slug for a SKU (the compare page is addressed by SKU, as on the source). */
export function slugForSku(sku: string) {
  const products = getShopProducts();
  return skuCache(products, () => new Map(products.map((p) => [p.sku.toLowerCase(), p.slug]))).get(sku.toLowerCase());
}

// ---------- query ----------

export const facetKeys = () => Object.keys(getTaxonomy().facetWords.groups);

export interface ListingQuery {
  page: number;
  sort: SortKey;
  search: string;
  facets: Record<string, string[]>;
}

export function parseListingQuery(sp: SearchParams, defaultSort: SortKey = DEFAULT_SORT): ListingQuery {
  const rawSort = first(sp.sort);
  // "newest" is the old name of "featured"; keep shared links working.
  const sort: SortKey =
    rawSort === "featured" || rawSort === "newest" ? "featured" : rawSort === "name-desc" || rawSort === "name-asc" ? rawSort : defaultSort;
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);
  const search = (first(sp.search) ?? "").trim();
  const facets: Record<string, string[]> = {};
  for (const key of facetKeys()) {
    const raw = sp[key];
    const values = (Array.isArray(raw) ? raw.join(",") : (raw ?? ""))
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (values.length) facets[key] = [...new Set(values)];
  }
  return { page, sort, search, facets };
}

/** The query as flat strings, for links and client components. */
export function queryState(q: ListingQuery, defaultSort: SortKey = DEFAULT_SORT): QueryState {
  const state: QueryState = {};
  if (q.search) state.search = q.search;
  for (const [key, values] of Object.entries(q.facets)) state[key] = values.join(",");
  if (q.sort !== defaultSort) state.sort = q.sort;
  if (q.page > 1) state.page = String(q.page);
  return state;
}

export const hasActiveFilters = (q: ListingQuery) => !!q.search || Object.keys(q.facets).length > 0;

// ---------- sorting ----------

/** Rank of every product in the owner's featured order, merged from the per-category orders. */
function newestRank() {
  return newestCache(getCategories(), () => {
    const rank = new Map<string, number>();
    for (const node of shopTopNodes()) {
      const list = getCategory(node.slug)?.products ?? [];
      list.forEach((slug, i) => {
        const r = i / Math.max(1, list.length);
        if (!rank.has(slug) || r < (rank.get(slug) ?? 1)) rank.set(slug, r);
      });
    }
    return rank;
  });
}

/** Sorts cards; `order` (a category's own product order) is used for "Featured" when given. */
export function sortCards(cards: ProductCard[], sort: SortKey, order?: string[]) {
  if (sort === "featured") {
    const rank = order ? new Map(order.map((s, i) => [s, i])) : newestRank();
    return [...cards].sort((a, b) => (rank.get(a.slug) ?? Infinity) - (rank.get(b.slug) ?? Infinity) || byName(a, b));
  }
  const sorted = [...cards].sort(byName);
  return sort === "name-desc" ? sorted.reverse() : sorted;
}

/** Cards matching a free-text query (every word must match), as the header search does. */
export function searchWithin(cards: ProductCard[], query: string) {
  const hits = new Set(searchProducts(query, { includeKits: false }).map((p) => p.slug));
  return cards.filter((c) => hits.has(c.slug));
}

// ---------- facets ----------

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  active: boolean;
}

export interface FacetGroup {
  key: string;
  label: string;
  options: FacetOption[];
}

const cardFacets = (card: ProductCard) => card.decide?.facets ?? {};

/** Cards that match every active facet group (any value within a group). */
export function applyFacets(cards: ProductCard[], active: Record<string, string[]>) {
  const groups = Object.entries(active).filter(([, v]) => v.length);
  if (!groups.length) return cards;
  return cards.filter((card) => {
    const f = cardFacets(card);
    return groups.every(([key, values]) => values.some((v) => f[key]?.includes(v)));
  });
}

/**
 * The source's "decide" filter rows for a set of cards. Counts in each row take the other rows' choices
 * into account; a row whose only option covers every product is left out.
 */
export function facetGroups(cards: ProductCard[], active: Record<string, string[]>): FacetGroup[] {
  const { groups, options } = getTaxonomy().facetWords;
  const result: FacetGroup[] = [];
  for (const [key, label] of Object.entries(groups)) {
    const base = new Map<string, number>();
    for (const card of cards) for (const v of cardFacets(card)[key] ?? []) base.set(v, (base.get(v) ?? 0) + 1);
    const values = Object.keys(options[key] ?? {}).filter((v) => base.has(v));
    if (!values.length) continue;
    if (values.length === 1 && base.get(values[0]) === cards.length && !active[key]?.length) continue;
    const others = { ...active };
    delete others[key];
    const pool = applyFacets(cards, others);
    result.push({
      key,
      label,
      options: values.map((value) => ({
        value,
        label: options[key][value],
        count: pool.filter((c) => cardFacets(c)[key]?.includes(value)).length,
        active: !!active[key]?.includes(value),
      })),
    });
  }
  return result;
}

// ---------- categories ----------

export const isKitCategory = (cat: Pick<Category, "slug" | "breadcrumbs">) =>
  cat.slug === "cctv-kits" || cat.breadcrumbs.some((b) => b.href === "/categories/cctv-kits");

/** Top-level shop categories (Accessories … Wire & Cable), alphabetical. */
export function shopTopNodes() {
  const cats = new Map(getCategories().map((c) => [c.slug, c]));
  return [...getCategoryTree().values()]
    .filter((n) => {
      const cat = cats.get(n.slug);
      return !n.parent && !!cat && !isKitCategory(cat);
    })
    .sort(byName);
}

/** Number of products a category lists (what its own page shows). */
export const categoryCount = (slug: string) => getCategory(slug)?.products.length ?? 0;

/** The top-level category a category sits under (itself for top-level ones). */
export function topCategoryOf(cat: Category) {
  const trail = cat.breadcrumbs.filter((b) => b.href.startsWith("/categories/"));
  return trail[0] ? { name: trail[0].name, slug: trail[0].href.split("/").pop()! } : undefined;
}

/** Child categories with products, biggest first (as the source's "by type" chips). */
export function childCategories(slug: string) {
  const tree = getCategoryTree();
  return (tree.get(slug)?.children ?? [])
    .map((s) => ({ slug: s, name: tree.get(s)?.name ?? s, href: `/categories/${s}`, count: categoryCount(s) }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || (a.slug < b.slug ? 1 : -1));
}

/** Sidebar category tree for a set of listed products. */
export function buildSidebar(slugs: string[]): SidebarNode[] {
  const set = new Set(slugs);
  const tree = getCategoryTree();
  const build = (slug: string): SidebarNode | null => {
    const node = tree.get(slug);
    const count = getCategory(slug)?.products.filter((s) => set.has(s)).length ?? 0;
    if (!node || !count) return null;
    const children = node.children
      .map(build)
      .filter((c): c is SidebarNode => !!c)
      .sort(byName);
    return { slug, name: node.name, href: node.href, count, children };
  };
  return shopTopNodes()
    .map((n) => build(n.slug))
    .filter((n): n is SidebarNode => !!n);
}

const AXIS_LABELS: Record<string, string> = {
  cameras: "By camera count",
  resolution: "By resolution",
  colour: "By camera colour",
};

/** CCTV Kits block of the sidebar: Turbo HD / IP (PoE) systems with their sub-links. */
export function getKitNav(): KitNav {
  const root = getTaxonomy().kitNav;
  return {
    name: root.name,
    href: root.href,
    count: root.kits,
    systems: (root.children ?? []).map((sys) => {
      const groups: KitNav["systems"][number]["groups"] = [];
      for (const child of sys.children ?? []) {
        const label = AXIS_LABELS[child.axis] ?? child.axis;
        let group = groups.find((g) => g.label === label);
        if (!group) groups.push((group = { label, links: [] }));
        group.links.push({ name: child.name, href: child.href, count: child.kits });
      }
      return { slug: sys.slug, name: sys.name, href: sys.href, count: sys.kits, groups };
    }),
  };
}

// ---------- summaries used by the generated page copy ----------

export function priceRange(cards: ProductCard[]) {
  const prices = cards.map((c) => withVat(c.price)).filter((p) => p > 0);
  if (!prices.length) return undefined;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function topBrands(cards: ProductCard[], limit = 3) {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const brand = getProduct(card.slug)?.brand?.trim();
    if (!brand) continue;
    const key = brand.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const display = new Map<string, string>();
  for (const card of cards) {
    const brand = getProduct(card.slug)?.brand?.trim();
    if (brand && !display.has(brand.toLowerCase())) display.set(brand.toLowerCase(), brand);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => display.get(key) ?? key);
}

/** The most common values of one "decide" chip (e.g. capacity, channels) across cards. */
export function chipValues(cards: ProductCard[], key: string, limit = 4) {
  const counts = new Map<string, number>();
  for (const card of cards)
    for (const chip of card.decide?.chips ?? []) if (chip.key === key) counts.set(chip.value, (counts.get(chip.value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}
