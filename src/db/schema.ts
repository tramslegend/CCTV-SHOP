// Database document shapes (MongoDB). One collection per former Postgres table, with the same field names (camelCase)
// and the same ids, so ids in URLs and references keep working. Every document also carries `_id` equal to its id
// (see src/db/index.ts). Money is stored ex-VAT as a number of pounds; timestamps as Dates. Optional fields are always
// written, as null when empty, never left out: code tests `x === null`.
import type { Decide } from "@/lib/cctvmaster/types";

// ---------- enums ----------

export const PUBLISH_STATUSES = ["draft", "active", "archived"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];
export const AVAILABILITIES = ["in_stock", "backorder", "out_of_stock", "discontinued"] as const;
export type Availability = (typeof AVAILABILITIES)[number];
export const ORDER_STATUSES = ["pending_payment", "paid", "processing", "dispatched", "delivered", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const DISCOUNT_TYPES = ["percent", "fixed", "free_delivery"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];
export const ENQUIRY_TYPES = ["contact", "quote", "trade", "parts"] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];
export const ENQUIRY_STATUSES = ["new", "open", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** The single shop owner runs the back office; everyone else is a shop customer. */
export const userRole = ["owner", "customer"] as const;
export type UserRole = (typeof userRole)[number];

/** Order numbers are "SO-" + this counter (SO-100001, SO-100002…). */
export const ORDER_NUMBER_START = 100001;

interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

// ---------- catalogue ----------

export interface CategoryRow extends Timestamps {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
  /** Page heading; falls back to name. */
  title: string | null;
  metaDescription: string | null;
  /** Intro / buying-guide copy shown on the category page (markdown). */
  description: string | null;
  imageUrl: string | null;
  position: number;
  /** Kit ranges list kits by rule instead of by assignment. */
  isKitRange: boolean;
  /** For kit ranges: filter applied to kits, e.g. { system: "IP", cameras: 4 }. */
  kitFilter: Record<string, string | number> | null;
  visible: boolean;
}

export interface ProductRow extends Timestamps {
  id: string;
  slug: string;
  name: string;
  /** Unique regardless of case (case-insensitive unique index). */
  sku: string;
  brand: string | null;
  status: PublishStatus;
  /** Selling price ex-VAT. */
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  availability: Availability;
  stock: number | null;
  trackStock: boolean;
  isContactSales: boolean;
  isCallForPrice: boolean;
  badge: string | null;
  shortDescription: string | null;
  /** Product description (markdown). */
  description: string | null;
  attributes: { name: string; value: string; type?: string }[];
  partNumbers: Record<string, string> | null;
  primaryCategoryId: number | null;
  /** Listing-card summary: title line, chips and filter facets. */
  listing: Decide | null;
  /** Kit metadata (system, camera/channel counts, storage, bundle saving, family…); null for single products. */
  kit: Record<string, unknown> | null;
  /** Blog post slugs shown as "Helpful guides". */
  guides: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  weightGrams: number | null;
}

export interface ProductImageRow {
  id: number;
  productId: string;
  url: string;
  alt: string | null;
  position: number;
}

/** A product listed in a category. `_id` is "<productId>:<categoryId>". */
export interface ProductCategoryRow {
  productId: string;
  categoryId: number;
  position: number;
}

/** "Related products" of a product. `_id` is "<productId>:<relatedId>". */
export interface ProductRelatedRow {
  productId: string;
  relatedId: string;
  position: number;
}

export interface KitComponentRow {
  id: number;
  kitId: string;
  componentId: string | null;
  name: string;
  sku: string | null;
  role: string;
  qty: number;
  imageUrl: string | null;
  position: number;
}

// ---------- content ----------

export interface BlogPostRow extends Timestamps {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  /** Article body (markdown). */
  body: string | null;
  /** Structured extras: outline, FAQ, tags, sources, related links. */
  extras: Record<string, unknown> | null;
  coverImage: string | null;
  section: string | null;
  keywords: string | null;
  authorName: string | null;
  authorTitle: string | null;
  authorImage: string | null;
  status: PublishStatus;
  /** Listed on /blog (unlisted posts stay reachable by URL). */
  listed: boolean;
  position: number;
  wordCount: number | null;
  publishedAt: Date | null;
  /** Editorial "last updated" date shown on the post (distinct from updatedAt). */
  modifiedAt: Date | null;
}

/** Editable pages (about, delivery, returns, legal, FAQs…) as ordered content blocks. */
export interface PageRow extends Timestamps {
  id: number;
  slug: string;
  title: string;
  /** Lead paragraph under the page heading (hero text on pages that have a hero). */
  intro: string | null;
  metaDescription: string | null;
  blocks: Record<string, unknown>[];
  status: PublishStatus;
}

/** Store-wide settings: brand, contact details, delivery, VAT, navigation, homepage sections, SEO… `_id` is the key. */
export interface SettingRow {
  key: string;
  value: unknown;
  updatedAt: Date;
}

export interface MediaRow {
  id: number;
  /** Unique. */
  url: string;
  pathname: string | null;
  alt: string | null;
  contentType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  uploadedBy: string | null;
  createdAt: Date;
}

// ---------- orders & customers ----------

// Order money: subtotal = items ex VAT, deliveryFee = delivery ex VAT, vat = VAT on items and delivery,
// total = gross amount charged (inc. VAT). vatRate is the rate the order was priced at.
export interface OrderRow extends Timestamps {
  id: number;
  /** Unique, e.g. "SO-100001". */
  number: string;
  userId: string | null;
  email: string;
  phone: string | null;
  status: OrderStatus;
  paymentProvider: string | null;
  paymentRef: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  vat: number;
  total: number;
  currency: string;
  discountCode: string | null;
  deliveryMethod: string | null;
  shippingAddress: Record<string, string>;
  billingAddress: Record<string, string> | null;
  customerNote: string | null;
  internalNote: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  paidAt: Date | null;
  dispatchedAt: Date | null;
  vatRate: number | null;
  /** Amount refunded so far (inc. VAT). */
  refundedAmount: number;
  deliveredAt: Date | null;
}

export interface OrderItemRow {
  id: number;
  orderId: number;
  productId: string | null;
  slug: string | null;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  /** Unit price ex-VAT at the time of purchase. */
  unitPrice: number;
  qty: number;
}

/** Order timeline: status changes, notes, emails sent, refunds. */
export interface OrderEventRow {
  id: number;
  orderId: number;
  type: string;
  message: string | null;
  actorId: string | null;
  createdAt: Date;
}

export interface DiscountCodeRow extends Timestamps {
  id: number;
  /** Unique regardless of case. */
  code: string;
  type: DiscountType;
  value: number;
  minSpend: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  uses: number;
  active: boolean;
}

// ---------- customer messages & reviews ----------

export interface EnquiryRow extends Timestamps {
  id: number;
  type: EnquiryType;
  status: EnquiryStatus;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string | null;
  productSlug: string | null;
  details: Record<string, unknown> | null;
  assignedTo: string | null;
}

export interface ReviewRow extends Timestamps {
  id: number;
  productId: string;
  userId: string | null;
  orderId: number | null;
  name: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
}

// ---------- operations ----------

export interface AuditLogRow {
  id: number;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  createdAt: Date;
}

/** Single document (`_id` 1); the storefront reloads its catalogue snapshot whenever `version` changes. */
export interface CatalogStateRow {
  id: number;
  version: number;
  updatedAt: Date;
}

// ---------- auth (Better Auth documents; `_id` is the string id) ----------

export interface UserRow extends Timestamps {
  id: string;
  name: string;
  /** Unique. */
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: UserRole;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  phone: string | null;
  company: string | null;
}

export interface SessionRow extends Timestamps {
  id: string;
  token: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  impersonatedBy: string | null;
  userId: string;
}

export interface AccountRow extends Timestamps {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  password: string | null;
}

export interface VerificationRow extends Timestamps {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
}

// ---------- customer address book ----------

/** Saved delivery addresses for signed-in customers (pre-fill checkout). */
export interface AddressRow extends Timestamps {
  id: number;
  userId: string;
  /** Optional nickname, e.g. "Office". */
  label: string | null;
  name: string;
  company: string | null;
  line1: string;
  line2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  phone: string | null;
  isDefault: boolean;
}
