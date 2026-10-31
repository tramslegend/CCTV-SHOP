// Read side of the admin Messages inbox. Server-only; callers must have passed requireAdmin("messages").
import type { Filter } from "mongodb";
import { contains, type Doc, db, stripId } from "@/db";
import type { EnquiryRow } from "@/db/schema";
import { CONTACT_SUBJECTS } from "@/components/sites/cctvmaster/content/store-facts";
import { ENQUIRY_STATUSES, ENQUIRY_TYPES, type EnquiryNote, type EnquirySource, type EnquiryStatus, type EnquiryType } from "./types";

export const INBOX_PAGE_SIZE = 25;

export type StatusFilter = EnquiryStatus | "all";

export interface InboxFilters {
  status: StatusFilter;
  type: EnquiryType | "";
  q: string;
  page: number;
}

/** Reads the inbox filters from the URL, ignoring anything unexpected. */
export function parseInboxFilters(sp: Record<string, string | string[] | undefined>): InboxFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const status = one(sp.status);
  const type = one(sp.type);
  return {
    status: (ENQUIRY_STATUSES as readonly string[]).includes(status) ? (status as EnquiryStatus) : "all",
    type: (ENQUIRY_TYPES as readonly string[]).includes(type) ? (type as EnquiryType) : "",
    q: one(sp.q).trim().slice(0, 200),
    page: Math.max(1, Math.floor(Number(one(sp.page))) || 1),
  };
}

type EnquiryFilter = Filter<Doc<EnquiryRow>>;

/** Products linked to enquiries by slug (the old left join), keyed by slug. */
async function productsBySlug(slugs: (string | null)[]) {
  const wanted = [...new Set(slugs.filter((slug): slug is string => slug !== null))];
  if (!wanted.length) return new Map<string, { id: string; name: string }>();
  const products = await db.products.find({ slug: { $in: wanted } }, { projection: { slug: 1, name: 1 } }).toArray();
  return new Map(products.map((p) => [p.slug, { id: p._id, name: p.name }]));
}

export async function listEnquiries(f: InboxFilters) {
  const base: EnquiryFilter[] = [];
  if (f.type) base.push({ type: f.type });
  if (f.q) {
    // Matched literally, case-insensitively ("100%" is just text).
    const like = contains(f.q);
    base.push({ $or: [{ name: like }, { email: like }, { company: like }, { phone: like }, { subject: like }, { message: like }] });
  }
  const and = (filters: EnquiryFilter[]): EnquiryFilter => (filters.length ? { $and: filters } : {});
  const where = and([...base, ...(f.status === "all" ? [] : [{ status: f.status }])]);

  const [rows, n, byStatus, unread] = await Promise.all([
    (async () => {
      const found = await db.enquiries
        .find(where, {
          projection: { type: 1, status: 1, name: 1, email: 1, company: 1, subject: 1, message: 1, productSlug: 1, createdAt: 1 },
        })
        .sort({ createdAt: -1, _id: -1 })
        .skip((f.page - 1) * INBOX_PAGE_SIZE)
        .limit(INBOX_PAGE_SIZE)
        .toArray();
      const products = await productsBySlug(found.map((r) => r.productSlug));
      return found.map((r) => {
        const product = r.productSlug === null ? undefined : products.get(r.productSlug);
        return {
          id: r._id,
          type: r.type,
          status: r.status,
          name: r.name,
          email: r.email,
          company: r.company,
          subject: r.subject,
          message: r.message,
          productSlug: r.productSlug,
          createdAt: r.createdAt,
          productId: product?.id ?? null,
          productName: product?.name ?? null,
        };
      });
    })(),
    db.enquiries.countDocuments(where),
    db.enquiries
      .aggregate<{ _id: EnquiryStatus; n: number }>([{ $match: and(base) }, { $group: { _id: "$status", n: { $sum: 1 } } }])
      .toArray(),
    db.enquiries.countDocuments({ status: "new" }),
  ]);

  const counts: Record<StatusFilter, number> = { new: 0, open: 0, closed: 0, all: 0 };
  for (const row of byStatus) {
    counts[row._id] = row.n;
    counts.all += row.n;
  }
  return { rows, total: n, counts, unread };
}

export async function getEnquiry(id: number) {
  const enquiry = await db.enquiries.findOne({ _id: id });
  if (!enquiry) return undefined;
  const product =
    enquiry.productSlug === null
      ? null
      : await db.products.findOne({ slug: enquiry.productSlug }, { projection: { name: 1, sku: 1, slug: 1, status: 1 } });
  return {
    enquiry: stripId(enquiry),
    product: product && { id: product._id, name: product.name, sku: product.sku, slug: product.slug, status: product.status },
  };
}

/** Back-office changes to one enquiry, newest first. */
export function enquiryHistory(id: number) {
  return db.auditLog
    .find({ entity: "enquiry", entityId: String(id) })
    .sort({ createdAt: -1, _id: -1 })
    .limit(30)
    .toArray();
}

export function readNotes(details: Record<string, unknown> | null): EnquiryNote[] {
  const notes = details?.notes;
  if (!Array.isArray(notes)) return [];
  return notes.filter(
    (n): n is EnquiryNote =>
      !!n && typeof n === "object" && typeof (n as EnquiryNote).text === "string" && typeof (n as EnquiryNote).at === "string",
  );
}

export function readSource(details: Record<string, unknown> | null): EnquirySource {
  const source = details?.source;
  return source && typeof source === "object" ? (source as EnquirySource) : {};
}

/** Labels for known detail fields, in display order. */
const DETAIL_LABELS: Record<string, string> = {
  topic: "Topic",
  productName: "Product",
  sku: "SKU",
  quantity: "Quantity",
  businessType: "Business type",
  monthlySpend: "Monthly spend",
  vatNumber: "VAT number",
  businessUse: "Buys for business use",
};

const HIDDEN_DETAILS = new Set(["notes", "source"]);

const humanise = (key: string) => {
  const words = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const DETAIL_ORDER = Object.keys(DETAIL_LABELS);
const rank = (key: string) => (DETAIL_ORDER.includes(key) ? DETAIL_ORDER.indexOf(key) : DETAIL_ORDER.length);

/** Every customer-supplied detail as label/value pairs (internal notes and request metadata left out). */
export function detailRows(details: Record<string, unknown> | null): { key: string; label: string; value: string }[] {
  if (!details) return [];
  // jsonb doesn't keep key order, so known fields go first in a fixed order.
  return Object.entries(details)
    .filter(([key, value]) => !HIDDEN_DETAILS.has(key) && value !== null && value !== undefined && value !== "")
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([key, value]) => {
      let text: string;
      if (key === "topic" && typeof value === "string") text = CONTACT_SUBJECTS.find((t) => t.value === value)?.label ?? value;
      else if (typeof value === "boolean") text = value ? "Yes" : "No";
      else if (typeof value === "string" || typeof value === "number") text = String(value);
      else text = JSON.stringify(value);
      return { key, label: DETAIL_LABELS[key] ?? humanise(key), value: text };
    });
}
