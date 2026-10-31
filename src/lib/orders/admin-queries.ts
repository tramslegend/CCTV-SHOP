// Back-office order and customer queries (list filters, CSV export, customer roll-ups). Server-only: callers must
// have passed requireAdmin().
import type { Filter } from "mongodb";
import { contains, db, type Doc, escapeRegex, stripId } from "@/db";
import type { OrderRow } from "@/db/schema";
import { ukDayBoundary } from "@/lib/discounts/rules";

export const ORDER_TABS = [
  { id: "all", label: "All paid" },
  { id: "to_fulfil", label: "To fulfil" },
  { id: "dispatched", label: "Dispatched" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "refunded", label: "Refunded" },
  { id: "unpaid", label: "Unpaid" },
] as const;
export type OrderTab = (typeof ORDER_TABS)[number]["id"];

export interface OrderFilters {
  tab: OrderTab;
  q: string;
  /** yyyy-mm-dd (UK dates, inclusive). */
  from: string;
  to: string;
  page: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseOrderFilters(sp: Record<string, string | string[] | undefined>): OrderFilters {
  const tab = one(sp.status);
  const from = one(sp.from);
  const to = one(sp.to);
  return {
    tab: (ORDER_TABS.some((t) => t.id === tab) ? tab : "all") as OrderTab,
    q: one(sp.q).trim().slice(0, 100),
    from: DATE_RE.test(from) ? from : "",
    to: DATE_RE.test(to) ? to : "",
    page: Math.max(1, Math.floor(Number(one(sp.page)) || 1)),
  };
}

export function filterQuery(f: Omit<OrderFilters, "page"> & { page?: number }) {
  const params = new URLSearchParams();
  if (f.tab !== "all") params.set("status", f.tab);
  if (f.q) params.set("q", f.q);
  if (f.from) params.set("from", f.from);
  if (f.to) params.set("to", f.to);
  if (f.page && f.page > 1) params.set("page", String(f.page));
  return params.toString();
}

type OrderFilter = Filter<Doc<OrderRow>>;

/** All of `conds` (an empty list matches everything). */
const allOf = (conds: OrderFilter[]): OrderFilter => (conds.length ? { $and: conds } : {});

/** Whole-value, case-insensitive match (the old `lower(x) = lower(y)`). */
const sameText = (text: string) => new RegExp(`^${escapeRegex(text)}$`, "i");

function tabWhere(tab: OrderTab): OrderFilter {
  switch (tab) {
    case "all":
      return { paidAt: { $ne: null } };
    case "to_fulfil":
      return { status: { $in: ["paid", "processing"] } };
    case "cancelled":
      return { status: "cancelled", paidAt: { $ne: null } };
    case "unpaid":
      return { paidAt: null };
    default:
      return { status: tab };
  }
}

/** Conditions for everything but the status tab (so tab counts can share them). */
function baseWhere(f: Omit<OrderFilters, "page" | "tab">): OrderFilter[] {
  const where: OrderFilter[] = [];
  if (f.q) {
    const like = contains(f.q);
    const compact = f.q.replace(/\s/g, "").toUpperCase();
    where.push({
      $or: [
        { number: like },
        { email: like },
        { "shippingAddress.name": like },
        { "shippingAddress.company": like },
        // Postcode typed with or without its space: compared upper-cased with the spaces taken out.
        {
          $expr: {
            $regexMatch: {
              input: { $replaceAll: { input: { $toUpper: "$shippingAddress.postcode" }, find: " ", replacement: "" } },
              regex: escapeRegex(compact),
            },
          },
        },
        { trackingNumber: like },
        { discountCode: like },
      ],
    });
  }
  // The dates are UK calendar days: from the start of `from` to the end of `to`, London time.
  if (f.from) where.push({ createdAt: { $gte: ukDayBoundary(f.from) } });
  if (f.to) where.push({ createdAt: { $lte: ukDayBoundary(f.to, true) } });
  return where;
}

export const PAGE_SIZE = 25;

/** Money sums are added up in floating point: back to whole pence, as the exact database sums were. */
const pence = (n: number) => Math.round(n * 100) / 100;

export async function listAdminOrders(f: OrderFilters) {
  const base = baseWhere(f);
  const where = allOf([...base, tabWhere(f.tab)]);
  const [orders, totals, tabCounts] = await Promise.all([
    db.orders
      .find(where, {
        projection: {
          number: 1,
          status: 1,
          email: 1,
          userId: 1,
          shippingAddress: 1,
          total: 1,
          refundedAmount: 1,
          discountCode: 1,
          paymentProvider: 1,
          createdAt: 1,
          paidAt: 1,
        },
      })
      .sort({ createdAt: -1, _id: -1 })
      .skip((f.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
    db.orders
      .aggregate<{ n: number; total: number; refunded: number }>([
        { $match: where },
        { $group: { _id: null, n: { $sum: 1 }, total: { $sum: "$total" }, refunded: { $sum: "$refundedAmount" } } },
      ])
      .toArray(),
    Promise.all(ORDER_TABS.map(async (t) => [t.id, await db.orders.countDocuments(allOf([...base, tabWhere(t.id)]))] as const)),
  ]);
  const summary = totals[0]
    ? { n: totals[0].n, total: pence(totals[0].total), refunded: pence(totals[0].refunded) }
    : { n: 0, total: 0, refunded: 0 };
  const units = orders.length
    ? await db.orderItems
        .aggregate<{ _id: number; units: number }>([
          { $match: { orderId: { $in: orders.map((o) => o._id) } } },
          { $group: { _id: "$orderId", units: { $sum: "$qty" } } },
        ])
        .toArray()
    : [];
  const unitsByOrder = new Map(units.map((u) => [u._id, u.units]));
  const rows = orders.map((o) => ({
    id: o._id,
    number: o.number,
    status: o.status,
    email: o.email,
    userId: o.userId,
    shippingAddress: o.shippingAddress,
    total: o.total,
    refundedAmount: o.refundedAmount,
    discountCode: o.discountCode,
    paymentProvider: o.paymentProvider,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    units: unitsByOrder.get(o._id) ?? 0,
  }));
  return { rows, summary, counts: Object.fromEntries(tabCounts) as Record<OrderTab, number> };
}

/** Every order matching the filters (all pages), with its items, for CSV export. */
export async function exportAdminOrders(f: Omit<OrderFilters, "page">) {
  const where = allOf([...baseWhere(f), tabWhere(f.tab)]);
  const rows = (await db.orders.find(where).sort({ createdAt: -1 }).limit(10_000).toArray()).map(stripId);
  const items = rows.length
    ? (
        await db.orderItems
          .find({ orderId: { $in: rows.map((r) => r.id) } })
          .sort({ _id: 1 })
          .toArray()
      ).map(stripId)
    : [];
  return rows.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

// ---------- customers ----------

export interface CustomerRow {
  userId: string | null;
  email: string;
  name: string | null;
  joined: Date | null;
  banned: boolean;
  emailVerified: boolean;
  orders: number;
  spent: number;
  lastOrder: Date | null;
}

interface Rollup {
  orders: number;
  spent: number;
  lastOrder: Date | null;
}

const addRollup = (a: Rollup | undefined, b: Rollup): Rollup =>
  a
    ? {
        orders: a.orders + b.orders,
        spent: a.spent + b.spent,
        lastOrder: !a.lastOrder || (b.lastOrder && b.lastOrder > a.lastOrder) ? b.lastOrder : a.lastOrder,
      }
    : b;

/**
 * Registered customers plus guest checkout emails (paid orders without an account). A guest order whose email
 * matches an account (of any role) counts towards that account.
 */
async function people(): Promise<CustomerRow[]> {
  const [users, groups] = await Promise.all([
    db.users.find({}, { projection: { _id: 1, email: 1, name: 1, createdAt: 1, banned: 1, emailVerified: 1, role: 1 } }).toArray(),
    // Paid orders rolled up per account (linked orders) and per lower-cased email (guest orders).
    db.orders
      .aggregate<{ _id: { userId: string | null; key: string | null }; orders: number; spent: number; lastOrder: Date | null; email: string; name: string | null }>([
        { $match: { paidAt: { $ne: null } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: {
              userId: { $ifNull: ["$userId", null] },
              key: { $cond: [{ $eq: [{ $ifNull: ["$userId", null] }, null] }, { $toLower: "$email" }, null] },
            },
            orders: { $sum: 1 },
            spent: { $sum: { $subtract: ["$total", "$refundedAmount"] } },
            lastOrder: { $max: "$createdAt" },
            email: { $max: "$email" },
            // The name on the latest order's delivery address.
            name: { $first: { $ifNull: ["$shippingAddress.name", null] } },
          },
        },
      ])
      .toArray(),
  ]);

  const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u._id]));
  const byUser = new Map<string, Rollup>();
  const guests: CustomerRow[] = [];
  for (const g of groups) {
    const rollup = { orders: g.orders, spent: g.spent, lastOrder: g.lastOrder };
    const ownerId = g._id.userId ?? (g._id.key !== null ? userByEmail.get(g._id.key) : undefined) ?? null;
    if (ownerId !== null) {
      byUser.set(ownerId, addRollup(byUser.get(ownerId), rollup));
      continue;
    }
    guests.push({
      userId: null,
      email: g.email,
      name: g.name,
      joined: null,
      banned: false,
      emailVerified: false,
      orders: g.orders,
      spent: pence(g.spent),
      lastOrder: g.lastOrder,
    });
  }
  const registered = users
    // Accounts without a stored role are customers (the old column defaulted to "customer").
    .filter((u) => (u.role ?? "customer") === "customer")
    .map((u): CustomerRow => {
      const r = byUser.get(u._id);
      return {
        userId: u._id,
        email: u.email,
        name: u.name,
        joined: u.createdAt,
        banned: u.banned ?? false,
        emailVerified: u.emailVerified,
        orders: r?.orders ?? 0,
        spent: pence(r?.spent ?? 0),
        lastOrder: r?.lastOrder ?? null,
      };
    });
  return [...registered, ...guests];
}

/** Newest first, nulls last (as `order by x desc nulls last` did). */
const newestFirst = (a: Date | null, b: Date | null) => (a && b ? b.getTime() - a.getTime() : a ? -1 : b ? 1 : 0);

export async function listCustomers({ q, type, page }: { q: string; type: "all" | "registered" | "guest"; page: number }) {
  const needle = q.toLowerCase();
  const matching = (await people()).filter(
    (r) =>
      (!q || r.email.toLowerCase().includes(needle) || (r.name ?? "").toLowerCase().includes(needle)) &&
      (type !== "registered" || r.userId !== null) &&
      (type !== "guest" || r.userId === null),
  );
  matching.sort((a, b) => newestFirst(a.lastOrder, b.lastOrder) || newestFirst(a.joined, b.joined));
  return {
    total: matching.length,
    rows: matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

/** Orders for a registered customer (linked or placed as a guest with their email), or for a guest email. */
export async function customerOrders(who: { userId: string; email: string } | { email: string }) {
  const email = sameText(who.email.toLowerCase());
  const where: OrderFilter = "userId" in who ? { $or: [{ userId: who.userId }, { userId: null, email }] } : { userId: null, email };
  const rows = await db.orders.find(where).sort({ createdAt: -1 }).limit(500).toArray();
  return rows.map(stripId);
}
