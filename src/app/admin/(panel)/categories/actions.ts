"use server";

// Category mutations for the back office. Every action: requireAdmin("categories") → zod validation → database
// writes (in one transaction when several rows change) → activity log entry with a concise diff →
// bumpCatalogVersion() so the shop reloads its catalogue.
import { redirect } from "next/navigation";
import type { ClientSession } from "mongodb";
import { fieldErrorsOf } from "@/app/admin/(panel)/products/_lib/validation";
import { buildCategoryOptions, descendantIds, extraCategoryIds, listingCategoryIds } from "@/components/admin/products/category-tree";
import { builtInKitFilter, storedKitFilter } from "@/components/sites/cctvmaster/kits/kit-data";
import { db, insert, removeCategories, stamp, transaction } from "@/db";
import { categoryIdsByProduct, type CategoryRow, loadCategoryRows, parentsOnlyThrough, removalLock, siblingsOf } from "@/lib/admin/categories/data";
import { describeRule, type KitRuleValues, ruleFromFilters, ruleToRecord } from "@/lib/admin/categories/kit-rule";
import type { ActionResult, CategoryFormValues, CategoryOption, FieldErrors } from "@/lib/admin/categories/types";
import { categoryIdSchema, categoryInputSchema, KIT_ROOT_SLUG, productIdsSchema } from "@/lib/admin/categories/validation";
import { bumpCatalogVersion, logActivity, requireAdmin } from "@/lib/admin/session";

type Json = Record<string, unknown>;
type Actor = Awaited<ReturnType<typeof requireAdmin>>["user"];

const fail = (message: string, fieldErrors?: FieldErrors) => ({ ok: false as const, message, fieldErrors });
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;

// ---------- activity-log diffs ----------

const pathLabel = (options: CategoryOption[], id: number | null) =>
  id === null ? "(top level)" : (options.find((o) => o.id === id)?.path.join(" › ") ?? `#${id}`);

/** The stored kit_filter as a readable rule; null means the built-in rule for the slug. */
const ruleLabel = (slug: string, kitFilter: Record<string, string | number> | null) =>
  kitFilter
    ? describeRule(ruleFromFilters(storedKitFilter(kitFilter)))
    : `${describeRule(ruleFromFilters(builtInKitFilter(slug) ?? {}))} (built-in)`;

function auditView(row: Omit<CategoryRow, "id" | "createdAt" | "updatedAt" | "position">, options: CategoryOption[]): Json {
  return {
    name: row.name,
    slug: row.slug,
    parent: pathLabel(options, row.parentId),
    title: row.title,
    metaDescription: row.metaDescription,
    description: row.description,
    image: row.imageUrl,
    visible: row.visible,
    ...(row.isKitRange ? { kitRule: ruleLabel(row.slug, row.kitFilter) } : {}),
  };
}

function diff(before: Json, after: Json): Json {
  const out: Json = {};
  for (const key of Object.keys(after)) {
    const a = before[key] ?? null;
    const b = after[key] ?? null;
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (key === "description") {
      const len = (x: unknown) => (typeof x === "string" ? x.length : 0);
      out[key] = `edited (${len(a).toLocaleString("en-GB")} → ${len(b).toLocaleString("en-GB")} characters)`;
    } else out[key] = { from: a, to: b };
  }
  return out;
}

const listForLog = (items: string[]) => (items.length <= 12 ? items : `${items.length} products`);

// ---------- helpers ----------

/** Next free position at the end of a parent's children. */
const endPosition = (rows: CategoryRow[], parentId: number | null, isKitRange: boolean, exceptId?: number) =>
  Math.max(-1, ...siblingsOf(rows, parentId, isKitRange).filter((r) => r.id !== exceptId).map((r) => r.position)) + 1;

/** Kit rule to store: null when it is the built-in rule for the slug (so the code mapping stays in charge). */
function storedRule(rule: KitRuleValues, slug: string): Record<string, string | number> | null {
  const record = ruleToRecord(rule);
  const builtIn = ruleToRecord(ruleFromFilters(builtInKitFilter(slug) ?? {}));
  return JSON.stringify(record) === JSON.stringify(builtIn) ? null : record;
}

/** Inserts listings, skipping products already listed in that category (the old ON CONFLICT DO NOTHING). */
async function insertNewListings(session: ClientSession, values: { productId: string; categoryId: number; position: number }[]) {
  const key = (v: { productId: string; categoryId: number }) => `${v.productId}:${v.categoryId}`;
  const existing = await db.productCategories
    .find({ _id: { $in: values.map(key) } }, { session })
    .project<{ _id: string }>({ _id: 1 })
    .toArray();
  const taken = new Set(existing.map((l) => l._id));
  const fresh = values.filter((v) => {
    if (taken.has(key(v))) return false;
    taken.add(key(v));
    return true;
  });
  await insert("productCategories", fresh, { session });
}

/** Appends listings (product_categories rows) after the products already in each category. */
async function appendListings(session: ClientSession, rows: { productId: string; categoryId: number }[]) {
  if (!rows.length) return;
  const categoryIds = [...new Set(rows.map((r) => r.categoryId))];
  const maxima = await db.productCategories
    .aggregate<{ _id: number; max: number }>(
      [{ $match: { categoryId: { $in: categoryIds } } }, { $group: { _id: "$categoryId", max: { $max: "$position" } } }],
      { session },
    )
    .toArray();
  const next = new Map(maxima.map((m) => [m._id, m.max + 1]));
  const values = rows.map((r) => {
    const position = next.get(r.categoryId) ?? 0;
    next.set(r.categoryId, position + 1);
    return { ...r, position };
  });
  for (let i = 0; i < values.length; i += 1000) await insertNewListings(session, values.slice(i, i + 1000));
}

/**
 * After a shop category moves, its products should be listed under the new parents instead of the old ones
 * (a product is listed in its categories and all their parents). Recomputes the listings of the products in the moved
 * branch with the products module's rule, keeping each product's own choices.
 */
async function relistMovedBranch(session: ClientSession, before: CategoryOption[], after: CategoryOption[], branch: number[]) {
  const linked = await db.productCategories
    .find({ categoryId: { $in: branch } }, { session })
    .project<{ productId: string }>({ _id: 0, productId: 1 })
    .toArray();
  const primaries = await db.products
    .find({ primaryCategoryId: { $in: branch } }, { session })
    .project<{ id: string }>({ _id: 0, id: 1 })
    .toArray();
  const ids = [...new Set([...linked.map((l) => l.productId), ...primaries.map((p) => p.id)])];
  if (!ids.length) return { added: 0, removed: 0 };

  const primaryOf = new Map<string, number | null>();
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = await db.products
      .find({ _id: { $in: ids.slice(i, i + 1000) } }, { session })
      .project<{ id: string; primaryCategoryId: number | null }>({ _id: 0, id: 1, primaryCategoryId: 1 })
      .toArray();
    for (const p of chunk) primaryOf.set(p.id, p.primaryCategoryId);
  }
  const stored = await categoryIdsByProduct(ids, session);
  const toAdd: { productId: string; categoryId: number }[] = [];
  let removed = 0;
  for (const productId of ids) {
    const primary = primaryOf.get(productId) ?? null;
    const current = stored.get(productId) ?? [];
    const wanted = new Set(listingCategoryIds(after, primary, extraCategoryIds(before, primary, current)));
    const drop = current.filter((id) => !wanted.has(id));
    if (drop.length) {
      await db.productCategories.deleteMany({ productId, categoryId: { $in: drop } }, { session });
      removed += drop.length;
    }
    for (const categoryId of wanted) if (!current.includes(categoryId)) toAdd.push({ productId, categoryId });
  }
  await appendListings(session, toAdd);
  return { added: toAdd.length, removed };
}

/** Removes parent listings the products had only because they were in the category; returns how many went. */
async function dropParentsOnlyThrough(
  session: ClientSession,
  options: CategoryOption[],
  categoryId: number,
  products: { id: string; primaryCategoryId: number | null }[],
  stored: Map<string, number[]>,
) {
  const byCategory = new Map<number, string[]>();
  for (const p of products)
    for (const cid of parentsOnlyThrough(options, categoryId, p.primaryCategoryId, stored.get(p.id) ?? [])) byCategory.set(cid, [...(byCategory.get(cid) ?? []), p.id]);
  let removed = 0;
  for (const [cid, ids] of byCategory)
    for (let i = 0; i < ids.length; i += 1000) {
      const chunk = ids.slice(i, i + 1000);
      await db.productCategories.deleteMany({ categoryId: cid, productId: { $in: chunk } }, { session });
      removed += chunk.length;
    }
  return removed;
}

// ---------- create / update ----------

async function saveCategory(user: Actor, id: number | null, raw: unknown): Promise<ActionResult<{ id: number }>> {
  const parsed = categoryInputSchema.safeParse(raw);
  if (!parsed.success) return fail("Some fields need attention. Check the highlighted fields.", fieldErrorsOf(parsed.error));
  const v = parsed.data;

  const rows = await loadCategoryRows();
  const existing = id === null ? null : (rows.find((r) => r.id === id) ?? null);
  if (id !== null && !existing) return fail("This category no longer exists. It may have been deleted in another tab.");
  // A category's type is fixed when it's created.
  const isKitRange = existing ? existing.isKitRange : v.isKitRange;
  const isKitRoot = existing?.slug === KIT_ROOT_SLUG;
  const options = buildCategoryOptions(rows);
  const errors: FieldErrors = {};

  if (rows.some((r) => r.slug === v.slug && r.id !== id)) errors.slug = "Another category already uses this URL slug. Choose a different one.";
  if (isKitRoot && v.slug !== KIT_ROOT_SLUG) errors.slug = `The shop's kit pages are built around /categories/${KIT_ROOT_SLUG}, so this slug can't change.`;

  if (isKitRoot) {
    if (v.parentId !== null) errors.parentId = "CCTV Kits is the top of the kit ranges and stays at the top level.";
  } else if (v.parentId === null) {
    if (isKitRange) errors.parentId = "Choose where this kit range goes, e.g. under CCTV Kits.";
  } else {
    const parent = rows.find((r) => r.id === v.parentId);
    if (!parent) errors.parentId = "That parent category no longer exists. Choose another.";
    else if (id !== null && parent.id === id) errors.parentId = "A category can't be its own parent.";
    else if (id !== null && descendantIds(options, id).includes(parent.id))
      errors.parentId = `“${parent.name}” is inside this category, so it can't be its parent. Choose a category outside this branch.`;
    else if (parent.isKitRange !== isKitRange)
      errors.parentId = isKitRange ? "A kit range goes under CCTV Kits or another kit range." : "A shop category can't go under a kit range.";
  }
  if (isKitRange && !v.kitRule) errors.kitRule = "Set which kits this range lists.";
  if (Object.keys(errors).length) return fail("Some fields need attention. Check the highlighted fields.", errors);

  const row = {
    name: v.name,
    slug: v.slug,
    parentId: v.parentId,
    title: v.title || null,
    metaDescription: v.metaDescription || null,
    description: v.description.trim() ? v.description : null,
    imageUrl: v.imageUrl,
    visible: v.visible,
    isKitRange,
    kitFilter: isKitRange && v.kitRule ? storedRule(v.kitRule, v.slug) : null,
  };
  const parentChanged = !!existing && existing.parentId !== row.parentId;

  if (existing) {
    const changes = diff(auditView(existing, options), auditView(row, options));
    if (!Object.keys(changes).length) return { ok: true, message: "No changes to save.", data: { id: existing.id } };
    const relisted = await transaction(async (session) => {
      await db.categories.updateOne(
        { _id: existing.id },
        { $set: stamp({ ...row, ...(parentChanged ? { position: endPosition(rows, row.parentId, isKitRange, existing.id) } : {}) }) },
        { session },
      );
      if (!parentChanged || isKitRange) return null;
      const after = buildCategoryOptions(rows.map((r) => (r.id === existing.id ? { ...r, parentId: row.parentId } : r)));
      return relistMovedBranch(session, options, after, descendantIds(options, existing.id));
    });
    const relistedAny = relisted && (relisted.added || relisted.removed);
    await logActivity(user, "category.update", "category", existing.id, relistedAny ? { ...changes, listings: relisted } : changes);
    await bumpCatalogVersion();
    return { ok: true, message: "Category saved.", data: { id: existing.id } };
  }

  const [created] = await insert("categories", { ...row, position: endPosition(rows, row.parentId, isKitRange) });
  await logActivity(user, "category.create", "category", created.id, {
    name: row.name,
    slug: row.slug,
    parent: pathLabel(options, row.parentId),
    type: isKitRange ? "kit range" : "shop category",
    visible: row.visible,
    ...(isKitRange ? { kitRule: ruleLabel(row.slug, row.kitFilter) } : {}),
  });
  await bumpCatalogVersion();
  return { ok: true, message: isKitRange ? "Kit range created." : "Category created.", data: { id: created.id } };
}

export async function createCategory(input: CategoryFormValues): Promise<ActionResult<{ id: number }>> {
  const { user } = await requireAdmin("categories");
  return saveCategory(user, null, input);
}

export async function updateCategory(id: number, input: CategoryFormValues): Promise<ActionResult<{ id: number }>> {
  const { user } = await requireAdmin("categories");
  const parsedId = categoryIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown category.");
  return saveCategory(user, parsedId.data, input);
}

// ---------- order & visibility (list page) ----------

export async function moveCategory(id: number, direction: "up" | "down"): Promise<ActionResult> {
  const { user } = await requireAdmin("categories");
  const parsedId = categoryIdSchema.safeParse(id);
  if (!parsedId.success || (direction !== "up" && direction !== "down")) return fail("Unknown category.");
  const rows = await loadCategoryRows();
  const row = rows.find((r) => r.id === parsedId.data);
  if (!row) return fail("This category no longer exists.");

  const siblings = siblingsOf(rows, row.parentId, row.isKitRange);
  const from = siblings.findIndex((r) => r.id === row.id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= siblings.length) return { ok: true, message: `Already ${direction === "up" ? "first" : "last"}.` };
  const reordered = [...siblings];
  [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
  // Reuse the siblings' own position values (renumbered from the lowest one if any are shared).
  let slots = siblings.map((r) => r.position).sort((a, b) => a - b);
  if (new Set(slots).size !== slots.length) slots = slots.map((_, i) => slots[0] + i);
  const updates = reordered.map((r, i) => ({ id: r.id, position: slots[i], before: r.position })).filter((u) => u.position !== u.before);

  await transaction(async (session) => {
    for (const u of updates) await db.categories.updateOne({ _id: u.id }, { $set: stamp({ position: u.position }) }, { session });
  });
  const neighbour = siblings[to];
  await logActivity(user, "category.reorder", "category", row.id, {
    name: row.name,
    moved: `${direction} (${direction === "up" ? "before" : "after"} ${neighbour.name})`,
  });
  await bumpCatalogVersion();
  return { ok: true, message: `Moved ${row.name} ${direction}.` };
}

export async function setCategoryVisibility(id: number, visible: boolean): Promise<ActionResult> {
  const { user } = await requireAdmin("categories");
  const parsedId = categoryIdSchema.safeParse(id);
  if (!parsedId.success || typeof visible !== "boolean") return fail("Unknown category.");
  const row = await db.categories.findOne({ _id: parsedId.data });
  if (!row) return fail("This category no longer exists.");
  if (row.visible === visible) return { ok: true, message: visible ? "Already visible." : "Already hidden." };
  await db.categories.updateOne({ _id: row.id }, { $set: stamp({ visible }) });
  await logActivity(user, visible ? "category.show" : "category.hide", "category", row.id, { name: row.name, visible: { from: row.visible, to: visible } });
  await bumpCatalogVersion();
  return {
    ok: true,
    message: visible ? `${row.name} is visible in the shop again.` : `${row.name} is hidden from the shop, with everything below it.`,
  };
}

// ---------- products in a category ----------

/** Sets which products a shop category lists and their order (product_categories.position). */
export async function saveCategoryProducts(id: number, productIds: string[]): Promise<ActionResult<{ count: number }>> {
  const { user } = await requireAdmin("categories");
  const parsedId = categoryIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown category.");
  const parsedIds = productIdsSchema.safeParse(productIds);
  if (!parsedIds.success) return fail(parsedIds.error.issues[0]?.message ?? "Invalid product list.");
  const wanted = parsedIds.data;

  const rows = await loadCategoryRows();
  const category = rows.find((r) => r.id === parsedId.data);
  if (!category) return fail("This category no longer exists.");
  if (category.isKitRange) return fail("Kit ranges list kits by their rule, not by hand.");
  const options = buildCategoryOptions(rows);

  const current = await db.productCategories
    .find({ categoryId: category.id })
    .project<{ productId: string; position: number }>({ _id: 0, productId: 1, position: 1 })
    .toArray();
  const currentIds = new Set(current.map((c) => c.productId));
  const wantedIds = new Set(wanted);
  const added = wanted.filter((pid) => !currentIds.has(pid));
  const removed = current.map((c) => c.productId).filter((pid) => !wantedIds.has(pid));

  const touched = [...added, ...removed];
  const info = new Map<string, { sku: string; primaryCategoryId: number | null }>();
  for (let i = 0; i < touched.length; i += 1000) {
    const chunk = await db.products
      .find({ _id: { $in: touched.slice(i, i + 1000) } })
      .project<{ id: string; sku: string; primaryCategoryId: number | null }>({ _id: 0, id: 1, sku: 1, primaryCategoryId: 1 })
      .toArray();
    for (const p of chunk) info.set(p.id, p);
  }
  if (added.some((pid) => !info.has(pid))) return fail("A product you added no longer exists. Reload the page and try again.");
  const stored = await categoryIdsByProduct(touched);
  const locked = removed.filter((pid) => removalLock(options, category.id, info.get(pid)?.primaryCategoryId ?? null, stored.get(pid) ?? []));
  if (locked.length)
    return fail(
      `${locked.map((pid) => info.get(pid)?.sku ?? pid).join(", ")} can't be removed here: this is their main category or they're listed in a category below it. Change that on the product page first.`,
    );

  // Whether the products that stay are in a different order.
  const keptBefore = [...current].sort((a, b) => a.position - b.position).map((c) => c.productId).filter((pid) => wantedIds.has(pid));
  const reordered = keptBefore.join() !== wanted.filter((pid) => currentIds.has(pid)).join();
  if (!added.length && !removed.length && !reordered) return { ok: true, message: "No changes to save.", data: { count: wanted.length } };

  // New products are also listed in this category's parents, as when the category is chosen on the product page.
  const parentListings = added.flatMap((pid) => {
    const p = info.get(pid)!;
    const have = stored.get(pid) ?? [];
    const extras = [...extraCategoryIds(options, p.primaryCategoryId, have), category.id];
    return listingCategoryIds(options, p.primaryCategoryId, extras)
      .filter((cid) => cid !== category.id && !have.includes(cid))
      .map((categoryId) => ({ productId: pid, categoryId }));
  });

  const positionOf = new Map(wanted.map((pid, i) => [pid, i]));
  const parentsDropped = await transaction(async (session) => {
    if (removed.length) await db.productCategories.deleteMany({ categoryId: category.id, productId: { $in: removed } }, { session });
    // ...and from the parents they were listed in only because of this category.
    const dropped = await dropParentsOnlyThrough(
      session,
      options,
      category.id,
      removed.map((pid) => ({ id: pid, primaryCategoryId: info.get(pid)?.primaryCategoryId ?? null })),
      stored,
    );
    if (added.length)
      for (let i = 0; i < added.length; i += 1000)
        await insertNewListings(
          session,
          added.slice(i, i + 1000).map((productId) => ({ productId, categoryId: category.id, position: positionOf.get(productId) ?? 0 })),
        );
    // Positions follow the list: 0, 1, 2… (only rows whose position changes are written).
    const before = new Map(current.map((c) => [c.productId, c.position]));
    const changed = wanted.map((pid, position) => ({ pid, position })).filter((x) => before.has(x.pid) && before.get(x.pid) !== x.position);
    for (let i = 0; i < changed.length; i += 500)
      await db.productCategories.bulkWrite(
        changed.slice(i, i + 500).map((x) => ({
          updateOne: { filter: { categoryId: category.id, productId: x.pid }, update: { $set: { position: x.position } } },
        })),
        { session },
      );
    await appendListings(session, parentListings);
    return dropped;
  });

  const skus = (ids: string[]) => ids.map((pid) => info.get(pid)?.sku ?? pid);
  await logActivity(user, "category.products", "category", category.id, {
    name: category.name,
    ...(added.length ? { added: listForLog(skus(added)) } : {}),
    ...(removed.length ? { removed: listForLog(skus(removed)) } : {}),
    ...(parentListings.length ? { alsoListedInParents: parentListings.length } : {}),
    ...(parentsDropped ? { alsoRemovedFromParents: parentsDropped } : {}),
    ...(reordered ? { order: "changed" } : {}),
    count: wanted.length,
  });
  await bumpCatalogVersion();
  const parts = [added.length ? `added ${plural(added.length, "product")}` : "", removed.length ? `removed ${plural(removed.length, "product")}` : ""].filter(Boolean);
  return { ok: true, message: parts.length ? `Saved: ${parts.join(", ")}.` : "Product order saved.", data: { count: wanted.length } };
}

// ---------- delete ----------

export async function deleteCategory(id: number): Promise<ActionResult> {
  const { user } = await requireAdmin("categories");
  const parsedId = categoryIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown category.");
  const rows = await loadCategoryRows();
  const row = rows.find((r) => r.id === parsedId.data);
  if (!row) return fail("This category no longer exists.");
  const children = rows.filter((r) => r.parentId === row.id);
  if (children.length) return fail(`${row.name} has ${plural(children.length, "sub-category", "sub-categories")}. Move or delete them first.`);
  if (row.slug === KIT_ROOT_SLUG) return fail("CCTV Kits holds the shop's kit pages and can't be deleted.");

  const options = buildCategoryOptions(rows);
  let parentsDropped = 0;
  const result = await transaction(async (session) => {
    const cleared = await db.products.updateMany({ primaryCategoryId: row.id }, { $set: stamp({ primaryCategoryId: null }) }, { session });
    // Products leave the parents they were listed in only because of this category; its own listings go with it.
    if (!row.isKitRange) {
      const listings = await db.productCategories
        .find({ categoryId: row.id }, { session })
        .project<{ productId: string }>({ _id: 0, productId: 1 })
        .toArray();
      const listed = listings.length
        ? await db.products
            .find({ _id: { $in: listings.map((l) => l.productId) } }, { session })
            .project<{ id: string; primaryCategoryId: number | null }>({ _id: 0, id: 1, primaryCategoryId: 1 })
            .toArray()
        : [];
      parentsDropped = await dropParentsOnlyThrough(session, options, row.id, listed, await categoryIdsByProduct(listed.map((p) => p.id), session));
    }
    const links = await db.productCategories.deleteMany({ categoryId: row.id }, { session });
    // The category itself, with what ON DELETE CASCADE / SET NULL did (e.g. a sub-category added meanwhile moves up).
    await removeCategories([row.id], session);
    return { cleared: cleared.matchedCount, links: links.deletedCount };
  });
  await logActivity(user, "category.delete", "category", row.id, {
    name: row.name,
    slug: row.slug,
    parent: pathLabel(options, row.parentId),
    type: row.isKitRange ? "kit range" : "shop category",
    mainCategoryCleared: result.cleared,
    listingsRemoved: result.links,
    ...(parentsDropped ? { alsoRemovedFromParents: parentsDropped } : {}),
  });
  await bumpCatalogVersion();
  redirect(`/admin/categories?deleted=${encodeURIComponent(row.name)}`);
}
