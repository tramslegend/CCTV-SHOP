// Server-side catalogue for the storefront. Data lives in Postgres; this module keeps an in-memory snapshot of it
// (see catalog-snapshot.ts) so pages and helpers can read it synchronously.
//
// Every server entry point (page, layout, generateMetadata, route handler) must `await ensureCatalog()` before
// calling the getters below. It costs one tiny version query per request and reloads the snapshot only after an
// admin change. Import only from server code — never from client components.
import { cache } from "react";
import { type BlogExtras, buildSnapshot, readCatalogVersion, type Snapshot } from "./catalog-snapshot";
import { formatGBP, withVat } from "./money";
import type { BlogPost, Category, CategoryNode, Product, ProductCard, SearchSuggestions, Taxonomy } from "./types";

export type { BlogExtras };

let snapshot: Snapshot | null = null;
let loading: Promise<Snapshot> | null = null;
let derived = new Map<string, unknown>();

/** Loads the catalogue (or confirms it is current). Deduplicated per request. */
export const ensureCatalog = cache(async (): Promise<void> => {
  const version = await readCatalogVersion();
  if (snapshot?.version === version) return;
  loading ??= buildSnapshot(version).finally(() => {
    loading = null;
  });
  const next = await loading;
  if (snapshot?.version !== next.version) {
    snapshot = next;
    derived = new Map();
  }
});

function snap(): Snapshot {
  if (!snapshot) throw new Error("Catalogue not loaded: call `await ensureCatalog()` in this page or route first.");
  return snapshot;
}

/** Caches a value derived from the current snapshot until the next reload. */
function memo<T>(key: string, build: () => T): T {
  if (!derived.has(key)) derived.set(key, build());
  return derived.get(key) as T;
}

// ---------- settings ----------

export const getSetting = <T>(key: string): T | undefined => snap().settings.get(key) as T | undefined;

// ---------- products ----------

export const getAllProducts = (): Product[] => snap().products;

export const getProduct = (slug: string) => snap().productIndex.get(slug);

/** Products that are not ready-made kits (the /products catalogue). */
export const getShopProducts = () => memo("shopProducts", () => getAllProducts().filter((p) => !p.kit));

/** Ready-made CCTV kits. */
export const getKits = () => memo("kits", () => getAllProducts().filter((p) => p.kit));

/** First image of a product, or undefined. */
export const productImage = (p: Pick<Product, "images">) => p.images?.[0];

/** Listing card for a product slug. */
export const getCard = (slug: string): ProductCard | undefined => snap().cards.get(slug);

export const getCards = (slugs: string[]) => slugs.map(getCard).filter((c): c is ProductCard => !!c);

// ---------- categories ----------

export const getCategories = (): Category[] => snap().categories;

export const getCategory = (slug: string) => memo("categoryIndex", () => new Map(getCategories().map((c) => [c.slug, c]))).get(slug);

export const getTaxonomy = (): Taxonomy => snap().taxonomy;

/** Category hierarchy (from each category's breadcrumbs), keyed by slug. */
export const getCategoryTree = () =>
  memo("categoryTree", () => {
    const nodes = new Map<string, CategoryNode>();
    for (const c of getCategories()) {
      const trail = c.breadcrumbs.filter((b) => b.href.startsWith("/categories/"));
      nodes.set(c.slug, {
        slug: c.slug,
        name: trail.at(-1)?.name ?? c.slug,
        href: `/categories/${c.slug}`,
        parent: trail.at(-2)?.href.split("/").pop(),
        children: [],
        count: c.products.length || c.total,
      });
    }
    for (const node of nodes.values()) if (node.parent) nodes.get(node.parent)?.children.push(node.slug);
    return nodes;
  });

export const categoryName = (slug: string) => getCategoryTree().get(slug)?.name ?? slug;

/** Top-level shop categories in display order (excludes kits). */
export const getTopCategories = () =>
  memo("topCategories", () => {
    const tree = getCategoryTree();
    return getTaxonomy()
      .categoryTree.map((c) => tree.get(c.slug))
      .filter((n): n is CategoryNode => !!n);
  });

// ---------- blog ----------

/** Published posts, newest first. */
export const getBlogPosts = (): BlogPost[] => snap().posts;

export const getBlogPost = (slug: string) => memo("blogIndex", () => new Map(getBlogPosts().map((p) => [p.slug, p]))).get(slug);

/** Outline, section summaries, FAQ, tags, sources and related links for a post. */
export const getBlogExtras = (slug: string): BlogExtras | undefined => snap().blogExtras.get(slug);

/** Article body written in the admin (markdown), or undefined when the post shows its outline. */
export const getBlogBody = (slug: string): string | undefined => snap().blogBodies.get(slug);

/** Slugs listed on /blog, in display order (unlisted posts are still reachable by URL). */
export const getBlogOrder = (): string[] => snap().blogOrder;

// ---------- search ----------

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const searchIndex = () =>
  memo("searchIndex", () =>
    getAllProducts().map((p) => ({
      product: p,
      name: normalise(p.name),
      text: normalise([p.name, p.sku, p.brand, p.category, ...(p.categoryPath ?? []).map((c) => c.name)].join(" ")),
    })),
  );

/** Products matching every word of the query, best matches first. */
export function searchProducts(query: string, { includeKits = true } = {}): Product[] {
  const words = normalise(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  const phrase = words.join(" ");
  return searchIndex()
    .filter((e) => (includeKits || !e.product.kit) && words.every((w) => e.text.includes(w)))
    .map((e) => ({
      product: e.product,
      score:
        (e.name.startsWith(phrase) ? 4 : 0) +
        (e.name.includes(phrase) ? 2 : 0) +
        words.filter((w) => e.name.includes(w)).length +
        (e.product.kit ? 0 : 1),
    }))
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .map((e) => e.product);
}

export function searchSuggestions(query: string): SearchSuggestions {
  const q = normalise(query);
  const categories = q
    ? [...getCategoryTree().values()]
        .filter((c) => normalise(c.name).includes(q) && c.count > 0)
        .slice(0, 4)
        .map((c) => ({ name: c.name, href: c.href }))
    : [];
  const products = searchProducts(query)
    .slice(0, 5)
    .map((p) => ({ name: p.name, href: `/products/${p.slug}`, image: p.images?.[0], price: formatGBP(withVat(p.price)) }));
  return { categories, products };
}
