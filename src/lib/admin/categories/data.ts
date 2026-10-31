// Database reads for the categories admin (server only). Category rows come straight from the database, so hidden
// categories are included; kit counts use the storefront's kit summaries, i.e. the kits customers can see.
import type { ClientSession } from "mongodb";
import { pickStages } from "@/app/admin/(panel)/products/_lib/data";
import { formatDateTime } from "@/app/admin/(panel)/products/_lib/format";
import { ancestorIds, buildCategoryOptions, descendantIds, extraCategoryIds, listingCategoryIds } from "@/components/admin/products/category-tree";
import type { ProductPick } from "@/components/admin/products/types";
import { builtInKitFilter, getKitSummaries, storedKitFilter } from "@/components/sites/cctvmaster/kits/kit-data";
import { type KitFilters, matches } from "@/components/sites/cctvmaster/kits/kit-model";
import { db } from "@/db";
import type { CategoryRow } from "@/db/schema";
import { ensureCatalog, getProduct } from "@/lib/cctvmaster/catalog";
import { describeRule, type KitFacts, ruleFromFilters } from "./kit-rule";
import type { CategoryFormValues, CategoryMeta, CategoryOption, CategoryProductRow, CategoryTreeRow, MatchingKit } from "./types";

export type { CategoryRow } from "@/db/schema";

export const loadCategoryRows = (): Promise<CategoryRow[]> => db.categories.find({}, { projection: { _id: 0 } }).toArray();

/** The rule a kit range applies in the shop: the one set in the admin, otherwise the built-in rule for its slug. */
export const effectiveKitFilter = (row: Pick<CategoryRow, "slug" | "kitFilter">): KitFilters =>
  row.kitFilter ? storedKitFilter(row.kitFilter) : (builtInKitFilter(row.slug) ?? {});

/** Whether the category or one of its parents is hidden (the shop then hides it). */
function hiddenInShop(byId: Map<number, CategoryRow>, row: CategoryRow) {
  const seen = new Set<number>();
  for (let c: CategoryRow | undefined = row; c && !seen.has(c.id); c = c.parentId ? byId.get(c.parentId) : undefined) {
    if (!c.visible) return true;
    seen.add(c.id);
  }
  return false;
}

/** Shop address of a category when customers can see it. */
export function shopHref(rows: CategoryRow[], row: CategoryRow) {
  return hiddenInShop(new Map(rows.map((r) => [r.id, r])), row) ? null : `/categories/${row.slug}`;
}

/** Siblings in display order (the order buildCategoryOptions uses). Kit ranges and shop categories are kept apart. */
export function siblingsOf(rows: CategoryRow[], parentId: number | null, isKitRange: boolean) {
  return rows
    .filter((r) => r.parentId === parentId && r.isKitRange === isKitRange)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

/** Both trees for the list page, with counts. */
export async function loadCategoryTree(rows: CategoryRow[]): Promise<{ shop: CategoryTreeRow[]; kits: CategoryTreeRow[] }> {
  const options = buildCategoryOptions(rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const [listings, statuses] = await Promise.all([
    db.productCategories.find().project<{ categoryId: number; productId: string }>({ _id: 0, categoryId: 1, productId: 1 }).toArray(),
    db.products.find().project<{ id: string; status: string }>({ _id: 0, id: 1, status: 1 }).toArray(),
    ensureCatalog(),
  ]);
  // Listings of products that exist, with whether the product is active.
  const statusOf = new Map(statuses.map((p) => [p.id, p.status]));
  const links = listings.flatMap((l) => {
    const status = statusOf.get(l.productId);
    return status === undefined ? [] : [{ ...l, active: status === "active" }];
  });
  const productsIn = new Map<number, Map<string, boolean>>();
  for (const l of links) {
    const m = productsIn.get(l.categoryId) ?? new Map<string, boolean>();
    m.set(l.productId, !!l.active);
    productsIn.set(l.categoryId, m);
  }
  const kits = getKitSummaries();

  const rowsOut = options.map((o): CategoryTreeRow => {
    const row = byId.get(o.id)!;
    const siblings = siblingsOf(rows, row.parentId, row.isKitRange);
    const index = siblings.findIndex((x) => x.id === row.id);
    const base = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId,
      depth: o.path.length - 1,
      isKitRange: row.isKitRange,
      visible: row.visible,
      hiddenByParent: row.visible && hiddenInShop(byId, row),
      childCount: rows.filter((r) => r.parentId === row.id).length,
      isFirst: index <= 0,
      isLast: index === siblings.length - 1,
    };
    if (row.isKitRange) {
      const filter = effectiveKitFilter(row);
      const n = kits.filter((k) => matches(k, filter)).length;
      return { ...base, count: n, liveCount: n, rule: describeRule(ruleFromFilters(filter)), customRule: row.kitFilter !== null };
    }
    const all = new Map<string, boolean>();
    for (const id of descendantIds(options, row.id)) for (const [pid, active] of productsIn.get(id) ?? []) all.set(pid, active);
    return { ...base, count: all.size, liveCount: [...all.values()].filter(Boolean).length };
  });
  return { shop: rowsOut.filter((r) => !r.isKitRange), kits: rowsOut.filter((r) => r.isKitRange) };
}

/** A category as form values plus the facts shown around the form; null when the id doesn't exist. */
export async function loadCategoryForm(rows: CategoryRow[], id: number): Promise<{ values: CategoryFormValues; meta: CategoryMeta } | null> {
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  const [primaryCount, linkCount] = await Promise.all([
    db.products.countDocuments({ primaryCategoryId: id }),
    db.productCategories.countDocuments({ categoryId: id }),
  ]);
  const values: CategoryFormValues = {
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    title: row.title ?? "",
    metaDescription: row.metaDescription ?? "",
    description: row.description ?? "",
    imageUrl: row.imageUrl,
    visible: row.visible,
    isKitRange: row.isKitRange,
    kitRule: row.isKitRange ? ruleFromFilters(effectiveKitFilter(row)) : null,
  };
  const meta: CategoryMeta = {
    id: row.id,
    slug: row.slug,
    shopHref: shopHref(rows, row),
    childCount: rows.filter((r) => r.parentId === row.id).length,
    primaryCount,
    linkCount,
    createdLabel: formatDateTime(row.createdAt),
    updatedLabel: formatDateTime(row.updatedAt),
    builtInRule: row.isKitRange ? ruleFromFilters(builtInKitFilter(row.slug) ?? {}) : null,
  };
  return { values, meta };
}

/**
 * Why a product can't be taken out of a category, following the products module's rule (category-tree.ts): a
 * product is listed in its main category and every category's parents. "main" = this is its main category, "sub" =
 * it's listed in a category below this one; null = it can be removed.
 */
export function removalLock(options: CategoryOption[], categoryId: number, primaryId: number | null, storedIds: number[]): CategoryProductRow["lock"] {
  if (primaryId === categoryId) return "main";
  const extras = extraCategoryIds(options, primaryId, storedIds).filter((id) => id !== categoryId);
  return listingCategoryIds(options, primaryId, extras).includes(categoryId) ? "sub" : null;
}

/**
 * Parent categories a product is listed in only because it's in `categoryId` (the inverse of "a product is listed in
 * the parents of its categories"); they go when it leaves the category. Other listings are never touched.
 */
export function parentsOnlyThrough(options: CategoryOption[], categoryId: number, primaryId: number | null, storedIds: number[]): number[] {
  const parents = new Set(ancestorIds(options, categoryId));
  const extras = extraCategoryIds(options, primaryId, storedIds).filter((id) => id !== categoryId);
  const wanted = new Set(listingCategoryIds(options, primaryId, extras));
  return storedIds.filter((id) => parents.has(id) && !wanted.has(id));
}

/** Stored category ids per product (pass `session` inside a transaction). */
export async function categoryIdsByProduct(productIds: string[], session?: ClientSession) {
  const out = new Map<string, number[]>();
  for (let i = 0; i < productIds.length; i += 1000) {
    const chunk = productIds.slice(i, i + 1000);
    const links = await db.productCategories
      .find({ productId: { $in: chunk } }, { session })
      .project<{ productId: string; categoryId: number }>({ _id: 0, productId: 1, categoryId: 1 })
      .toArray();
    for (const l of links) out.set(l.productId, [...(out.get(l.productId) ?? []), l.categoryId]);
  }
  return out;
}

/** Products a shop category lists, in display order. */
export async function loadCategoryProducts(rows: CategoryRow[], id: number): Promise<CategoryProductRow[]> {
  const listed = await db.productCategories
    .aggregate<ProductPick & { primaryCategoryId: number | null }>([
      { $match: { categoryId: id } },
      { $sort: { position: 1, productId: 1 } },
      // Listings of products that no longer exist are left out.
      {
        $lookup: {
          from: db.products.collectionName,
          localField: "productId",
          foreignField: "_id",
          pipeline: [{ $project: { id: 1, name: 1, sku: 1, price: 1, status: 1, kit: 1, primaryCategoryId: 1 } }],
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $replaceWith: "$product" },
      ...pickStages({ primaryCategoryId: 1 }),
    ])
    .toArray();
  const options = buildCategoryOptions(rows);
  const stored = await categoryIdsByProduct(listed.map((p) => p.id));
  return listed.map(({ primaryCategoryId, ...p }) => ({
    ...p,
    isKit: !!p.isKit,
    lock: removalLock(options, id, primaryCategoryId, stored.get(p.id) ?? []),
  }));
}

/** Every kit in the shop as [system, cameras, resolution, colour], for the rule editor's live count. */
export async function loadKitFacts(): Promise<KitFacts[]> {
  await ensureCatalog();
  return getKitSummaries().map((k) => [k.system, k.cameraCount, k.res ?? 0, k.colour ?? ""]);
}

/** Kits a kit range lists with its saved rule, in the shop's recommended order. */
export async function loadMatchingKits(row: CategoryRow, limit = 20): Promise<{ total: number; kits: MatchingKit[] }> {
  await ensureCatalog();
  const filter = effectiveKitFilter(row);
  const list = getKitSummaries().filter((k) => matches(k, filter));
  return {
    total: list.length,
    kits: list.slice(0, limit).map((k) => ({
      id: getProduct(k.slug)?.id ?? "",
      slug: k.slug,
      name: k.name,
      sku: k.sku,
      image: k.image ?? null,
      price: k.price,
      inStock: k.inStock,
    })),
  };
}
