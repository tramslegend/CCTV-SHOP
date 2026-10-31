// Discount codes on the server: looking a code up for checkout, counting uses when an order is paid, and the
// back-office roll-ups. Server-only. Pricing rules live in ./rules.ts and src/lib/orders/pricing.ts.
//
// A use is counted when an order is marked paid (never for unpaid or cancelled checkouts), with an atomic
// conditional increment so `uses` can't pass `max_uses`; a payment that arrives after the limit was reached is still
// honoured and flagged on the order. "One use per customer" is kept in the settings collection (key
// "discounts.oncePerCustomer", a list of code ids) and checked against paid orders with the code and the same email.
import type { ClientSession } from "mongodb";
import { CI, db, escapeRegex, stripId } from "@/db";
import type { DiscountCodeRow, OrderRow } from "@/db/schema";
import { checkCode, normaliseCode, type CheckableCode, type CodeCheck } from "./rules";

export type { DiscountCodeRow } from "@/db/schema";

export const ONCE_PER_CUSTOMER_KEY = "discounts.oncePerCustomer";

/** Ids of the codes limited to one paid order per customer email. */
export async function oncePerCustomerIds(): Promise<Set<number>> {
  const row = await db.settings.findOne({ _id: ONCE_PER_CUSTOMER_KEY });
  const ids = (row?.value as { codeIds?: unknown } | undefined)?.codeIds;
  return new Set(Array.isArray(ids) ? ids.filter((n): n is number => Number.isInteger(n)) : []);
}

/**
 * Turns "one use per customer" on or off for a code (inside the caller's transaction). Two transactions changing
 * the list at once conflict on the settings document, and the later one is retried with the fresh list.
 */
export async function setOncePerCustomer(session: ClientSession, codeId: number, on: boolean) {
  const row = await db.settings.findOne({ _id: ONCE_PER_CUSTOMER_KEY }, { session });
  const current = (row?.value as { codeIds?: unknown } | undefined)?.codeIds;
  const ids = new Set(Array.isArray(current) ? current.filter((n): n is number => Number.isInteger(n)) : []);
  if (on === ids.has(codeId)) return;
  if (on) ids.add(codeId);
  else ids.delete(codeId);
  const value = { codeIds: [...ids].sort((a, b) => a - b) };
  await db.settings.updateOne(
    { _id: ONCE_PER_CUSTOMER_KEY },
    { $set: { value, updatedAt: new Date() }, $setOnInsert: { key: ONCE_PER_CUSTOMER_KEY } },
    { upsert: true, session },
  );
}

export async function findCodeByText(code: string): Promise<DiscountCodeRow | undefined> {
  const text = normaliseCode(code);
  if (!text || text.length > 40) return undefined;
  // Codes are unique regardless of case (case-insensitive unique index).
  const row = await db.discountCodes.findOne({ code: text }, { collation: CI });
  return row ? stripId(row) : undefined;
}

/** Whole-value, case-insensitive match (the old `upper(x) = upper(y)` / `lower(x) = lower(y)`). */
const sameText = (text: string) => new RegExp(`^${escapeRegex(text)}$`, "i");

const codeMatch = (code: string) => ({ discountCode: sameText(normaliseCode(code)) });

/** Paid orders with this code from this email (optionally leaving one order out). */
export async function paidUsesByEmail(code: string, email: string, exceptOrderId?: number) {
  return db.orders.countDocuments({
    ...codeMatch(code),
    paidAt: { $ne: null },
    email: sameText(email.trim().toLowerCase()),
    ...(exceptOrderId ? { _id: { $ne: exceptOrderId } } : {}),
  });
}

const toCheckable = (row: DiscountCodeRow, once: boolean): CheckableCode => ({
  code: row.code,
  type: row.type,
  value: row.value,
  minSpend: row.minSpend,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  maxUses: row.maxUses,
  uses: row.uses,
  active: row.active,
  oncePerCustomer: once,
});

/**
 * Checks a typed code against a basket's figures (items and delivery inc VAT, before any discount). The email is
 * only needed for one-per-customer codes; without one that rule is checked again when the order is placed.
 */
export async function resolveCode(
  code: string,
  basket: { itemsIncVat: number; deliveryIncVat: number; email?: string | null },
): Promise<CodeCheck> {
  const row = await findCodeByText(code);
  if (!row) return checkCode(null, { ...basket, usesByEmail: 0 });
  const once = (await oncePerCustomerIds()).has(row.id);
  const usesByEmail = once && basket.email ? await paidUsesByEmail(row.code, basket.email) : 0;
  return checkCode(toCheckable(row, once), { ...basket, usesByEmail });
}

export type UseResult =
  | { counted: true; uses: number; maxUses: number | null; repeatCustomer: boolean }
  | { counted: false; reason: "missing" | "limit"; maxUses: number | null };

/**
 * Counts one use of a paid order's code: `uses + 1` only while it is under `max_uses`, in a single conditional
 * update, so concurrent payments can't push it past the limit. Callers record the outcome on the order's timeline.
 */
export async function recordDiscountUse(order: { id: number; email: string; discountCode: string | null }): Promise<UseResult | null> {
  if (!order.discountCode) return null;
  const code = normaliseCode(order.discountCode);
  const row = await db.discountCodes.findOneAndUpdate(
    { code, $or: [{ maxUses: null }, { $expr: { $lt: ["$uses", "$maxUses"] } }] },
    { $inc: { uses: 1 }, $set: { updatedAt: new Date() } },
    { collation: CI, returnDocument: "after", projection: { id: 1, uses: 1, maxUses: 1 } },
  );
  if (!row) {
    const existing = await findCodeByText(code);
    return { counted: false, reason: existing ? "limit" : "missing", maxUses: existing?.maxUses ?? null };
  }
  const once = (await oncePerCustomerIds()).has(row.id);
  const repeatCustomer = once && (await paidUsesByEmail(code, order.email, order.id)) > 0;
  return { counted: true, uses: row.uses, maxUses: row.maxUses, repeatCustomer };
}

// ---------- back office ----------

export interface CodeStats {
  /** Paid orders with the code. */
  orders: number;
  /** Discount given on those orders, inc VAT. */
  discountGiven: number;
  /** What those orders took, inc VAT. */
  revenue: number;
  /** Unpaid checkouts holding the code (awaiting payment). */
  pending: number;
}

const EMPTY_STATS: CodeStats = { orders: 0, discountGiven: 0, revenue: 0, pending: 0 };

/** Sums of money are added up in floating point: back to whole pence, as the exact database sums were. */
const pence = (n: number) => Math.round(n * 100) / 100;

/** Order roll-ups per code (upper-cased code → stats). */
async function statsByCode(codes?: string[]) {
  const isPaid = { $ne: [{ $ifNull: ["$paidAt", null] }, null] };
  const rows = await db.orders
    .aggregate<CodeStats & { _id: string }>([
      { $match: { discountCode: codes?.length ? { $in: codes.map((c) => sameText(normaliseCode(c))) } : { $ne: null } } },
      {
        $group: {
          _id: { $toUpper: "$discountCode" },
          orders: { $sum: { $cond: [isPaid, 1, 0] } },
          discountGiven: { $sum: { $cond: [isPaid, "$discount", 0] } },
          revenue: { $sum: { $cond: [isPaid, "$total", 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending_payment"] }, 1, 0] } },
        },
      },
    ])
    .toArray();
  return new Map(
    rows.map((r) => [r._id, { orders: r.orders, discountGiven: pence(r.discountGiven), revenue: pence(r.revenue), pending: r.pending }]),
  );
}

export interface AdminCode extends DiscountCodeRow {
  oncePerCustomer: boolean;
  stats: CodeStats;
}

/** Every code (newest first) with its order roll-ups. */
export async function listCodesWithStats(): Promise<AdminCode[]> {
  const [rows, once, stats] = await Promise.all([
    db.discountCodes.find().sort({ createdAt: -1, _id: -1 }).limit(1000).toArray(),
    oncePerCustomerIds(),
    statsByCode(),
  ]);
  return rows.map((r) => ({ ...stripId(r), oncePerCustomer: once.has(r.id), stats: stats.get(r.code.toUpperCase()) ?? EMPTY_STATS }));
}

export async function getCodeWithStats(id: number): Promise<AdminCode | undefined> {
  if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) return undefined;
  const doc = await db.discountCodes.findOne({ _id: id });
  if (!doc) return undefined;
  const row = stripId(doc);
  const [once, stats] = await Promise.all([oncePerCustomerIds(), statsByCode([row.code])]);
  return { ...row, oncePerCustomer: once.has(row.id), stats: stats.get(row.code.toUpperCase()) ?? EMPTY_STATS };
}

/** Latest orders placed with a code (any status), for its page in the back office. */
export async function ordersWithCode(code: string, limit = 25) {
  const rows = await db.orders
    .find(codeMatch(code), {
      projection: { id: 1, number: 1, status: 1, email: 1, shippingAddress: 1, discount: 1, total: 1, createdAt: 1, paidAt: 1 },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return rows.map(
    (o): Pick<OrderRow, "id" | "number" | "status" | "email" | "shippingAddress" | "discount" | "total" | "createdAt" | "paidAt"> => ({
      id: o.id,
      number: o.number,
      status: o.status,
      email: o.email,
      shippingAddress: o.shippingAddress,
      discount: o.discount,
      total: o.total,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
    }),
  );
}

/** Orders that stop a code being deleted or renamed: paid ones, and checkouts still awaiting payment. */
export async function blockingOrders(code: string) {
  return db.orders.countDocuments({ ...codeMatch(code), $or: [{ paidAt: { $ne: null } }, { status: "pending_payment" }] });
}
