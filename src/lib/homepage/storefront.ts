// Homepage data for the storefront: the "homepage" setting from the catalogue snapshot, resolved against the catalogue
// (category tiles, popular products, featured kit, latest posts). Server-only: call after `await ensureCatalog()`.
import { cache } from "react";
import { db } from "@/db";
import {
  getAllProducts,
  getBlogOrder,
  getBlogPosts,
  getCard,
  getCategory,
  getCategoryTree,
  getProduct,
  getSetting,
  getTopCategories,
} from "@/lib/cctvmaster/catalog";
import { withVat } from "@/lib/cctvmaster/money";
import type { BlogPost, Product, ProductCard } from "@/lib/cctvmaster/types";
import { HOMEPAGE_KEY, type HomepageSettings, parseHomepage } from "./schema";

export const homepageSetting = (): HomepageSettings => parseHomepage(getSetting(HOMEPAGE_KEY));

const idIndexes = new WeakMap<Product[], Map<string, Product>>();

/** Active product by id (the setting stores ids, which survive slug changes). */
export function productById(id: string): Product | undefined {
  const all = getAllProducts();
  let index = idIndexes.get(all);
  if (!index) {
    index = new Map(all.map((p) => [p.id, p]));
    idIndexes.set(all, index);
  }
  return index.get(id);
}

// ---------- shop by category ----------

export interface CategoryTile {
  slug: string;
  name: string;
  href: string;
  /** Empty when neither the tile nor the category has a picture (a neutral placeholder is shown). */
  image: string;
}

export function categoryTiles(section: HomepageSettings["categories"]): CategoryTile[] {
  const tree = getCategoryTree();
  const slugs = section.mode === "pick" ? section.picks : getTopCategories().map((n) => n.slug);
  return slugs
    .map((slug) => tree.get(slug))
    .filter((n) => !!n)
    .map((n) => ({ slug: n.slug, name: n.name, href: n.href, image: section.images[n.slug] || getCategory(n.slug)?.imageUrl || "" }));
}

// ---------- popular products ----------

/** Orders that were paid for (refunded and cancelled ones don't count). */
const PAID_STATUSES = ["paid", "processing", "dispatched", "delivered"] as const;

/** Product ids by units sold in paid orders over the last 12 months, best first. */
export const topSellingIds = cache(async (limit: number): Promise<string[]> => {
  try {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    const rows = await db.orders
      .aggregate<{ _id: string | null; units: number }>([
        // Paid orders from the last 12 months, dated by payment (or by order date when there's no payment date).
        {
          $match: {
            status: { $in: [...PAID_STATUSES] },
            $or: [{ paidAt: { $gte: since } }, { paidAt: null, createdAt: { $gte: since } }],
          },
        },
        { $lookup: { from: db.orderItems.collectionName, localField: "_id", foreignField: "orderId", as: "item" } },
        { $unwind: "$item" },
        { $match: { "item.productId": { $ne: null } } },
        { $group: { _id: "$item.productId", units: { $sum: "$item.qty" } } },
        { $sort: { units: -1 } },
        { $limit: limit },
      ])
      .toArray();
    return rows.map((r) => r._id).filter((id): id is string => !!id);
  } catch (error) {
    console.error("Popular products: couldn't read order history.", error);
    return [];
  }
});

/** First products of each top-level category in turn (the fallback when there aren't enough sales yet). */
function categoryFill(): string[] {
  const lists = getTopCategories().map((n) => getCategory(n.slug)?.products ?? []);
  const out: string[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

export async function popularCards(section: HomepageSettings["popular"]): Promise<ProductCard[]> {
  const fromIds = (ids: string[]) => ids.map((id) => productById(id)?.slug).filter((slug): slug is string => !!slug);
  const slugs =
    section.mode === "pick" ? fromIds(section.picks) : [...fromIds(await topSellingIds(section.count * 3)), ...categoryFill()];
  // Hand-picked: every pick that is live, in order. Automatic: `count` products.
  const limit = section.mode === "pick" ? section.picks.length : section.count;
  const seen = new Set<string>();
  const cards: ProductCard[] = [];
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const card = getCard(slug);
    if (card) cards.push(card);
    if (cards.length >= limit) break;
  }
  return cards;
}

// ---------- featured kit ----------

export interface FeaturedKit {
  slug: string;
  name: string;
  image?: string;
  /** Inc VAT. */
  price: number;
  /** Parts shown in the card (cameras, recorder and drive first); unit prices inc VAT. */
  parts: { name: string; sku: string; qty: number; image?: string; price?: number }[];
}

const ROLE_ORDER = ["camera", "recorder", "storage"];

export function featuredKit(productId: string): FeaturedKit | null {
  const kit = productId ? productById(productId) : undefined;
  if (!kit?.kit) return null;
  const parts = [...kit.kit.components]
    .map((c, i) => ({ c, i, rank: ROLE_ORDER.includes(c.role) ? ROLE_ORDER.indexOf(c.role) : ROLE_ORDER.length }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .slice(0, 3)
    .map(({ c }) => {
      const part = c.href ? getProduct(c.href.split("/").pop() ?? "") : undefined;
      return {
        name: c.name,
        sku: c.sku,
        qty: c.qty,
        image: c.image || part?.images?.[0],
        price: part && !part.isCallForPrice ? withVat(part.price) : undefined,
      };
    });
  return { slug: kit.slug, name: kit.name, image: kit.images?.[0], price: withVat(kit.price), parts };
}

// ---------- latest articles ----------

/** Newest posts listed on /blog (posts published the same day keep their blog order). */
export function latestPosts(count: number): BlogPost[] {
  const order = new Map(getBlogOrder().map((slug, i) => [slug, i]));
  return getBlogPosts()
    .filter((p) => order.has(p.slug))
    .sort((a, b) => (b.datePublished ?? "").localeCompare(a.datePublished ?? "") || order.get(a.slug)! - order.get(b.slug)!)
    .slice(0, count);
}
