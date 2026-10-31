// Back-office reads for /admin/content/homepage (server only): the stored settings, the categories that can be shown
// and the products the settings point at (any status, so the owner sees when a pick isn't live).
import type { Document } from "mongodb";
import { db } from "@/db";
import { ensureCatalog, getCategory, getCategoryTree, getTopCategories } from "@/lib/cctvmaster/catalog";
import { readRawSettings } from "@/lib/settings/server";
import { HOMEPAGE_KEY, type HomepageSettings, parseHomepage } from "./schema";

export interface PickedProduct {
  id: string;
  name: string;
  sku: string;
  slug: string;
  image: string | null;
  /** Ex VAT. */
  price: number;
  status: "draft" | "active" | "archived";
  isKit: boolean;
}

export interface CategoryChoice {
  slug: string;
  name: string;
  /** "Cameras › IP" */
  path: string;
  image: string;
  /** Shown by the automatic mode (top-level, not a kit range). */
  top: boolean;
}

export async function readHomepage(): Promise<HomepageSettings> {
  const raw = await readRawSettings([HOMEPAGE_KEY]);
  return parseHomepage(raw.get(HOMEPAGE_KEY));
}

/** Aggregation stages turning product documents into PickedProduct rows (first image by position, kit flag). */
export const pickedStages: Document[] = [
  {
    $lookup: {
      from: db.productImages.collectionName,
      localField: "_id",
      foreignField: "productId",
      pipeline: [{ $sort: { position: 1, _id: 1 } }, { $limit: 1 }, { $project: { _id: 0, url: 1 } }],
      as: "firstImage",
    },
  },
  {
    $project: {
      _id: 0,
      id: "$_id",
      name: 1,
      sku: 1,
      slug: 1,
      image: { $ifNull: [{ $arrayElemAt: ["$firstImage.url", 0] }, null] },
      price: 1,
      status: 1,
      isKit: { $ne: [{ $ifNull: ["$kit", null] }, null] },
    },
  },
];

export async function productsByIds(ids: string[]): Promise<PickedProduct[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  const rows = await db.products.aggregate<PickedProduct>([{ $match: { _id: { $in: unique } } }, ...pickedStages]).toArray();
  return rows.map((r) => ({ ...r, isKit: !!r.isKit }));
}

/** Visible categories in admin order (tree order), for the category picker. */
export async function categoryChoices(): Promise<CategoryChoice[]> {
  await ensureCatalog();
  const tree = getCategoryTree();
  const top = new Set(getTopCategories().map((n) => n.slug));
  const out: CategoryChoice[] = [];
  const walk = (slug: string, trail: string[]) => {
    const node = tree.get(slug);
    if (!node) return;
    const path = [...trail, node.name];
    out.push({ slug, name: node.name, path: path.join(" › "), image: getCategory(slug)?.imageUrl ?? "", top: top.has(slug) });
    for (const child of node.children) walk(child, path);
  };
  for (const node of tree.values()) if (!node.parent) walk(node.slug, []);
  return out;
}
