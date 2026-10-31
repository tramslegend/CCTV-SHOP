// Saving a product (create or update) for the back office: zod validation → database checks → writes in one
// transaction → activity log entry with a concise diff → bumpCatalogVersion() so the shop reloads its catalogue.
// Server-only. Used by the product form actions and the spreadsheet import; callers must run requireAdmin("products")
// first and pass the signed-in user. Not a "use server" module, so nothing here can be called from the browser.
import { randomBytes } from "node:crypto";
import type { ClientSession } from "mongodb";
import type { ActionResult, CategoryOption, FieldErrors, SavedProduct } from "@/components/admin/products/types";
import { CI, db, insert, stamp, transaction } from "@/db";
import type { ProductRow } from "@/db/schema";
import { bumpCatalogVersion, logActivity, type requireAdmin } from "@/lib/admin/session";
import { listingCategoryIds } from "@/components/admin/products/category-tree";
import { isKitExpr, loadCategoryOptions } from "./data";
import { fieldErrorsOf, parseStorageToken, type ProductInput, productInputSchema } from "./validation";

export type { ProductRow } from "@/db/schema";
export type Json = Record<string, unknown>;
export type Actor = Awaited<ReturnType<typeof requireAdmin>>["user"];

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** 24-character lowercase id in the same style as the imported catalogue's ids. */
export function newProductId() {
  const bytes = randomBytes(24);
  let out = ID_ALPHABET[bytes[0] % 26];
  for (let i = 1; i < 24; i++) out += ID_ALPHABET[bytes[i] % 36];
  return out;
}

export const fail = (message: string, fieldErrors?: FieldErrors) => ({ ok: false as const, message, fieldErrors });

// ---------- activity-log diffs ----------

const LONG_TEXT = new Set(["description", "shortDescription"]);

/** Arrays are logged in full when short, otherwise as a count. */
function summarise(v: unknown): unknown {
  if (!Array.isArray(v)) return v ?? null;
  const short = v.length <= 12 && v.every((x) => typeof x !== "string" || x.length <= 120);
  return short ? v : `${v.length} items`;
}

function diff(before: Json, after: Json): Json {
  const out: Json = {};
  for (const key of Object.keys(after)) {
    const a = before[key] ?? null;
    const b = after[key] ?? null;
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (LONG_TEXT.has(key)) {
      const len = (x: unknown) => (typeof x === "string" ? x.length : 0);
      out[key] = `edited (${len(a).toLocaleString("en-GB")} → ${len(b).toLocaleString("en-GB")} characters)`;
    } else out[key] = { from: summarise(a), to: summarise(b) };
  }
  return out;
}

interface Children {
  images: string[];
  attributes: string[];
  related: string[];
  categories: string[];
  components: string[];
}

const categoryLabel = (options: CategoryOption[], id: number | null) =>
  id === null ? null : (options.find((o) => o.id === id)?.path.join(" › ") ?? `#${id}`);

/** Flat, comparable view of a product used for activity-log diffs. */
function auditView(p: Omit<ProductRow, "id" | "createdAt" | "updatedAt" | "listing" | "partNumbers">, c: Children, options: CategoryOption[]): Json {
  const kit = (p.kit ?? null) as Json | null;
  const storage = (kit?.storage ?? null) as Json | null;
  return {
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    brand: p.brand,
    status: p.status,
    badge: p.badge,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    costPrice: p.costPrice,
    isContactSales: p.isContactSales,
    isCallForPrice: p.isCallForPrice,
    availability: p.availability,
    trackStock: p.trackStock,
    stock: p.stock,
    weightGrams: p.weightGrams,
    primaryCategory: categoryLabel(options, p.primaryCategoryId),
    categories: c.categories,
    shortDescription: p.shortDescription,
    description: p.description,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    guides: p.guides,
    images: c.images,
    attributes: c.attributes,
    related: c.related,
    ...(kit
      ? {
          systemType: kit.systemType ?? null,
          channelCount: kit.channelCount ?? null,
          cameraCount: kit.cameraCount ?? null,
          resolutionMp: kit.resolutionMp ?? null,
          storage: storage ? `${String(storage.token ?? "")} (${String(storage.capacityTb ?? "?")} TB)` : null,
          components: c.components,
        }
      : {}),
  };
}

const componentLabel = (c: { qty: number; sku: string | null; name: string; role: string }) => `${c.qty}× ${c.sku || c.name} (${c.role})`;

// ---------- create / update ----------

interface SaveContext {
  existing: ProductRow | null;
  options: CategoryOption[];
}

/** Database checks zod can't do: unique slug/SKU and that referenced rows exist. */
async function checkReferences(v: ProductInput, selfId: string | null, ctx: SaveContext, isKit: boolean) {
  const errors: FieldErrors = {};
  const notSelf = selfId ? { _id: { $ne: selfId } } : {};
  const relatedIds = v.related.map((r) => r.id);
  const componentIds = isKit ? v.components.map((c) => c.componentId).filter((x): x is string => !!x) : [];
  const [slugTaken, skuTaken, relatedRows, componentRows, guideRows] = await Promise.all([
    db.products.findOne({ slug: v.slug, ...notSelf }, { projection: { _id: 1 } }),
    // Case-insensitive, like the database's unique SKU index.
    !ctx.existing || ctx.existing.sku.toLowerCase() !== v.sku.toLowerCase()
      ? db.products.findOne({ sku: v.sku, ...notSelf }, { projection: { _id: 1 }, collation: CI })
      : Promise.resolve(null),
    relatedIds.length
      ? db.products.find({ _id: { $in: relatedIds } }).project<{ id: string; sku: string }>({ _id: 0, id: 1, sku: 1 }).toArray()
      : Promise.resolve([]),
    componentIds.length
      ? db.products
          .find({ _id: { $in: componentIds } })
          .project<{ id: string; sku: string; isKit: boolean }>({ _id: 0, id: 1, sku: 1, isKit: isKitExpr })
          .toArray()
      : Promise.resolve([]),
    v.guides.length
      ? db.blogPosts.find({ slug: { $in: v.guides } }).project<{ slug: string }>({ _id: 0, slug: 1 }).toArray()
      : Promise.resolve([]),
  ]);
  if (slugTaken) errors.slug = "Another product already uses this URL slug.";
  if (skuTaken) errors.sku = "Another product already uses this SKU.";

  const categoryIds = new Set(ctx.options.map((o) => o.id));
  if (v.primaryCategoryId !== null && !categoryIds.has(v.primaryCategoryId)) errors.primaryCategoryId = "That category no longer exists.";
  v.extraCategoryIds.forEach((id, i) => {
    if (!categoryIds.has(id)) errors[`extraCategoryIds.${i}`] = "That category no longer exists.";
  });

  const relatedSku = new Map(relatedRows.map((r) => [r.id, r.sku]));
  v.related.forEach((r, i) => {
    if (r.id === selfId) errors[`related.${i}`] = "A product can't be related to itself.";
    else if (!relatedSku.has(r.id)) errors[`related.${i}`] = "This product no longer exists.";
  });

  const components = new Map(componentRows.map((r) => [r.id, r]));
  if (isKit)
    v.components.forEach((c, i) => {
      if (!c.componentId) return;
      const found = components.get(c.componentId);
      if (c.componentId === selfId) errors[`components.${i}.name`] = "A kit can't contain itself.";
      else if (!found) errors[`components.${i}.name`] = "The linked product no longer exists.";
      else if (found.isKit) errors[`components.${i}.name`] = "Pick a single product, not another kit.";
    });

  const guides = new Set(guideRows.map((g) => g.slug));
  v.guides.forEach((slug, i) => {
    if (!guides.has(slug)) errors[`guides.${i}`] = "This guide no longer exists.";
  });
  return { errors, relatedSku, componentSku: new Map(componentRows.map((r) => [r.id, r.sku])) };
}

/** Kit metadata: the edited keys are replaced, every other key (family, siblings, bundleSaving…) is kept as is. */
function buildKitJson(v: ProductInput, previous: Json | null): Json | null {
  if (!v.kit) return null;
  const next: Json = previous ? { ...previous } : { kitClass: "camera-kit", pricingMode: "fixed" };
  next.systemType = v.kit.systemType;
  next.channelCount = v.kit.channelCount;
  next.cameraCount = v.kit.cameraCount;
  if (v.kit.resolutionMp !== null) next.resolutionMp = v.kit.resolutionMp;
  else delete next.resolutionMp;
  const token = v.kit.storageToken;
  const parsed = token ? parseStorageToken(token) : null;
  if (token && parsed) {
    const prev = (previous?.storage ?? {}) as Json;
    next.storage = { ...prev, token, drives: parsed.drives, capacityTb: v.kit.storageCapacityTb ?? parsed.capacityTb };
  } else delete next.storage;
  // The shop reads a kit's stock state from here; keep it in step with the availability field.
  next.stockState = v.availability;
  return next;
}

/** Keeps sibling entries (shown as "how many cameras / storage" pickers on other kits in the family) current. */
async function syncKitFamily(
  session: ClientSession,
  family: string,
  before: { sku: string; slug: string },
  after: { sku: string; slug: string; price: number },
) {
  const kits = await db.products
    .find({ "kit.family": family }, { session })
    .project<{ id: string; kit: Json | null }>({ _id: 0, id: 1, kit: 1 })
    .toArray();
  for (const k of kits) {
    const siblings = (k.kit as Json | null)?.siblings;
    if (!Array.isArray(siblings)) continue;
    let changed = false;
    const next = siblings.map((sib: Json) => {
      if (sib?.sku !== before.sku) return sib;
      changed = true;
      return { ...sib, sku: after.sku, price: after.price, href: `/products/${after.slug}` };
    });
    // Sibling bookkeeping isn't an edit of that kit: keep its updated date (updatedAt is left as it is).
    if (changed) await db.products.updateOne({ _id: k.id }, { $set: { kit: { ...k.kit, siblings: next } } }, { session });
  }
}

/** Positions for newly assigned categories: appended after the products already listed there. */
export async function appendCategories(session: ClientSession, productId: string, categoryIds: number[]) {
  if (!categoryIds.length) return;
  const maxima = await db.productCategories
    .aggregate<{ _id: number; max: number }>(
      [{ $match: { categoryId: { $in: categoryIds } } }, { $group: { _id: "$categoryId", max: { $max: "$position" } } }],
      { session },
    )
    .toArray();
  const max = new Map(maxima.map((m) => [m._id, m.max]));
  // Listings the product already has are left alone (the old ON CONFLICT DO NOTHING).
  const listed = await db.productCategories
    .find({ productId, categoryId: { $in: categoryIds } }, { session })
    .project<{ categoryId: number }>({ _id: 0, categoryId: 1 })
    .toArray();
  const have = new Set(listed.map((l) => l.categoryId));
  const rows = categoryIds
    .filter((categoryId, i) => !have.has(categoryId) && categoryIds.indexOf(categoryId) === i)
    .map((categoryId) => ({ productId, categoryId, position: (max.get(categoryId) ?? -1) + 1 }));
  await insert("productCategories", rows, { session });
}

/** saveProduct's message when an update changes nothing. */
export const NO_CHANGES = "No changes to save.";

export interface SaveOptions {
  /** Category options already loaded by the caller (the import saves many products with the same list). */
  options?: CategoryOption[];
  /** Whether to refresh the shop's catalogue after saving (default true). A batch refreshes once at the end. */
  bump?: boolean;
  /** Where the change came from, recorded on the activity entry of a new product (e.g. "spreadsheet import"). */
  source?: string;
}

export async function saveProduct(user: Actor, id: string | null, raw: unknown, opts: SaveOptions = {}): Promise<ActionResult<SavedProduct>> {
  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) return fail("Some fields need attention. Check the highlighted fields.", fieldErrorsOf(parsed.error));
  const v = parsed.data;

  const existing = id ? await db.products.findOne({ _id: id }) : null;
  if (id && !existing) return fail("This product no longer exists. It may have been deleted by someone else.");
  // A product's type is fixed when it's created.
  const isKit = existing ? existing.kit !== null : v.kit !== null;
  if (isKit && !v.kit) return fail("Kit details are missing.", { form: "Kit details are missing." });

  const options = opts.options ?? (await loadCategoryOptions());
  const ctx: SaveContext = { existing: existing ?? null, options };
  const { errors, relatedSku, componentSku } = await checkReferences(v, id, ctx, isKit);
  if (Object.keys(errors).length) return fail("Some fields need attention. Check the highlighted fields.", errors);

  const productId = id ?? newProductId();
  const attributes = v.attributes
    .filter((a) => a.name || a.value)
    .map((a) => ({ name: a.name, value: a.value, ...(a.type ? { type: a.type } : {}) }));
  const components = isKit
    ? v.components.map((c) => ({ ...c, sku: (c.componentId && componentSku.get(c.componentId)) || c.sku || null }))
    : [];
  const kit = isKit ? buildKitJson(v, (existing?.kit as Json | null) ?? null) : null;
  const row = {
    name: v.name,
    slug: v.slug,
    sku: v.sku,
    brand: v.brand,
    status: v.status,
    badge: v.badge,
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    costPrice: v.costPrice,
    isContactSales: v.isContactSales,
    isCallForPrice: v.isCallForPrice,
    availability: v.availability,
    trackStock: v.trackStock,
    stock: v.stock,
    weightGrams: v.weightGrams,
    primaryCategoryId: v.primaryCategoryId,
    shortDescription: v.shortDescription,
    description: v.description,
    attributes,
    guides: v.guides,
    seoTitle: v.seoTitle,
    seoDescription: v.seoDescription,
    kit,
  };
  const categoryIds = listingCategoryIds(options, v.primaryCategoryId, v.extraCategoryIds);
  const categoryNames = (ids: number[]) =>
    ids
      .map((cid) => options.find((o) => o.id === cid)?.name ?? `#${cid}`)
      .sort((a, b) => a.localeCompare(b));

  // Activity-log view of the product before and after.
  let before: Json = {};
  let currentCategoryIds: number[] = [];
  if (existing) {
    const [images, cats, related, parts] = await Promise.all([
      db.productImages.find({ productId }).sort({ position: 1, _id: 1 }).toArray(),
      db.productCategories.find({ productId }).toArray(),
      // SKUs of the related products in order (links to products that no longer exist are left out).
      db.productRelated
        .aggregate<{ sku: string }>([
          { $match: { productId } },
          { $sort: { position: 1 } },
          {
            $lookup: {
              from: db.products.collectionName,
              localField: "relatedId",
              foreignField: "_id",
              pipeline: [{ $project: { _id: 0, sku: 1 } }],
              as: "product",
            },
          },
          { $unwind: "$product" },
          { $project: { _id: 0, sku: "$product.sku" } },
        ])
        .toArray(),
      db.kitComponents.find({ kitId: productId }).sort({ position: 1, _id: 1 }).toArray(),
    ]);
    currentCategoryIds = cats.map((c) => c.categoryId);
    before = auditView(
      existing,
      {
        images: images.map((i) => (i.alt ? `${i.url} (${i.alt})` : i.url)),
        attributes: existing.attributes.map((a) => `${a.name}: ${a.value}`),
        related: related.map((r) => r.sku),
        categories: categoryNames(currentCategoryIds),
        components: parts.map(componentLabel),
      },
      options,
    );
  }
  const after = auditView(
    row,
    {
      images: v.images.map((i) => (i.alt ? `${i.url} (${i.alt})` : i.url)),
      attributes: attributes.map((a) => `${a.name}: ${a.value}`),
      related: v.related.map((r) => relatedSku.get(r.id) ?? r.id),
      categories: categoryNames(categoryIds),
      components: components.map(componentLabel),
    },
    options,
  );
  const changes = existing ? diff(before, after) : null;
  if (existing && changes && !Object.keys(changes).length) {
    return { ok: true, message: NO_CHANGES, data: { id: productId, slug: existing.slug } };
  }

  await transaction(async (session) => {
    if (existing) await db.products.updateOne({ _id: productId }, { $set: stamp(row) }, { session });
    else await insert("products", { id: productId, ...row }, { session });

    await db.productImages.deleteMany({ productId }, { session });
    if (v.images.length)
      await insert(
        "productImages",
        v.images.map((img, position) => ({ productId, url: img.url, alt: img.alt, position })),
        { session },
      );

    await db.productRelated.deleteMany({ productId }, { session });
    if (v.related.length)
      await insert(
        "productRelated",
        v.related.map((r, position) => ({ productId, relatedId: r.id, position })),
        { session },
      );

    if (isKit) {
      await db.kitComponents.deleteMany({ kitId: productId }, { session });
      if (components.length)
        await insert(
          "kitComponents",
          components.map((c, position) => ({
            kitId: productId,
            componentId: c.componentId,
            name: c.name,
            sku: c.sku,
            role: c.role,
            qty: c.qty,
            imageUrl: c.imageUrl,
            position,
          })),
          { session },
        );
    }

    // Category assignments: keep the listing position of categories that stay, append new ones at the end.
    const wanted = new Set(categoryIds);
    const removed = currentCategoryIds.filter((cid) => !wanted.has(cid));
    if (removed.length) await db.productCategories.deleteMany({ productId, categoryId: { $in: removed } }, { session });
    await appendCategories(
      session,
      productId,
      categoryIds.filter((cid) => !currentCategoryIds.includes(cid)),
    );

    const family = typeof kit?.family === "string" ? kit.family : null;
    if (existing && family && (existing.price !== v.price || existing.sku !== v.sku || existing.slug !== v.slug))
      await syncKitFamily(session, family, existing, { sku: v.sku, slug: v.slug, price: v.price });
  });

  if (existing) await logActivity(user, "product.update", "product", productId, changes ?? {});
  else
    await logActivity(user, "product.create", "product", productId, {
      name: v.name,
      sku: v.sku,
      status: v.status,
      price: v.price,
      type: isKit ? "kit" : "product",
      ...(opts.source ? { source: opts.source } : {}),
    });
  if (opts.bump !== false) await bumpCatalogVersion();
  return {
    ok: true,
    message: existing ? "Product saved." : `${isKit ? "Kit" : "Product"} created.`,
    data: { id: productId, slug: v.slug },
  };
}
