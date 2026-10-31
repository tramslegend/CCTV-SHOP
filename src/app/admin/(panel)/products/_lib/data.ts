// Database reads for the products admin (server only). Queries go straight to the database with filters and limits,
// never through the storefront snapshot, so drafts and archived products are included.
import type { Document, Filter } from "mongodb";
import { z } from "zod";
import {
  AVAILABILITIES,
  type Availability,
  type CategoryOption,
  type ComponentValue,
  type GuideOption,
  KIT_ROLES,
  type KitRole,
  type KitSystem,
  PRODUCT_STATUSES,
  type ProductFormValues,
  type ProductPick,
  type ProductStatus,
} from "@/components/admin/products/types";
import { CI, contains, db, type Doc } from "@/db";
import type { ProductRow } from "@/db/schema";
import { buildCategoryOptions, descendantIds, extraCategoryIds } from "@/components/admin/products/category-tree";

export const PAGE_SIZE = 50;

export type ProductFilter = Filter<Doc<ProductRow>>;

/** All conditions together (`{}` when there are none: an empty $and isn't allowed). */
export const allOf = (conditions: (ProductFilter | undefined)[]): ProductFilter => {
  const list = conditions.filter((c): c is ProductFilter => !!c);
  return list.length ? { $and: list } : {};
};

/** Kits carry kit metadata; single products have none. */
export const isKitExpr = { $ne: [{ $ifNull: ["$kit", null] }, null] };

/** The product's first image (by position, then id): this stage adds `firstImage`, `imageField` reads its URL. */
const firstImageLookup: Document = {
  $lookup: {
    from: db.productImages.collectionName,
    localField: "_id",
    foreignField: "productId",
    pipeline: [{ $sort: { position: 1, _id: 1 } }, { $limit: 1 }, { $project: { _id: 0, url: 1 } }],
    as: "firstImage",
  },
};
const imageField = { $ifNull: [{ $arrayElemAt: ["$firstImage.url", 0] }, null] };

/**
 * Aggregation stages turning product documents into the fields needed to show a product in a picker (ProductPick:
 * id, name, sku, image, price, status, isKit). Put them after the $match / $sort / $limit stages; `extra` adds more
 * stored fields, e.g. { slug: 1 }.
 */
export const pickStages = (extra: Record<string, 1> = {}): Document[] => [
  firstImageLookup,
  { $project: { _id: 0, id: 1, name: 1, sku: 1, image: imageField, price: 1, status: 1, isKit: isKitExpr, ...extra } },
];

export async function loadCategoryOptions(): Promise<CategoryOption[]> {
  const rows = await db.categories
    .find()
    .project<{ id: number; name: string; parentId: number | null; isKitRange: boolean; position: number }>({
      _id: 0,
      id: 1,
      name: 1,
      parentId: 1,
      isKitRange: 1,
      position: 1,
    })
    .toArray();
  return buildCategoryOptions(rows);
}

export async function loadGuideOptions(): Promise<GuideOption[]> {
  return db.blogPosts.find().project<GuideOption>({ _id: 0, slug: 1, title: 1 }).sort({ title: 1 }).toArray();
}

export async function loadBrands(): Promise<string[]> {
  const brands = await db.products.distinct("brand", { brand: { $ne: null } });
  return brands.filter((b): b is string => !!b?.trim()).sort();
}

/** Every word must appear in the name, SKU or brand (ignoring case). */
export function productSearchCondition(q: string): ProductFilter | undefined {
  const words = q.trim().split(/\s+/).filter(Boolean).slice(0, 8);
  if (!words.length) return undefined;
  return { $and: words.map((w) => ({ $or: [{ name: contains(w) }, { sku: contains(w) }, { brand: contains(w) }] })) };
}

// ---------- list ----------

export const SORTS = ["updated", "name", "price", "stock"] as const;
export type ProductSort = (typeof SORTS)[number];
export type ProductTypeFilter = "all" | "products" | "kits";

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

const listParams = z.object({
  q: z.preprocess(first, z.string().trim().max(120).catch("")).default(""),
  type: z.preprocess(first, z.enum(["all", "products", "kits"]).catch("all")).default("all"),
  status: z.preprocess(first, z.enum(["all", ...PRODUCT_STATUSES]).catch("all")).default("all"),
  availability: z.preprocess(first, z.enum(["all", ...AVAILABILITIES]).catch("all")).default("all"),
  category: z.preprocess(first, z.coerce.number().int().positive().nullable().catch(null)).default(null),
  sort: z.preprocess(first, z.enum(SORTS).catch("updated")).default("updated"),
  dir: z.preprocess(first, z.enum(["asc", "desc"]).optional().catch(undefined)),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(10_000).catch(1)).default(1),
});

export interface ProductListFilters {
  q: string;
  type: ProductTypeFilter;
  status: ProductStatus | "all";
  availability: Availability | "all";
  category: number | null;
  sort: ProductSort;
  dir: "asc" | "desc";
  page: number;
}

/** Name sorts A→Z by default; everything else newest/highest first. */
export const defaultDir = (sort: ProductSort): "asc" | "desc" => (sort === "name" ? "asc" : "desc");

export function parseListParams(searchParams: Record<string, string | string[] | undefined>): ProductListFilters {
  const parsed = listParams.parse(searchParams);
  return { ...parsed, dir: parsed.dir ?? defaultDir(parsed.sort) };
}

export interface ProductListRow {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  slug: string;
  status: ProductStatus;
  availability: Availability;
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  trackStock: boolean;
  isContactSales: boolean;
  isCallForPrice: boolean;
  isKit: boolean;
  image: string | null;
  categoryId: number | null;
  updatedAt: string;
}

export async function listProducts(filters: ProductListFilters, categories: CategoryOption[]) {
  const base: (ProductFilter | undefined)[] = [productSearchCondition(filters.q)];
  if (filters.status !== "all") base.push({ status: filters.status });
  if (filters.availability !== "all") base.push({ availability: filters.availability });
  if (filters.category !== null) {
    const ids = descendantIds(categories, filters.category);
    const listed = await db.productCategories.distinct("productId", { categoryId: { $in: ids } });
    base.push({ $or: [{ primaryCategoryId: { $in: ids } }, { _id: { $in: listed } }] });
  }
  const typeCond: ProductFilter | undefined = filters.type === "kits" ? { kit: { $ne: null } } : filters.type === "products" ? { kit: null } : undefined;
  const where = allOf([...base, typeCond]);

  const dir = filters.dir === "asc" ? 1 : -1;
  const order: Document = {
    updated: { updatedAt: dir },
    // Case-insensitive (the old lower(name)): the query runs with the CI collation.
    name: { name: dir },
    price: { price: dir },
    // Products without a stock figure come last either way (Postgres "nulls last"); then by availability, which
    // Postgres sorted in the enum's order (in stock, backorder, out of stock, discontinued).
    stock: { noStock: 1, stock: dir, availabilityRank: -dir },
  }[filters.sort];

  const [rows, [totals]] = await Promise.all([
    db.products
      .aggregate<Omit<ProductListRow, "updatedAt"> & { updatedAt: Date }>(
        [
          { $match: where },
          ...(filters.sort === "stock"
            ? [
                {
                  $addFields: {
                    noStock: { $eq: [{ $ifNull: ["$stock", null] }, null] },
                    availabilityRank: { $indexOfArray: [[...AVAILABILITIES], "$availability"] },
                  },
                },
              ]
            : []),
          { $sort: { ...order, _id: 1 } },
          { $skip: (filters.page - 1) * PAGE_SIZE },
          { $limit: PAGE_SIZE },
          firstImageLookup,
          {
            $project: {
              _id: 0,
              id: 1,
              name: 1,
              sku: 1,
              brand: 1,
              slug: 1,
              status: 1,
              availability: 1,
              price: 1,
              compareAtPrice: 1,
              stock: 1,
              trackStock: 1,
              isContactSales: 1,
              isCallForPrice: 1,
              isKit: isKitExpr,
              image: imageField,
              categoryId: "$primaryCategoryId",
              updatedAt: 1,
            },
          },
        ],
        filters.sort === "name" ? { collation: CI } : {},
      )
      .toArray(),
    db.products
      .aggregate<{ all: number; kits: number }>([
        { $match: allOf(base) },
        { $group: { _id: null, all: { $sum: 1 }, kits: { $sum: { $cond: [isKitExpr, 1, 0] } } } },
      ])
      .toArray(),
  ]);

  const { all, kits } = totals ?? { all: 0, kits: 0 };
  const counts = { all, kits, products: all - kits };
  const total = counts[filters.type];
  const list: ProductListRow[] = rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
  return { rows: list, total, counts };
}

// ---------- form ----------

export const emptyFormValues = (isKit: boolean): ProductFormValues => ({
  name: "",
  slug: "",
  sku: "",
  brand: "",
  status: "draft",
  badge: "",
  price: "",
  compareAtPrice: "",
  costPrice: "",
  isContactSales: false,
  isCallForPrice: false,
  availability: "in_stock",
  trackStock: false,
  stock: "",
  weightGrams: "",
  primaryCategoryId: null,
  extraCategoryIds: [],
  images: [],
  shortDescription: "",
  description: "",
  attributes: [],
  related: [],
  guides: [],
  seoTitle: "",
  seoDescription: "",
  kit: isKit
    ? { systemType: "IP", channelCount: "4", cameraCount: "4", resolutionMp: "", storageToken: "1TB", storageCapacityTb: "1" }
    : null,
  components: [],
});

const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const money = (v: number | null | undefined) => (v === null || v === undefined ? "" : v.toFixed(2));
const asRole = (role: string): KitRole => ((KIT_ROLES as readonly string[]).includes(role) ? (role as KitRole) : "other");

export interface ProductMeta {
  id: string;
  slug: string;
  status: ProductStatus;
  isKit: boolean;
  createdAt: string;
  updatedAt: string;
  orderCount: number;
  usedInKits: number;
}

/** A product as form values, plus facts shown around the form; null when the id doesn't exist. */
export async function loadProductForm(id: string, categories: CategoryOption[]) {
  const product = await db.products.findOne({ _id: id });
  if (!product) return null;
  // Related products in their order (links to products that no longer exist are dropped).
  const loadRelated = async () => {
    const links = await db.productRelated.find({ productId: id }).sort({ position: 1 }).toArray();
    if (!links.length) return [];
    const picks = await db.products.aggregate<ProductPick>([{ $match: { _id: { $in: links.map((l) => l.relatedId) } } }, ...pickStages()]).toArray();
    const byId = new Map(picks.map((p) => [p.id, p]));
    return links.map((l) => byId.get(l.relatedId)).filter((p): p is ProductPick => !!p);
  };
  // Kit parts with the linked product's price (null when the part isn't linked or the product is gone).
  const loadParts = async () => {
    const list = await db.kitComponents.find({ kitId: id }).sort({ position: 1, _id: 1 }).toArray();
    const linked = [...new Set(list.map((c) => c.componentId).filter((x): x is string => !!x))];
    const prices = linked.length
      ? await db.products.find({ _id: { $in: linked } }).project<{ id: string; price: number }>({ _id: 0, id: 1, price: 1 }).toArray()
      : [];
    const priceOf = new Map(prices.map((p) => [p.id, p.price]));
    return list.map((part) => ({ part, price: part.componentId === null ? null : (priceOf.get(part.componentId) ?? null) }));
  };
  const [images, cats, related, parts, orderCount, kitIds] = await Promise.all([
    db.productImages.find({ productId: id }).sort({ position: 1, _id: 1 }).toArray(),
    db.productCategories.find({ productId: id }).toArray(),
    loadRelated(),
    loadParts(),
    db.orderItems.countDocuments({ productId: id }),
    db.kitComponents.distinct("kitId", { componentId: id }),
  ]);

  const kit = product.kit as Record<string, unknown> | null;
  const storage = (kit?.storage ?? null) as { token?: string; capacityTb?: number } | null;
  const values: ProductFormValues = {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    brand: product.brand ?? "",
    status: product.status,
    badge: product.badge ?? "",
    price: money(product.price),
    compareAtPrice: money(product.compareAtPrice),
    costPrice: money(product.costPrice),
    isContactSales: product.isContactSales,
    isCallForPrice: product.isCallForPrice,
    availability: product.availability,
    trackStock: product.trackStock,
    stock: str(product.stock),
    weightGrams: str(product.weightGrams),
    primaryCategoryId: product.primaryCategoryId,
    extraCategoryIds: extraCategoryIds(
      categories,
      product.primaryCategoryId,
      cats.map((c) => c.categoryId),
    ),
    images: images.map((i) => ({ key: `img-${i.id}`, url: i.url, alt: i.alt ?? "" })),
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    attributes: product.attributes.map((a, i) => {
      const { type } = a as { type?: unknown };
      return { key: `attr-${i}`, name: a.name, value: a.value, ...(typeof type === "string" ? { type } : {}) };
    }),
    related: related.map((r): ProductPick => ({ ...r, isKit: !!r.isKit })),
    guides: product.guides,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    kit: kit
      ? {
          systemType: (kit.systemType === "ANALOG" ? "ANALOG" : "IP") as KitSystem,
          channelCount: str(typeof kit.channelCount === "number" ? kit.channelCount : null),
          cameraCount: str(typeof kit.cameraCount === "number" ? kit.cameraCount : null),
          resolutionMp: str(typeof kit.resolutionMp === "number" ? kit.resolutionMp : null),
          storageToken: storage?.token ?? "",
          storageCapacityTb: str(storage?.capacityTb ?? null),
        }
      : null,
    components: parts.map(
      ({ part, price }): ComponentValue => ({
        key: `part-${part.id}`,
        componentId: part.componentId,
        name: part.name,
        sku: part.sku ?? "",
        role: asRole(part.role),
        qty: String(part.qty),
        imageUrl: part.imageUrl,
        price: price ?? null,
      }),
    ),
  };
  const meta: ProductMeta = {
    id: product.id,
    slug: product.slug,
    status: product.status,
    isKit: !!kit,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    orderCount,
    usedInKits: kitIds.length,
  };
  return { values, meta };
}
