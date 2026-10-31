// Database client (MongoDB). Production: MongoDB Atlas (MONGODB_URI from the Vercel integration).
// Local development: `npm run db:local` runs a one-member replica set on port 27017 (see scripts/mongo-local.mjs).
//
// Conventions (they keep the rest of the code and every id in URLs exactly as with the old Postgres database):
// - One collection per former table, same field names. Every document's `_id` equals its `id` (numbers for
//   auto-numbered collections, strings for products and auth); join documents use "<a>:<b>"; settings use the key.
// - Insert through `insert()`, which assigns ids, fills defaults (null for empty optional fields, never missing) and
//   timestamps. Updates set `updatedAt: new Date()` themselves (see `stamp()`).
// - Multi-step writes run in `transaction()`; pass `{ session }` to every call inside it.
// - Postgres used ON DELETE CASCADE / SET NULL: use `removeProducts()`, `removeCategories()`, `removeOrders()`.
// - Case-insensitive matching (SKUs, discount codes): `{ collation: CI }`; text search: `contains()`.
import { type ClientSession, type Collection, MongoClient } from "mongodb";
import type * as S from "./schema";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set. Locally, run `npm run db:local` and see .env.example.");

// Reuse one client across hot reloads in development.
const globalForDb = globalThis as unknown as { mongoClient?: MongoClient };
export const client =
  globalForDb.mongoClient ??
  new MongoClient(uri, {
    // Builds prerender in many parallel workers: few connections each keeps the total within the server's limit.
    maxPoolSize: process.env.NEXT_PHASE === "phase-production-build" ? 2 : process.env.NODE_ENV === "production" ? 10 : 5,
    // Like the old ORM: an undefined value in an update leaves the field alone.
    ignoreUndefined: true,
  });
if (process.env.NODE_ENV !== "production") globalForDb.mongoClient = client;

const database = client.db(process.env.MONGODB_DB || "shop");

/** A stored document: the row plus `_id` (equal to its id). */
export type Doc<T, Id = T extends { id: infer I } ? I : string> = T & { _id: Id };

const collection = <T, Id = T extends { id: infer I } ? I : string>(name: string) => database.collection<Doc<T, Id>>(name);

const collections = {
  categories: collection<S.CategoryRow>("categories"),
  products: collection<S.ProductRow>("products"),
  productImages: collection<S.ProductImageRow>("product_images"),
  productCategories: collection<S.ProductCategoryRow, string>("product_categories"),
  productRelated: collection<S.ProductRelatedRow, string>("product_related"),
  kitComponents: collection<S.KitComponentRow>("kit_components"),
  blogPosts: collection<S.BlogPostRow>("blog_posts"),
  pages: collection<S.PageRow>("pages"),
  settings: collection<S.SettingRow, string>("settings"),
  media: collection<S.MediaRow>("media"),
  orders: collection<S.OrderRow>("orders"),
  orderItems: collection<S.OrderItemRow>("order_items"),
  orderEvents: collection<S.OrderEventRow>("order_events"),
  discountCodes: collection<S.DiscountCodeRow>("discount_codes"),
  enquiries: collection<S.EnquiryRow>("enquiries"),
  reviews: collection<S.ReviewRow>("reviews"),
  auditLog: collection<S.AuditLogRow>("audit_log"),
  catalogState: collection<S.CatalogStateRow>("catalog_state"),
  users: collection<S.UserRow>("users"),
  sessions: collection<S.SessionRow>("sessions"),
  accounts: collection<S.AccountRow>("accounts"),
  verifications: collection<S.VerificationRow>("verifications"),
  addresses: collection<S.AddressRow>("addresses"),
};

type Collections = typeof collections;
export type TableName = keyof Collections;
/** The row type stored in each collection. */
interface Rows {
  categories: S.CategoryRow;
  products: S.ProductRow;
  productImages: S.ProductImageRow;
  productCategories: S.ProductCategoryRow;
  productRelated: S.ProductRelatedRow;
  kitComponents: S.KitComponentRow;
  blogPosts: S.BlogPostRow;
  pages: S.PageRow;
  settings: S.SettingRow;
  media: S.MediaRow;
  orders: S.OrderRow;
  orderItems: S.OrderItemRow;
  orderEvents: S.OrderEventRow;
  discountCodes: S.DiscountCodeRow;
  enquiries: S.EnquiryRow;
  reviews: S.ReviewRow;
  auditLog: S.AuditLogRow;
  catalogState: S.CatalogStateRow;
  users: S.UserRow;
  sessions: S.SessionRow;
  accounts: S.AccountRow;
  verifications: S.VerificationRow;
  addresses: S.AddressRow;
}
export type RowOf<N extends TableName> = Rows[N];

export const db = { ...collections, raw: database, client, counters: database.collection<{ _id: string; seq: number }>("counters") };
export type Db = typeof db;

// ---------- ids ----------

/** Collections whose ids are numbers handed out by a counter (the old serial columns). */
const AUTO_ID = new Set<TableName>([
  "categories",
  "productImages",
  "kitComponents",
  "blogPosts",
  "pages",
  "media",
  "orders",
  "orderItems",
  "orderEvents",
  "discountCodes",
  "enquiries",
  "reviews",
  "auditLog",
  "addresses",
]);

/**
 * Reserves `count` consecutive numbers from a counter and returns the first. Counters aren't part of transactions
 * (like Postgres sequences): a rolled-back insert leaves a gap, never a duplicate.
 */
export async function reserveIds(counter: string, count = 1, start = 1): Promise<number> {
  const doc = await db.counters.findOneAndUpdate(
    { _id: counter },
    [{ $set: { seq: { $add: [{ $ifNull: ["$seq", start - 1] }, count] } } }],
    { upsert: true, returnDocument: "after" },
  );
  if (!doc) throw new Error(`Counter ${counter} couldn't be updated`);
  return doc.seq - count + 1;
}

/** Next order number, e.g. "SO-100001". */
export async function nextOrderNumber(): Promise<string> {
  return `SO-${await reserveIds("order_number", 1, 100001)}`;
}

/** `_id` for a document of `name`. */
function idFor(name: TableName, row: Record<string, unknown>): unknown {
  if (name === "productCategories") return `${row.productId}:${row.categoryId}`;
  if (name === "productRelated") return `${row.productId}:${row.relatedId}`;
  if (name === "settings") return row.key;
  return row.id;
}

// ---------- defaults (what Postgres filled in for columns left out of an insert) ----------

const DEFAULTS: Partial<Record<TableName, Record<string, unknown>>> = {
  categories: { parentId: null, title: null, metaDescription: null, description: null, imageUrl: null, position: 0, isKitRange: false, kitFilter: null, visible: true },
  products: {
    brand: null,
    status: "active",
    compareAtPrice: null,
    costPrice: null,
    availability: "in_stock",
    stock: null,
    trackStock: false,
    isContactSales: false,
    isCallForPrice: false,
    badge: null,
    shortDescription: null,
    description: null,
    attributes: [],
    partNumbers: null,
    primaryCategoryId: null,
    listing: null,
    kit: null,
    guides: [],
    seoTitle: null,
    seoDescription: null,
    weightGrams: null,
  },
  productImages: { alt: null, position: 0 },
  productCategories: { position: 0 },
  productRelated: { position: 0 },
  kitComponents: { componentId: null, sku: null, role: "other", qty: 1, imageUrl: null, position: 0 },
  blogPosts: {
    excerpt: null,
    body: null,
    extras: null,
    coverImage: null,
    section: null,
    keywords: null,
    authorName: null,
    authorTitle: null,
    authorImage: null,
    status: "active",
    listed: true,
    position: 0,
    wordCount: null,
    publishedAt: null,
    modifiedAt: null,
  },
  pages: { intro: null, metaDescription: null, blocks: [], status: "active" },
  media: { pathname: null, alt: null, contentType: null, size: null, width: null, height: null, uploadedBy: null },
  orders: {
    userId: null,
    phone: null,
    status: "pending_payment",
    paymentProvider: null,
    paymentRef: null,
    deliveryFee: 0,
    discount: 0,
    currency: "GBP",
    discountCode: null,
    deliveryMethod: null,
    billingAddress: null,
    customerNote: null,
    internalNote: null,
    carrier: null,
    trackingNumber: null,
    paidAt: null,
    dispatchedAt: null,
    vatRate: null,
    refundedAmount: 0,
    deliveredAt: null,
  },
  orderItems: { productId: null, slug: null, sku: null, imageUrl: null },
  orderEvents: { message: null, actorId: null },
  discountCodes: { value: 0, minSpend: null, startsAt: null, endsAt: null, maxUses: null, uses: 0, active: true },
  enquiries: { status: "new", phone: null, company: null, subject: null, message: null, productSlug: null, details: null, assignedTo: null },
  reviews: { userId: null, orderId: null, title: null, body: null, status: "pending" },
  auditLog: { actorId: null, actorEmail: null, entityId: null, changes: null },
  addresses: { label: null, company: null, line2: null, county: null, phone: null, isDefault: false },
};

const CREATED_AT_ONLY = new Set<TableName>(["media", "orderEvents", "auditLog"]);
const UPDATED_AT_ONLY = new Set<TableName>(["settings", "catalogState"]);
const NO_TIMESTAMPS = new Set<TableName>(["productImages", "productCategories", "productRelated", "kitComponents", "orderItems"]);

/** A new row: what the old schema required, the rest optional (filled from the defaults above). */
export type NewRow<N extends TableName> = Partial<RowOf<N>>;

/**
 * Inserts rows the way Postgres did: auto-numbered ids for the old serial tables, defaults for omitted columns
 * (null for optional ones, so `x === null` checks behave), createdAt/updatedAt set to now. Returns the full rows.
 */
export async function insert<N extends TableName>(name: N, input: NewRow<N> | NewRow<N>[], opts: { session?: ClientSession } = {}): Promise<RowOf<N>[]> {
  const list = (Array.isArray(input) ? input : [input]) as Record<string, unknown>[];
  if (!list.length) return [];
  const now = new Date();
  const needIds = AUTO_ID.has(name) ? list.filter((r) => r.id === undefined || r.id === null).length : 0;
  let nextId = needIds ? await reserveIds(name, needIds) : 0;
  const docs = list.map((row) => {
    const doc: Record<string, unknown> = { ...DEFAULTS[name], ...Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined)) };
    if (AUTO_ID.has(name) && (doc.id === undefined || doc.id === null)) doc.id = nextId++;
    if (!NO_TIMESTAMPS.has(name)) {
      if (!UPDATED_AT_ONLY.has(name)) doc.createdAt ??= now;
      if (!CREATED_AT_ONLY.has(name)) doc.updatedAt ??= now;
    }
    doc._id = idFor(name, doc);
    if (doc._id === undefined || doc._id === null) throw new Error(`insert(${name}): the row has no id`);
    return doc;
  });
  // Collections are typed per row; the documents above are built generically.
  await (db[name] as unknown as Collection<Record<string, unknown>>).insertMany(docs, { session: opts.session });
  return docs.map((doc) => stripId(doc)) as unknown as RowOf<N>[];
}

/** `$set` with updatedAt, for collections that have it. */
export const stamp = <T extends Record<string, unknown>>(set: T) => ({ ...set, updatedAt: new Date() });

/** Runs `fn` in a transaction (retried on transient conflicts, so `fn` must only touch the database). */
export async function transaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = client.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}

// ---------- matching ----------

/** Case-insensitive comparison (the unique SKU and discount-code indexes use it). */
export const CI = { locale: "en", strength: 2 } as const;

export const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Case-insensitive "contains" (the old ILIKE '%text%'). */
export const contains = (text: string) => ({ $regex: escapeRegex(text), $options: "i" });

/** Documents → rows without `_id` (for values handed to client components or compared as plain rows). */
export function stripId<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const row = { ...doc };
  delete row._id;
  return row;
}

// ---------- what ON DELETE CASCADE / SET NULL did ----------

/** Deletes products and everything that hangs off them (images, listings, related links, kit parts, reviews). */
export async function removeProducts(ids: string[], session?: ClientSession) {
  if (!ids.length) return;
  const o = { session };
  // One at a time: a transaction's operations can't run in parallel.
  await db.productImages.deleteMany({ productId: { $in: ids } }, o);
  await db.productCategories.deleteMany({ productId: { $in: ids } }, o);
  await db.productRelated.deleteMany({ $or: [{ productId: { $in: ids } }, { relatedId: { $in: ids } }] }, o);
  await db.kitComponents.deleteMany({ kitId: { $in: ids } }, o);
  await db.kitComponents.updateMany({ componentId: { $in: ids } }, { $set: { componentId: null } }, o);
  await db.orderItems.updateMany({ productId: { $in: ids } }, { $set: { productId: null } }, o);
  await db.reviews.deleteMany({ productId: { $in: ids } }, o);
  await db.products.deleteMany({ _id: { $in: ids } }, o);
}

/** Deletes categories: their listings go, sub-categories move to the top level, products lose them as primary. */
export async function removeCategories(ids: number[], session?: ClientSession) {
  if (!ids.length) return;
  const o = { session };
  // One at a time: a transaction's operations can't run in parallel.
  await db.productCategories.deleteMany({ categoryId: { $in: ids } }, o);
  await db.categories.updateMany({ parentId: { $in: ids } }, { $set: { parentId: null } }, o);
  await db.products.updateMany({ primaryCategoryId: { $in: ids } }, { $set: { primaryCategoryId: null } }, o);
  await db.categories.deleteMany({ _id: { $in: ids } }, o);
}

/** Deletes orders with their items and timeline; reviews keep their text but lose the order link. */
export async function removeOrders(ids: number[], session?: ClientSession) {
  if (!ids.length) return;
  const o = { session };
  // One at a time: a transaction's operations can't run in parallel.
  await db.orderItems.deleteMany({ orderId: { $in: ids } }, o);
  await db.orderEvents.deleteMany({ orderId: { $in: ids } }, o);
  await db.reviews.updateMany({ orderId: { $in: ids } }, { $set: { orderId: null } }, o);
  await db.orders.deleteMany({ _id: { $in: ids } }, o);
}

/** Removes a customer's own records (addresses); Better Auth removes the account, sessions and logins. */
export async function removeUserData(userId: string, session?: ClientSession) {
  await db.addresses.deleteMany({ userId }, { session });
}

// ---------- indexes ----------

/** Creates every index (unique rules included). Safe to run again; `npm run db:setup` and the migration call it. */
export async function ensureIndexes() {
  await Promise.all([
    db.categories.createIndexes([{ key: { slug: 1 }, unique: true }, { key: { parentId: 1 } }]),
    db.products.createIndexes([
      { key: { slug: 1 }, unique: true },
      // SKUs are unique regardless of case ("abc-1" and "ABC-1" are the same part).
      { key: { sku: 1 }, unique: true, collation: CI, name: "sku_ci_unique" },
      { key: { status: 1 } },
      { key: { primaryCategoryId: 1 } },
      // Kits in the same family (same recorder, different camera count/storage) are updated together.
      { key: { "kit.family": 1 } },
    ]),
    db.productImages.createIndexes([{ key: { productId: 1, position: 1 } }]),
    db.productCategories.createIndexes([{ key: { categoryId: 1, position: 1 } }, { key: { productId: 1 } }]),
    db.productRelated.createIndexes([{ key: { productId: 1, position: 1 } }, { key: { relatedId: 1 } }]),
    db.kitComponents.createIndexes([{ key: { kitId: 1, position: 1 } }, { key: { componentId: 1 } }]),
    db.blogPosts.createIndexes([{ key: { slug: 1 }, unique: true }, { key: { publishedAt: 1 } }]),
    db.pages.createIndexes([{ key: { slug: 1 }, unique: true }]),
    db.media.createIndexes([{ key: { url: 1 }, unique: true }, { key: { createdAt: -1 } }]),
    db.orders.createIndexes([
      { key: { number: 1 }, unique: true },
      { key: { userId: 1 } },
      { key: { email: 1 } },
      { key: { status: 1, createdAt: -1 } },
      { key: { createdAt: -1 } },
    ]),
    db.orderItems.createIndexes([{ key: { orderId: 1 } }, { key: { productId: 1 } }]),
    db.orderEvents.createIndexes([{ key: { orderId: 1, createdAt: 1 } }]),
    db.discountCodes.createIndexes([{ key: { code: 1 }, unique: true, collation: CI, name: "code_ci_unique" }]),
    db.enquiries.createIndexes([{ key: { status: 1, createdAt: -1 } }, { key: { createdAt: -1 } }]),
    db.reviews.createIndexes([{ key: { productId: 1, status: 1 } }]),
    db.auditLog.createIndexes([{ key: { entity: 1, entityId: 1 } }, { key: { createdAt: -1 } }]),
    db.users.createIndexes([{ key: { email: 1 }, unique: true }]),
    db.sessions.createIndexes([{ key: { token: 1 }, unique: true }, { key: { userId: 1 } }]),
    db.accounts.createIndexes([{ key: { userId: 1 } }]),
    db.verifications.createIndexes([{ key: { identifier: 1 } }]),
    db.addresses.createIndexes([{ key: { userId: 1 } }]),
  ]);
}
