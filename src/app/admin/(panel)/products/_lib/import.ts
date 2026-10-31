// Spreadsheet (CSV) import and export of single products for the back office. Server-only.
//
// Each row is matched to a product by SKU (ignoring case, like the database's unique index): a new SKU creates a
// product, an existing one updates it, and blank cells keep the product's current value. A row is turned into the
// product form's values and saved with saveProduct, so it gets exactly the form's checks, activity log and category
// listing rules. Missing categories are created from paths such as "Cameras > IP Cameras"; image web addresses are
// downloaded into the shop's own storage (once per image, however often it is imported). Ready-made kits aren't
// imported or exported: they're edited on their own product page.
import { createHash } from "node:crypto";
import { storeUpload } from "@/app/admin/(panel)/media/_lib/record";
import { buildCategoryOptions, extraCategoryIds } from "@/components/admin/products/category-tree";
import {
  headerKey,
  IMPORT_COLUMNS,
  IMPORT_MAX_ROWS,
  type ImportColumnKey,
  type ImportOutcome,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportResult,
  type ImportResultRow,
} from "@/components/admin/products/import-types";
import type { Availability, AttributeValue, CategoryOption, FieldErrors, ProductFormValues, ProductStatus } from "@/components/admin/products/types";
import { slugify } from "@/components/admin/products/utils";
import { CI, db, escapeRegex, insert } from "@/db";
import { type CategoryRow, loadCategoryRows, siblingsOf } from "@/lib/admin/categories/data";
import { bumpCatalogVersion, logActivity } from "@/lib/admin/session";
import { parseCsv, toCsv, unguardCell } from "@/lib/csv";
import { downloadImage } from "@/lib/remote-image";
import { IMAGE_TYPES, UploadError } from "@/lib/storage";
import { emptyFormValues, isKitExpr, loadProductForm } from "./data";
import { type Actor, NO_CHANGES, saveProduct } from "./save";
import { fieldErrorsOf, isAllowedImageUrl, productInputSchema } from "./validation";

type Cells = Partial<Record<ImportColumnKey, string>>;

const COLUMN_BY_HEADER = new Map<string, ImportColumnKey>();
for (const c of IMPORT_COLUMNS) for (const h of [c.header, ...c.aliases]) COLUMN_BY_HEADER.set(headerKey(h), c.key);
const HEADER = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.key, c.header])) as Record<ImportColumnKey, string>;

/** Product form fields → the column a validation message is about. */
const FIELD_COLUMN: Partial<Record<string, ImportColumnKey>> = {
  name: "name",
  slug: "slug",
  sku: "sku",
  brand: "brand",
  status: "status",
  badge: "badge",
  price: "price",
  compareAtPrice: "compareAtPrice",
  costPrice: "costPrice",
  availability: "availability",
  stock: "stock",
  weightGrams: "weightGrams",
  primaryCategoryId: "category",
  extraCategoryIds: "extraCategories",
  images: "images",
  shortDescription: "shortDescription",
  description: "description",
  attributes: "specs",
  seoTitle: "seoTitle",
  seoDescription: "seoDescription",
};

const describeErrors = (errors: FieldErrors | undefined) => [
  ...new Set(
    Object.entries(errors ?? {}).map(([path, message]) => {
      const column = FIELD_COLUMN[path.split(".")[0]];
      return column ? `${HEADER[column]}: ${message}` : message;
    }),
  ),
];

const clip = (text: string, max = 60) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
/** "a | b" or one per line → ["a", "b"]. */
const splitList = (value: string) =>
  (value.includes("\n") ? value.split(/\r?\n/) : value.split("|")).map((v) => v.trim()).filter(Boolean);

const STATUS_WORDS: Record<string, ProductStatus> = {
  active: "active",
  live: "active",
  published: "active",
  visible: "active",
  draft: "draft",
  hidden: "draft",
  archived: "archived",
};
const AVAILABILITY_WORDS: Record<string, Availability> = {
  instock: "in_stock",
  available: "in_stock",
  backorder: "backorder",
  onbackorder: "backorder",
  preorder: "backorder",
  outofstock: "out_of_stock",
  soldout: "out_of_stock",
  discontinued: "discontinued",
};
const UNTRACKED = new Set(["untracked", "notracking", "none", "no"]);
const YES = new Set(["yes", "y", "true", "1"]);
const NO = new Set(["no", "n", "false", "0"]);

// ---------- categories ----------

const sameName = (a: string, b: string) => a.trim().replace(/\s+/g, " ").toLowerCase() === b.trim().replace(/\s+/g, " ").toLowerCase();
const splitPath = (path: string) =>
  path
    .split(/\s*[>›]\s*/)
    .map((p) => p.trim().replace(/\s+/g, " "))
    .filter(Boolean);

/** Where a category cell points: an existing category, or a path to create. */
type CategoryTarget = { id: number } | { create: string[] };

/** The shop's category tree, resolving "A > B" paths and creating the missing ones (shop categories only). */
class CategoryIndex {
  options: CategoryOption[];
  private created = new Map<string, number>();
  readonly createdPaths: string[] = [];

  constructor(private rows: CategoryRow[]) {
    this.options = buildCategoryOptions(rows);
  }

  label(id: number) {
    return this.options.find((o) => o.id === id)?.path.join(" › ") ?? `#${id}`;
  }

  resolve(path: string): CategoryTarget | { error: string } {
    const segments = splitPath(path);
    if (!segments.length) return { error: "write a category name or a path such as Cameras > IP Cameras" };
    // A single name may point to a category anywhere in the tree ("IP Cameras" for "Cameras > IP Cameras").
    if (segments.length === 1) {
      const matches = this.rows.filter((r) => !r.isKitRange && (sameName(r.name, segments[0]) || r.slug === segments[0].toLowerCase()));
      if (matches.length === 1) return { id: matches[0].id };
      if (matches.length > 1)
        return { error: `“${segments[0]}” matches ${matches.length} categories; write the full path, e.g. ${this.label(matches[0].id).replace(/ › /g, " > ")}` };
    }
    let parentId: number | null = null;
    for (const name of segments) {
      const found = this.rows.find((r) => r.parentId === parentId && sameName(r.name, name));
      // create() reuses the categories that already exist along the path and adds the rest.
      if (!found) return { create: segments };
      if (found.isKitRange) return { error: `“${found.name}” is a kit range: it lists ready-made kits automatically, so products can't be placed in it` };
      parentId = found.id;
    }
    return { id: parentId as number };
  }

  /** Creates the missing categories along a path (once per path in an import) and returns the last one's id. */
  async create(segments: string[], user: Actor): Promise<number> {
    const key = segments.map((n) => n.toLowerCase()).join(" > ");
    const done = this.created.get(key);
    if (done !== undefined) return done;
    let parentId: number | null = null;
    for (const name of segments) {
      let row: CategoryRow | undefined = this.rows.find((r) => r.parentId === parentId && !r.isKitRange && sameName(r.name, name));
      if (!row) {
        const position: number = Math.max(-1, ...siblingsOf(this.rows, parentId, false).map((r) => r.position)) + 1;
        [row] = await insert("categories", { name, slug: this.freeSlug(slugify(name) || "category"), parentId, position, visible: true, isKitRange: false });
        this.rows.push(row);
        this.options = buildCategoryOptions(this.rows);
        this.createdPaths.push(this.label(row.id));
        await logActivity(user, "category.create", "category", row.id, {
          name: row.name,
          slug: row.slug,
          parent: parentId === null ? null : this.label(parentId),
          type: "shop category",
          visible: true,
          source: "spreadsheet import",
        });
      }
      parentId = row.id;
    }
    this.created.set(key, parentId as number);
    return parentId as number;
  }

  private freeSlug(base: string) {
    const taken = new Set(this.rows.map((r) => r.slug));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }
}

// ---------- images ----------

type ImageSource = { stored: string } | { remote: string };

/** Turns the images cell into stored shop images and web addresses to download. */
function parseImages(value: string, ownOrigins: string[], errors: string[]): ImageSource[] {
  const sources: ImageSource[] = [];
  const seen = new Set<string>();
  for (const raw of splitList(value)) {
    let address = raw;
    for (const origin of ownOrigins) if (address.startsWith(`${origin}/`)) address = address.slice(origin.length);
    if (seen.has(address)) continue;
    seen.add(address);
    const url = /^https?:\/\//i.test(address) && URL.canParse(address) ? new URL(address) : null;
    if (isAllowedImageUrl(address)) sources.push({ stored: address });
    else if (!url) errors.push(`images: “${clip(raw)}” isn't a web address (it should start with https://)`);
    // Local and numeric addresses are refused when downloading (see remote-image.ts); say so before importing.
    else if (!url.hostname.includes(".") || /^[\d.]+$|^\[/.test(url.hostname) || /\.(localhost|local|internal)$/i.test(url.hostname))
      errors.push(`images: “${clip(raw)}” isn't a public web address`);
    else sources.push({ remote: address });
  }
  if (sources.length > 30) errors.push("images: a product can have up to 30 images");
  return sources;
}

/** Downloads an image into the shop's storage and the media library, reusing the stored copy of identical bytes. */
async function storeRemoteImage(address: string, user: Actor): Promise<string> {
  const { bytes, type } = await downloadImage(address);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 20);
  const existing = await db.media.findOne({ pathname: { $regex: `^${escapeRegex(`products/import-${hash}-`)}` } }, { projection: { url: 1 } });
  if (existing) return existing.url;
  const { stored } = await storeUpload(new File([bytes], `import-${hash}.${IMAGE_TYPES[type]}`, { type }), "products", user.id);
  return stored.url;
}

// ---------- rows ----------

interface PreparedRow {
  line: number;
  sku: string;
  existingId: string | null;
  /** The product's current values (updates) or the new-product defaults, with the row's plain fields applied. */
  values: ProductFormValues;
  /** undefined: keep the current value. */
  primary?: CategoryTarget;
  extras?: CategoryTarget[];
  images?: ImageSource[];
  errors: string[];
  notes: string[];
}

/** Applies a row's plain fields (everything except categories and images) to the form values. */
function applyCells(values: ProductFormValues, cells: Cells, errors: string[]) {
  const set = (key: ImportColumnKey, field: "name" | "brand" | "badge" | "shortDescription" | "description" | "seoTitle" | "seoDescription" | "price" | "compareAtPrice" | "costPrice" | "weightGrams") => {
    const v = cells[key];
    if (v) values[field] = v;
  };
  if (cells.sku) values.sku = cells.sku;
  set("name", "name");
  set("brand", "brand");
  set("badge", "badge");
  set("shortDescription", "shortDescription");
  set("description", "description");
  set("seoTitle", "seoTitle");
  set("seoDescription", "seoDescription");
  set("price", "price");
  set("compareAtPrice", "compareAtPrice");
  set("costPrice", "costPrice");
  set("weightGrams", "weightGrams");
  if (cells.slug) values.slug = cells.slug.toLowerCase();

  if (cells.status) {
    const status = STATUS_WORDS[headerKey(cells.status)];
    if (status) values.status = status;
    else errors.push(`status: write active, draft or archived (not “${clip(cells.status, 30)}”)`);
  }
  if (cells.availability) {
    const availability = AVAILABILITY_WORDS[headerKey(cells.availability)];
    if (availability) values.availability = availability;
    else errors.push(`availability: write in_stock, backorder, out_of_stock or discontinued (not “${clip(cells.availability, 30)}”)`);
  }
  if (cells.stock) {
    if (UNTRACKED.has(headerKey(cells.stock))) {
      values.trackStock = false;
      values.stock = "";
    } else {
      values.trackStock = true;
      values.stock = cells.stock;
    }
  }
  for (const [key, field] of [
    ["callForPrice", "isCallForPrice"],
    ["contactSales", "isContactSales"],
  ] as const) {
    const v = cells[key];
    if (!v) continue;
    if (YES.has(v.toLowerCase())) values[field] = true;
    else if (NO.has(v.toLowerCase())) values[field] = false;
    else errors.push(`${HEADER[key]}: write yes or no (not “${clip(v, 30)}”)`);
  }
  if (cells.specs) {
    // A specification that already exists keeps its type (TEXT, NUMBER…), which the shop's filters use.
    const typeOf = new Map(values.attributes.map((a) => [a.name.toLowerCase(), a.type]));
    const attributes: AttributeValue[] = [];
    splitList(cells.specs).forEach((part, i) => {
      const colon = nameValueColon(part);
      if (colon <= 0 || !part.slice(colon + 1).trim()) {
        errors.push(`specs: write each specification as Name: Value (“${clip(part, 40)}”)`);
        return;
      }
      const name = part.slice(0, colon).trim();
      const type = typeOf.get(name.toLowerCase());
      attributes.push({ key: `spec-${i}`, name, value: part.slice(colon + 1).trim(), ...(type ? { type } : {}) });
    });
    values.attributes = attributes;
  }
}

/** The colon between a specification's name and value: the first one outside brackets ("Display (Optional: LCD): 2 in"). */
function nameValueColon(part: string) {
  let depth = 0;
  for (let i = 0; i < part.length; i++) {
    const ch = part[i];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth = Math.max(0, depth - 1);
    else if (ch === ":" && depth === 0) return i;
  }
  return -1;
}

/** The form values to validate or save: category targets and images resolved by the caller. */
function finalValues(row: PreparedRow, options: CategoryOption[], primaryId: number | null | undefined, extraIds: number[] | undefined, images: string[] | undefined): ProductFormValues {
  const values: ProductFormValues = { ...row.values };
  if (primaryId !== undefined) values.primaryCategoryId = primaryId;
  if (extraIds !== undefined || primaryId !== undefined) {
    const extras = extraIds ?? values.extraCategoryIds;
    values.extraCategoryIds = extraCategoryIds(options, values.primaryCategoryId, [...new Set(extras)]);
  }
  if (images !== undefined) {
    const alts = new Map(row.values.images.map((i) => [i.url, i.alt]));
    values.images = images.map((url, i) => ({ key: `import-${i}`, url, alt: alts.get(url) ?? "" }));
  }
  return values;
}

type Prepared = { ok: true; rows: PreparedRow[]; index: CategoryIndex; columns: string[]; ignoredColumns: string[] } | { ok: false; error: string };

async function prepareImport(text: string, ownOrigins: string[]): Promise<Prepared> {
  const records = parseCsv(text);
  if (records.length < 2) return { ok: false, error: "The file has no product rows. Fill in the template below the header row." };
  const [header, ...dataRows] = records;
  const columnAt = header.cells.map((h) => COLUMN_BY_HEADER.get(headerKey(h)) ?? null);
  const columns = header.cells.filter((_, i) => columnAt[i]);
  const ignoredColumns = header.cells.filter((h, i) => !columnAt[i] && h.trim()).map((h) => h.trim());
  if (!columnAt.includes("sku"))
    return { ok: false, error: "The file needs a sku column. Download the template to see the expected columns (the first row holds the column names)." };
  const repeated = IMPORT_COLUMNS.find((c) => columnAt.filter((k) => k === c.key).length > 1);
  if (repeated) return { ok: false, error: `The ${repeated.header} column appears more than once. Keep one and delete the others.` };
  if (dataRows.length > IMPORT_MAX_ROWS)
    return { ok: false, error: `The file has ${dataRows.length.toLocaleString("en-GB")} products. Import up to ${IMPORT_MAX_ROWS.toLocaleString("en-GB")} at a time: split it into smaller files.` };

  const cellsOf = (cells: string[]) => {
    const out: Cells = {};
    cells.forEach((value, i) => {
      const key = columnAt[i];
      if (key) out[key] = unguardCell(value.trim()).trim();
    });
    return out;
  };
  const rowCells = dataRows.map((r) => ({ line: r.line, cells: cellsOf(r.cells) }));

  const skus = [...new Set(rowCells.map((r) => r.cells.sku?.toLowerCase()).filter((v): v is string => !!v))];
  const [existing, slugRows, categoryRows] = await Promise.all([
    skus.length
      ? db.products
          // Ignoring case, like the database's unique SKU index.
          .find({ sku: { $in: skus } }, { collation: CI })
          .project<{ id: string; sku: string; isKit: boolean }>({ _id: 0, id: 1, sku: 1, isKit: isKitExpr })
          .toArray()
      : Promise.resolve([]),
    db.products.find().project<{ id: string; slug: string }>({ _id: 0, id: 1, slug: 1 }).toArray(),
    loadCategoryRows(),
  ]);
  const bySku = new Map(existing.map((p) => [p.sku.toLowerCase(), p]));
  const slugOwner = new Map(slugRows.map((p) => [p.slug, p.id]));
  const index = new CategoryIndex(categoryRows);

  const skuLine = new Map<string, number>();
  const slugLine = new Map<string, number>();
  const rows: PreparedRow[] = [];
  for (const { line, cells } of rowCells) {
    const errors: string[] = [];
    const notes: string[] = [];
    const sku = cells.sku ?? "";
    const product = sku ? bySku.get(sku.toLowerCase()) : undefined;
    const row: PreparedRow = { line, sku, existingId: product?.id ?? null, values: emptyFormValues(false), errors, notes };
    if (cells.name) row.values.name = cells.name;
    rows.push(row);

    if (!sku) {
      errors.push("sku: missing. Every row needs a SKU.");
      continue;
    }
    const firstLine = skuLine.get(sku.toLowerCase());
    if (firstLine !== undefined) {
      errors.push(`sku: ${sku} is already on row ${firstLine}. Each product goes on one row.`);
      continue;
    }
    skuLine.set(sku.toLowerCase(), line);
    if (product?.isKit) {
      errors.push("This SKU is a ready-made kit. Kits are edited on their own product page, not by import.");
      continue;
    }
    if (product) {
      const form = await loadProductForm(product.id, index.options);
      if (!form) {
        errors.push("This product was deleted while the file was being checked. Check the file again.");
        continue;
      }
      row.values = form.values;
    }
    applyCells(row.values, cells, errors);

    // URL slug: kept for updates, made from the name for new products, and unique across the shop and the file.
    if (!product && !cells.slug) {
      const base = slugify(row.values.name) || slugify(sku) || "product";
      let slug = base;
      for (let n = 2; slugOwner.has(slug) || slugLine.has(slug); n++) slug = `${base}-${n}`;
      row.values.slug = slug;
    } else if (cells.slug) {
      const owner = slugOwner.get(row.values.slug);
      const other = slugLine.get(row.values.slug);
      if (owner && owner !== product?.id) errors.push("slug: another product already uses this web address. Choose a different slug.");
      else if (other !== undefined) errors.push(`slug: row ${other} uses the same web address. Each product needs its own.`);
    }
    slugLine.set(row.values.slug, line);

    if (cells.category) {
      const target = index.resolve(cells.category);
      if ("error" in target) errors.push(`category: ${target.error}`);
      else row.primary = target;
    }
    if (cells.extraCategories) {
      row.extras = [];
      for (const path of splitList(cells.extraCategories)) {
        const target = index.resolve(path);
        if ("error" in target) errors.push(`extra_categories: ${target.error}`);
        else row.extras.push(target);
      }
    }
    for (const target of [row.primary, ...(row.extras ?? [])])
      if (target && "create" in target) notes.push(`New category: ${target.create.join(" › ")}`);
    if (cells.images) {
      row.images = parseImages(cells.images, ownOrigins, errors);
      const remote = row.images.filter((i) => "remote" in i).length;
      if (remote) notes.push(`${remote} ${remote === 1 ? "image" : "images"} to download`);
    }

    // Validate with the form's own rules. Categories still to be created and images still to be downloaded are
    // checked above; here they stand in as "none yet" and a placeholder path.
    const idOf = (t: CategoryTarget | undefined) => (t && "id" in t ? t.id : null);
    const preview = finalValues(
      row,
      index.options,
      row.primary ? idOf(row.primary) : undefined,
      row.extras?.map(idOf).filter((id): id is number => id !== null),
      row.images?.map((img, i) => ("stored" in img ? img.stored : `/import-preview/${i}.jpg`)),
    );
    const parsed = productInputSchema.safeParse(preview);
    if (!parsed.success) errors.push(...describeErrors(fieldErrorsOf(parsed.error)));
  }
  return { ok: true, rows, index, columns, ignoredColumns };
}

const priceOf = (v: string) => {
  const n = Number(v.replace(/[£,\s]/g, ""));
  return v && Number.isFinite(n) ? n : null;
};

const newCategoryList = (rows: PreparedRow[]) => [
  ...new Set(
    rows
      .filter((r) => !r.errors.length)
      .flatMap((r) => [r.primary, ...(r.extras ?? [])])
      .flatMap((t) => (t && "create" in t ? [t.create.join(" › ")] : [])),
  ),
];

/** Checks a file without changing anything: what each row would do, and every problem found. */
export async function previewImport(text: string, ownOrigins: string[]): Promise<ImportPreview | { ok: false; error: string }> {
  const prepared = await prepareImport(text, ownOrigins);
  if (!prepared.ok) return prepared;
  const { rows, index } = prepared;
  const out: ImportPreviewRow[] = rows.map((r) => {
    const target = r.primary ?? (r.values.primaryCategoryId !== null ? { id: r.values.primaryCategoryId } : undefined);
    return {
      line: r.line,
      sku: r.sku,
      name: r.values.name,
      action: r.errors.length ? "error" : r.existingId ? "update" : "create",
      status: r.errors.length && !r.existingId ? null : r.values.status,
      price: priceOf(r.values.price),
      category: target ? ("id" in target ? index.label(target.id) : `${target.create.join(" › ")} (new)`) : null,
      images: r.images ? r.images.length : r.values.images.length,
      errors: r.errors,
      notes: r.errors.length ? [] : r.notes,
    };
  });
  return {
    ok: true,
    kind: "preview",
    rows: out,
    columns: prepared.columns,
    ignoredColumns: prepared.ignoredColumns,
    newCategories: newCategoryList(rows),
    counts: {
      create: out.filter((r) => r.action === "create").length,
      update: out.filter((r) => r.action === "update").length,
      error: out.filter((r) => r.action === "error").length,
    },
  };
}

/** Rows still waiting when this much time has passed are left for another run (Vercel stops a request at 300 s). */
const TIME_BUDGET_MS = 260_000;

/** Imports a file: rows with problems are skipped, every other row is created or updated. */
export async function runImport(text: string, user: Actor, ownOrigins: string[]): Promise<ImportResult | { ok: false; error: string }> {
  const started = Date.now();
  const prepared = await prepareImport(text, ownOrigins);
  if (!prepared.ok) return prepared;
  const { rows, index } = prepared;
  const downloads = new Map<string, Promise<string>>();
  const results: ImportResultRow[] = [];
  let changedAnything = false;

  for (const row of rows) {
    const base = { line: row.line, sku: row.sku, name: row.values.name };
    if (row.errors.length) {
      results.push({ ...base, outcome: "failed", productId: row.existingId, message: row.errors.join(" "), warnings: [] });
      continue;
    }
    if (Date.now() - started > TIME_BUDGET_MS) {
      results.push({
        ...base,
        outcome: "failed",
        productId: row.existingId,
        message: "Not imported: the import ran out of time. Import the same file again to finish (finished rows just show as unchanged).",
        warnings: [],
      });
      continue;
    }
    const warnings: string[] = [];
    try {
      const idFor = async (t: CategoryTarget) => ("id" in t ? t.id : index.create(t.create, user));
      const primaryId = row.primary ? await idFor(row.primary) : undefined;
      const extraIds = row.extras ? await Promise.all(row.extras.map(idFor)) : undefined;
      const images = row.images
        ? (
            await Promise.all(
              row.images.map(async (img) => {
                if ("stored" in img) return img.stored;
                let pending = downloads.get(img.remote);
                if (!pending) downloads.set(img.remote, (pending = storeRemoteImage(img.remote, user)));
                try {
                  return await pending;
                } catch (error) {
                  const reason = error instanceof UploadError ? error.message : "it couldn't be stored";
                  warnings.push(`Image ${clip(img.remote)} was skipped: ${reason}.`);
                  return null;
                }
              }),
            )
          ).filter((url): url is string => url !== null)
        : undefined;

      const values = finalValues(row, index.options, primaryId, extraIds, images);
      const saved = await saveProduct(user, row.existingId, values, { options: index.options, bump: false, source: "spreadsheet import" });
      if (!saved.ok) {
        const details = describeErrors(saved.fieldErrors);
        results.push({ ...base, outcome: "failed", productId: row.existingId, message: details.length ? details.join(" ") : saved.message, warnings });
        continue;
      }
      const outcome: ImportOutcome = !row.existingId ? "created" : saved.message === NO_CHANGES ? "unchanged" : "updated";
      if (outcome !== "unchanged") changedAnything = true;
      results.push({ ...base, outcome, productId: saved.data.id, message: null, warnings });
    } catch (error) {
      console.error(`[import] row ${row.line} (${row.sku}) failed`, error);
      results.push({ ...base, outcome: "failed", productId: row.existingId, message: "This row couldn't be saved because of a server error. Try again.", warnings });
    }
  }

  const counts: Record<ImportOutcome, number> = { created: 0, updated: 0, unchanged: 0, failed: 0 };
  for (const r of results) counts[r.outcome]++;
  if (changedAnything || index.createdPaths.length) await bumpCatalogVersion();
  await logActivity(user, "product.import", "product", null, { ...counts, rows: results.length, categoriesCreated: index.createdPaths });
  return { ok: true, kind: "result", rows: results, newCategories: index.createdPaths, counts };
}

// ---------- export & template ----------

const money = (v: number | null) => (v === null ? "" : v.toFixed(2));
const yesNo = (v: boolean) => (v ? "yes" : "no");

/** Every single product (not kits) in the import's columns, so the file can be edited and imported back. */
export async function exportProductsCsv(): Promise<{ csv: string; count: number }> {
  const products = await db.products.find({ kit: null }).sort({ name: 1 }).toArray();
  const ids = products.map((p) => p.id);
  const [categoryRows, images, listings] = await Promise.all([
    loadCategoryRows(),
    db.productImages
      .find({ productId: { $in: ids } })
      .sort({ productId: 1, position: 1, _id: 1 })
      .project<{ productId: string; url: string }>({ _id: 0, productId: 1, url: 1 })
      .toArray(),
    db.productCategories
      .find({ productId: { $in: ids } })
      .project<{ productId: string; categoryId: number }>({ _id: 0, productId: 1, categoryId: 1 })
      .toArray(),
  ]);
  const options = buildCategoryOptions(categoryRows);
  const path = (id: number | null) => (id === null ? "" : (options.find((o) => o.id === id)?.path.join(" > ") ?? ""));
  const group = <T extends { productId: string }>(list: T[]) => {
    const map = new Map<string, T[]>();
    for (const item of list) {
      const items = map.get(item.productId);
      if (items) items.push(item);
      else map.set(item.productId, [item]);
    }
    return map;
  };
  const imagesOf = group(images);
  const categoriesOf = group(listings);

  const lines = products.map((p) => {
    const extras = extraCategoryIds(
      options,
      p.primaryCategoryId,
      (categoriesOf.get(p.id) ?? []).map((c) => c.categoryId),
    );
    const cells: Record<ImportColumnKey, string> = {
      sku: p.sku,
      name: p.name,
      price: money(p.price),
      compareAtPrice: money(p.compareAtPrice),
      costPrice: money(p.costPrice),
      status: p.status,
      availability: p.availability,
      stock: p.trackStock ? String(p.stock ?? 0) : "untracked",
      brand: p.brand ?? "",
      category: path(p.primaryCategoryId),
      extraCategories: extras.map(path).filter(Boolean).join(" | "),
      images: (imagesOf.get(p.id) ?? []).map((i) => i.url).join(" | "),
      shortDescription: p.shortDescription ?? "",
      description: p.description ?? "",
      specs: p.attributes.map((a) => `${a.name}: ${a.value}`).join("\n"),
      badge: p.badge ?? "",
      weightGrams: p.weightGrams === null ? "" : String(p.weightGrams),
      callForPrice: yesNo(p.isCallForPrice),
      contactSales: yesNo(p.isContactSales),
      slug: p.slug,
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
    };
    return IMPORT_COLUMNS.map((c) => cells[c.key]);
  });
  return { csv: toCsv([IMPORT_COLUMNS.map((c) => c.header), ...lines]), count: products.length };
}

/** The template: the header row and two example products (as drafts, so a test import doesn't put them on sale). */
export function templateCsv(): string {
  const examples: Cells[] = [
    {
      sku: "EXAMPLE-CAM-4MP",
      name: "Example 4MP Turret Camera (White)",
      price: "49.99",
      compareAtPrice: "59.99",
      costPrice: "31.50",
      status: "draft",
      availability: "in_stock",
      stock: "25",
      brand: "Example Brand",
      category: "Cameras > IP Cameras",
      images: "https://example.com/images/turret-front.jpg | https://example.com/images/turret-side.jpg",
      shortDescription: "Compact 4MP turret camera with 30 m night vision.",
      description: "## Overview\nA weatherproof 4MP turret camera for homes and small businesses.\n\n- 30 m infrared night vision\n- IP67 weatherproof housing",
      specs: "Resolution: 4MP\nLens: 2.8 mm\nNight vision: 30 m",
      badge: "New",
      weightGrams: "350",
      callForPrice: "no",
      contactSales: "no",
    },
    {
      sku: "EXAMPLE-HDMI-2M",
      name: "Example HDMI Cable 2 m",
      price: "6.50",
      status: "draft",
      availability: "in_stock",
      stock: "untracked",
      brand: "Example Brand",
      category: "Cables > HDMI Cables",
      specs: "Length: 2 m | Connectors: HDMI A to HDMI A",
      callForPrice: "no",
      contactSales: "no",
    },
  ];
  return toCsv([IMPORT_COLUMNS.map((c) => c.header), ...examples.map((e) => IMPORT_COLUMNS.map((c) => e[c.key] ?? ""))]);
}
