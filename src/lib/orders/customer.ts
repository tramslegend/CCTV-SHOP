// Customer-side data access: the signed-in shopper, their orders, addresses and order notifications. Server-only.
// A customer sees orders linked to their account, plus guest orders placed with their email once that email is
// confirmed (so nobody can read someone else's guest orders just by signing up with their address).
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Filter } from "mongodb";
import { db, type Doc, escapeRegex, stripId } from "@/db";
import type { OrderRow } from "@/db/schema";
import { auth } from "@/lib/auth";
import { CUSTOMER_EVENTS } from "./status";

/** The current Better Auth session (deduplicated per request). */
export const getShopSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export type ShopUser = NonNullable<Awaited<ReturnType<typeof getShopSession>>>["user"];

/** The signed-in user, or a redirect to /login that comes back to `path`. */
export async function requireCustomer(path: string): Promise<ShopUser> {
  const session = await getShopSession();
  if (!session || session.user.banned) redirect(`/login?next=${encodeURIComponent(path)}`);
  return session.user;
}

/** Whole-value, case-insensitive match (the old `lower(x) = lower(y)`). */
const sameText = (text: string) => new RegExp(`^${escapeRegex(text)}$`, "i");

/** Orders this user may see. Unpaid (abandoned) checkouts are left out. */
function ownedBy(user: Pick<ShopUser, "id" | "email" | "emailVerified">): Filter<Doc<OrderRow>> {
  const mine: Filter<Doc<OrderRow>> = user.emailVerified
    ? { $or: [{ userId: user.id }, { userId: null, email: sameText(user.email) }] }
    : { userId: user.id };
  return { $and: [mine, { paidAt: { $ne: null } }] };
}

export async function listCustomerOrders(user: ShopUser) {
  const orders = (await db.orders.find(ownedBy(user)).sort({ createdAt: -1 }).toArray()).map(stripId);
  const items = orders.length
    ? (
        await db.orderItems
          .find({ orderId: { $in: orders.map((o) => o.id) } })
          .sort({ _id: 1 })
          .toArray()
      ).map(stripId)
    : [];
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

export type CustomerOrder = Awaited<ReturnType<typeof listCustomerOrders>>[number];

export async function getCustomerOrder(user: ShopUser, number: string) {
  const doc = await db.orders.findOne({ $and: [{ number }, ownedBy(user)] });
  if (!doc) return null;
  const order = stripId(doc);
  const [items, events] = await Promise.all([
    db.orderItems.find({ orderId: order.id }).sort({ _id: 1 }).toArray(),
    // Events written together share a time: the id keeps them in the order they were written.
    db.orderEvents
      .find({ orderId: order.id, type: { $in: [...CUSTOMER_EVENTS] } })
      .sort({ createdAt: 1, _id: 1 })
      .toArray(),
  ]);
  return { ...order, items: items.map(stripId), events: events.map(stripId) };
}

/** Paid guest orders under this (not yet confirmed) email: shown as a "confirm your email" prompt. */
export async function countUnclaimedGuestOrders(user: ShopUser) {
  if (user.emailVerified) return 0;
  return db.orders.countDocuments({ userId: null, paidAt: { $ne: null }, email: sameText(user.email) });
}

export interface CustomerNotification {
  id: string;
  orderNumber: string;
  type: string;
  title: string;
  body: string;
  at: string;
}

/** Order updates for the account's notifications page, newest first. */
export async function listNotifications(user: ShopUser): Promise<CustomerNotification[]> {
  const orders = await db.orders
    .find(ownedBy(user), { projection: { number: 1, total: 1, carrier: 1, trackingNumber: 1, refundedAmount: 1 } })
    .toArray();
  const byId = new Map(orders.map((o) => [o._id, o]));
  const events = orders.length
    ? await db.orderEvents
        .find({ orderId: { $in: [...byId.keys()] }, type: { $in: [...CUSTOMER_EVENTS] } }, { projection: { type: 1, createdAt: 1, orderId: 1 } })
        .sort({ createdAt: -1, _id: -1 })
        .limit(100)
        .toArray()
    : [];
  const rows = events.flatMap((ev) => {
    const o = byId.get(ev.orderId);
    return o
      ? [
          {
            id: ev._id,
            type: ev.type,
            at: ev.createdAt,
            number: o.number,
            total: o.total,
            carrier: o.carrier,
            tracking: o.trackingNumber,
            refunded: o.refundedAmount,
          },
        ]
      : [];
  });
  const gbp = (n: number) => `£${n.toFixed(2)}`;
  return rows.map((r) => {
    const base = { id: `ev-${r.id}`, orderNumber: r.number, type: r.type, at: r.at.toISOString() };
    switch (r.type) {
      case "paid":
        return { ...base, title: `Order ${r.number} confirmed`, body: `Payment of ${gbp(r.total)} received. We’ll email the tracking number once it’s on its way.` };
      case "processing":
        return { ...base, title: `Order ${r.number} is being packed`, body: "We’re picking and packing your order." };
      case "dispatched":
        return {
          ...base,
          title: `Order ${r.number} dispatched`,
          body: r.tracking ? `On its way with ${r.carrier ?? "the courier"}. Tracking number ${r.tracking}.` : "Your order is on its way.",
        };
      case "delivered":
        return { ...base, title: `Order ${r.number} delivered`, body: "Your order has been delivered." };
      case "cancelled":
        return { ...base, title: `Order ${r.number} cancelled`, body: "This order has been cancelled." };
      default:
        return {
          ...base,
          title: `Refund on order ${r.number}`,
          body:
            r.refunded >= r.total
              ? `We’ve refunded the full ${gbp(r.total)} to your original payment method.`
              : "We’ve issued a partial refund to your original payment method.",
        };
    }
  });
}

export async function listAddresses(userId: string) {
  const rows = await db.addresses.find({ userId }).sort({ isDefault: -1, updatedAt: -1 }).toArray();
  return rows.map(stripId);
}

export type SavedAddress = Awaited<ReturnType<typeof listAddresses>>[number];
