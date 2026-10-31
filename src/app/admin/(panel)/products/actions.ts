"use server";

// Product mutations for the back office. Every action: requireAdmin("products") → zod validation → database writes in
// one transaction → activity log entry with a concise diff → bumpCatalogVersion() so the shop reloads its catalogue.
// Creating and updating go through saveProduct (./_lib/save.ts), which the spreadsheet import uses too.
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AVAILABILITIES,
  type ActionResult,
  type Availability,
  PRODUCT_STATUSES,
  type ProductFormValues,
  type ProductStatus,
  type SavedProduct,
} from "@/components/admin/products/types";
import { db, escapeRegex, insert, removeProducts, stamp, stripId, transaction } from "@/db";
import { bumpCatalogVersion, logActivity, requireAdmin } from "@/lib/admin/session";
import { appendCategories, fail, type Json, newProductId, type ProductRow, saveProduct } from "./_lib/save";

const idSchema = z.string().trim().min(1).max(64);

export async function createProduct(input: ProductFormValues): Promise<ActionResult<SavedProduct>> {
  const { user } = await requireAdmin("products");
  return saveProduct(user, null, input);
}

export async function updateProduct(id: string, input: ProductFormValues): Promise<ActionResult<SavedProduct>> {
  const { user } = await requireAdmin("products");
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown product.");
  return saveProduct(user, parsedId.data, input);
}

// ---------- duplicate / archive / delete ----------

/** First free value of `${base}${suffix}`, `${base}${suffix}-2`, … in the given field. */
async function freeCopyValue(field: "slug" | "sku", base: string, suffix: string) {
  const stem = `${base}${suffix}`;
  // The value itself, or one starting with `${stem}-` (case-sensitive, like the old LIKE).
  const values = { $in: [stem, new RegExp(`^${escapeRegex(`${stem}-`)}`)] };
  const rows = await db.products
    .find(field === "slug" ? { slug: values } : { sku: values })
    .project<{ slug: string; sku: string }>({ _id: 0, slug: 1, sku: 1 })
    .toArray();
  const taken = new Set(rows.map((r) => r[field]));
  if (!taken.has(stem)) return stem;
  for (let n = 2; ; n++) if (!taken.has(`${stem}-${n}`)) return `${stem}-${n}`;
}

export async function duplicateProduct(id: string): Promise<ActionResult<SavedProduct>> {
  const { user } = await requireAdmin("products");
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown product.");
  const source = await db.products.findOne({ _id: parsedId.data });
  if (!source) return fail("This product no longer exists.");

  const newId = newProductId();
  const slug = await freeCopyValue("slug", source.slug.slice(0, 180), "-copy");
  const sku = await freeCopyValue("sku", source.sku.slice(0, 90), /[a-z]/.test(source.sku) ? "-copy" : "-COPY");
  // A copy isn't part of the original's kit family listing: no sibling entry is "current" for it.
  const sourceKit = source.kit as Json | null;
  const kit = sourceKit
    ? {
        ...sourceKit,
        ...(Array.isArray(sourceKit.siblings) ? { siblings: sourceKit.siblings.map((sib: Json) => ({ ...sib, isCurrent: false })) } : {}),
      }
    : null;

  await transaction(async (session) => {
    const rest: Partial<ProductRow> = stripId(source);
    delete rest.createdAt;
    delete rest.updatedAt;
    await insert("products", { ...rest, id: newId, slug, sku, name: `${source.name} (copy)`.slice(0, 300), status: "draft", kit }, { session });
    // One at a time: a transaction's operations can't run in parallel.
    const images = await db.productImages.find({ productId: source.id }, { session }).toArray();
    const cats = await db.productCategories.find({ productId: source.id }, { session }).toArray();
    const related = await db.productRelated.find({ productId: source.id }, { session }).toArray();
    const parts = await db.kitComponents.find({ kitId: source.id }, { session }).toArray();
    if (images.length)
      await insert(
        "productImages",
        images.map((i) => ({ productId: newId, url: i.url, alt: i.alt, position: i.position })),
        { session },
      );
    if (related.length)
      await insert(
        "productRelated",
        related.map((r) => ({ productId: newId, relatedId: r.relatedId, position: r.position })),
        { session },
      );
    if (parts.length)
      await insert(
        "kitComponents",
        parts.map((c) => ({
          kitId: newId,
          componentId: c.componentId,
          name: c.name,
          sku: c.sku,
          role: c.role,
          qty: c.qty,
          imageUrl: c.imageUrl,
          position: c.position,
        })),
        { session },
      );
    await appendCategories(
      session,
      newId,
      cats.map((c) => c.categoryId),
    );
  });

  await logActivity(user, "product.duplicate", "product", newId, { from: source.id, fromSku: source.sku, sku, slug, status: "draft" });
  await bumpCatalogVersion();
  return { ok: true, message: `Copied as a draft: ${sku}.`, data: { id: newId, slug } };
}

export async function archiveProduct(id: string): Promise<ActionResult> {
  const { user } = await requireAdmin("products");
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown product.");
  const product = await db.products.findOne({ _id: parsedId.data }, { projection: { status: 1 } });
  if (!product) return fail("This product no longer exists.");
  if (product.status === "archived") return { ok: true, message: "Already archived." };
  await transaction(async (session) => {
    await db.products.updateOne({ _id: parsedId.data }, { $set: stamp({ status: "archived" as const }) }, { session });
  });
  await logActivity(user, "product.archive", "product", parsedId.data, { status: { from: product.status, to: "archived" } });
  await bumpCatalogVersion();
  return { ok: true, message: "Archived. It's hidden from the shop and can be restored at any time." };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const { user } = await requireAdmin("products");
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown product.");
  const product = await db.products.findOne({ _id: parsedId.data });
  if (!product) return fail("This product no longer exists.");

  const [orders, kitIds] = await Promise.all([
    db.orderItems.countDocuments({ productId: product.id }),
    db.kitComponents.distinct("kitId", { componentId: product.id }),
  ]);
  const kits = kitIds.length;
  if (orders > 0)
    return fail(
      `This product appears on ${orders} order ${orders === 1 ? "line" : "lines"}, so it can't be deleted. Archive it instead: it disappears from the shop but order history stays intact.`,
    );
  if (kits > 0)
    return fail(`This product is a component of ${kits} ${kits === 1 ? "kit" : "kits"}. Remove it from those kits first, or archive it instead.`);

  await transaction(async (session) => {
    // Images, category links, related links and kit components go with it (what ON DELETE CASCADE did).
    await removeProducts([product.id], session);
  });
  await logActivity(user, "product.delete", "product", product.id, {
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    status: product.status,
  });
  await bumpCatalogVersion();
  // The product's own page no longer exists: go straight to the list, which shows the confirmation.
  redirect(`/admin/products?deleted=${encodeURIComponent(product.sku)}`);
}

// ---------- bulk ----------

const bulkSchema = z.object({
  ids: z.array(idSchema).min(1, "Select at least one product.").max(500, "Select up to 500 products at a time."),
  change: z.union([z.object({ status: z.enum(PRODUCT_STATUSES) }), z.object({ availability: z.enum(AVAILABILITIES) })]),
});

export async function bulkUpdateProducts(
  ids: string[],
  change: { status: ProductStatus } | { availability: Availability },
): Promise<ActionResult<{ count: number }>> {
  const { user } = await requireAdmin("products");
  const parsed = bulkSchema.safeParse({ ids, change });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid selection.");
  const { ids: selected, change: c } = parsed.data;

  const field = "status" in c ? "status" : "availability";
  const value = "status" in c ? c.status : c.availability;
  const rows = await db.products
    .find({ _id: { $in: selected } })
    .project<{ id: string; status: ProductStatus; availability: Availability }>({ _id: 0, id: 1, status: 1, availability: 1 })
    .toArray();
  const toChange = rows.filter((r) => r[field] !== value);
  if (!toChange.length) return { ok: true, message: "Nothing to change: the selected products already have that setting.", data: { count: 0 } };

  const targetIds = toChange.map((r) => r.id);
  await transaction(async (session) => {
    if ("status" in c) await db.products.updateMany({ _id: { $in: targetIds } }, { $set: stamp({ status: c.status }) }, { session });
    else {
      await db.products.updateMany({ _id: { $in: targetIds } }, { $set: stamp({ availability: c.availability }) }, { session });
      // Kits carry their stock state in the kit metadata too.
      await db.products.updateMany({ _id: { $in: targetIds }, kit: { $ne: null } }, { $set: { "kit.stockState": c.availability } }, { session });
    }
  });
  for (const r of toChange)
    await logActivity(user, `product.bulk_${field}`, "product", r.id, { [field]: { from: r[field], to: value } });
  await bumpCatalogVersion();
  const n = toChange.length;
  return { ok: true, message: `Updated ${n} ${n === 1 ? "product" : "products"}.`, data: { count: n } };
}
