// Orders: server-side pricing, creation, payment confirmation, cancellation and refunds. Server-only.
// Prices, stock and totals always come from the database; the browser only says which products and how many.
import { db, insert, nextOrderNumber, stripId, transaction } from "@/db";
import type { OrderItemRow, OrderRow, ProductRow } from "@/db/schema";
import { bumpCatalogVersion } from "@/lib/admin/session";
import { describeDiscount } from "@/lib/discounts/rules";
import { recordDiscountUse, resolveCode } from "@/lib/discounts/service";
import { sendOrderConfirmation, sendShopOrderAlert } from "./emails";
import { getStripe, toPence } from "./payments";
import { type PricingSettings, priceLines, round2, type Totals } from "./pricing";
import { pricingFor } from "@/lib/checkout/settings";
import { getPricingSettings } from "./settings";
import { EVENT } from "./status";
import type { CartInput, CheckoutData } from "./validation";

export type { OrderEventRow, OrderItemRow, OrderRow } from "@/db/schema";

export interface QuotedLine {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image?: string;
  /** Unit price ex VAT, from the database. */
  unitPrice: number;
  qty: number;
}

export interface CartProblem {
  slug: string;
  name?: string;
  message: string;
  /** Quantity that can still be bought (0 = remove the line). */
  available: number;
}

export interface Quote {
  lines: QuotedLine[];
  problems: CartProblem[];
  /** Includes the discount when a code was given and is valid for this basket. */
  totals: Totals;
  settings: PricingSettings;
  /** Why the given discount code wasn't applied (totals are then without it). */
  discountError?: string;
}

export interface QuoteOptions {
  /** Discount code as typed. */
  code?: string | null;
  /** Customer email, for one-use-per-customer codes. */
  email?: string | null;
  /** The delivery option chosen at checkout (its price and free-delivery threshold); standard delivery when absent. */
  delivery?: { price: number; freeFrom: number | null } | null;
}

type QuotedProduct = Pick<
  ProductRow,
  "id" | "slug" | "name" | "sku" | "price" | "status" | "availability" | "stock" | "trackStock" | "isContactSales" | "isCallForPrice"
> & { image: string | null };

/**
 * Re-prices a basket from the database: active products only, quote-only and discontinued items refused, tracked
 * stock enforced. A discount code is checked here, against the server's own figures (never the browser's).
 */
export async function quoteCart(cart: CartInput, opts: QuoteOptions = {}): Promise<Quote> {
  const merged = new Map<string, number>();
  for (const line of cart) merged.set(line.slug, Math.min(999, (merged.get(line.slug) ?? 0) + line.qty));
  const slugs = [...merged.keys()];

  const [standard, rows] = await Promise.all([
    getPricingSettings(),
    slugs.length
      ? db.products
          .aggregate<QuotedProduct>([
            { $match: { slug: { $in: slugs } } },
            {
              $lookup: {
                from: db.productImages.collectionName,
                localField: "_id",
                foreignField: "productId",
                pipeline: [{ $sort: { position: 1, _id: 1 } }, { $limit: 1 }, { $project: { _id: 0, url: 1 } }],
                as: "firstImage",
              },
            },
            {
              $project: {
                _id: 0,
                id: "$_id",
                slug: 1,
                name: 1,
                sku: 1,
                price: 1,
                status: 1,
                availability: 1,
                stock: 1,
                trackStock: 1,
                isContactSales: 1,
                isCallForPrice: 1,
                image: { $ifNull: [{ $arrayElemAt: ["$firstImage.url", 0] }, null] },
              },
            },
          ])
          .toArray()
      : Promise.resolve([]),
  ]);
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const settings = opts.delivery ? pricingFor(standard, opts.delivery) : standard;

  const lines: QuotedLine[] = [];
  const problems: CartProblem[] = [];
  for (const [slug, qty] of merged) {
    const p = bySlug.get(slug);
    if (!p || p.status !== "active") {
      problems.push({ slug, name: p?.name, message: "This product is no longer available.", available: 0 });
      continue;
    }
    if (p.isContactSales || p.isCallForPrice || !(p.price > 0)) {
      problems.push({ slug, name: p.name, message: "This product is priced on request. Contact us for a quote.", available: 0 });
      continue;
    }
    if (p.availability === "discontinued") {
      problems.push({ slug, name: p.name, message: "This product has been discontinued.", available: 0 });
      continue;
    }
    if (p.trackStock) {
      const stock = Math.max(0, p.stock ?? 0);
      if (stock < qty) {
        problems.push({
          slug,
          name: p.name,
          message: stock === 0 ? "This product is out of stock." : `Only ${stock} left in stock.`,
          available: stock,
        });
        // Offer what's left: the quote includes the reduced quantity, but an order isn't taken until the
        // customer has seen the change (placeOrder refuses while there are problems).
        if (stock > 0) lines.push({ productId: p.id, slug, name: p.name, sku: p.sku, image: p.image ?? undefined, unitPrice: p.price, qty: stock });
        continue;
      }
    } else if (p.availability === "out_of_stock") {
      problems.push({ slug, name: p.name, message: "This product is out of stock.", available: 0 });
      continue;
    }
    lines.push({ productId: p.id, slug, name: p.name, sku: p.sku, image: p.image ?? undefined, unitPrice: p.price, qty });
  }
  const totals = priceLines(lines, settings);
  if (!opts.code?.trim()) return { lines, problems, totals, settings };
  const check = await resolveCode(opts.code, { itemsIncVat: totals.itemsIncVat, deliveryIncVat: totals.deliveryIncVat, email: opts.email });
  if (!check.ok) return { lines, problems, totals, settings, discountError: check.message };
  return { lines, problems, totals: priceLines(lines, settings, check.discount), settings };
}

export async function addOrderEvent(orderId: number, type: string, message: string, actorId?: string | null) {
  await insert("orderEvents", { orderId, type, message, actorId: actorId ?? null });
}

const clean = (record: Record<string, string | undefined | null>) =>
  Object.fromEntries(Object.entries(record).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== ""));

/** Creates a pending_payment order (with item snapshots and a timeline entry) from validated checkout data. */
export async function createOrder(data: CheckoutData, quote: Quote, user: { id: string } | null, deliveryMethod: string) {
  const { contact, shipping, billing } = data;
  const t = quote.totals;
  // Taken before the transaction, like the old sequence: a rolled-back order leaves a gap in the numbers.
  const number = await nextOrderNumber();
  const order = await transaction(async (session) => {
    const [created] = await insert(
      "orders",
      {
        number,
        userId: user?.id ?? null,
        email: contact.email,
        phone: contact.phone,
        status: "pending_payment",
        subtotal: t.itemsExVat,
        deliveryFee: t.deliveryExVat,
        discount: t.discount,
        discountCode: t.discountCode?.code ?? null,
        vat: t.vat,
        total: t.total,
        vatRate: t.vatRate,
        currency: "GBP",
        deliveryMethod,
        shippingAddress: clean({ name: contact.name, company: contact.company, ...shipping, phone: contact.phone, country: "GB" }),
        billingAddress: billing ? clean({ name: contact.name, company: contact.company, ...billing, country: "GB" }) : null,
        customerNote: data.note ?? null,
      },
      { session },
    );
    await insert(
      "orderItems",
      quote.lines.map((l) => ({
        orderId: created.id,
        productId: l.productId,
        slug: l.slug,
        name: l.name,
        sku: l.sku,
        imageUrl: l.image ?? null,
        unitPrice: l.unitPrice,
        qty: l.qty,
      })),
      { session },
    );
    await insert(
      "orderEvents",
      [
        { orderId: created.id, type: EVENT.placed, message: `Order placed${user ? "" : " as a guest"}.`, actorId: user?.id ?? null },
        ...(t.discountCode
          ? [
              {
                orderId: created.id,
                type: EVENT.discount,
                message: `Discount code ${t.discountCode.code} (${describeDiscount(t.discountCode).toLowerCase()}) applied: −${formatPounds(t.discount)} inc. VAT.`,
              },
            ]
          : []),
        ...(data.marketingOptOut
          ? [{ orderId: created.id, type: EVENT.customer, message: "Customer asked not to receive marketing emails." }]
          : []),
      ],
      { session },
    );
    return created;
  });

  if (user && data.saveAddress) {
    // Same address = same first line (any case) and same postcode once upper-cased without spaces.
    const existing = await db.addresses.findOne(
      {
        userId: user.id,
        $expr: {
          $and: [
            { $eq: [{ $toLower: "$line1" }, { $toLower: { $literal: shipping.line1 } }] },
            {
              $eq: [
                { $replaceAll: { input: { $toUpper: "$postcode" }, find: " ", replacement: "" } },
                { $literal: shipping.postcode.replace(/\s/g, "") },
              ],
            },
          ],
        },
      },
      { projection: { _id: 1 } },
    );
    if (!existing) {
      const count = await db.addresses.countDocuments({ userId: user.id });
      await insert("addresses", {
        userId: user.id,
        name: contact.name,
        company: contact.company ?? null,
        line1: shipping.line1,
        line2: shipping.line2 ?? null,
        city: shipping.city,
        county: shipping.county ?? null,
        postcode: shipping.postcode,
        phone: contact.phone,
        isDefault: count === 0,
      });
    }
  }
  return order;
}

export async function getOrderItems(orderId: number): Promise<OrderItemRow[]> {
  const rows = await db.orderItems.find({ orderId }).sort({ _id: 1 }).toArray();
  return rows.map(stripId);
}

export async function getOrderById(id: number): Promise<OrderRow | undefined> {
  if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) return undefined;
  const order = await db.orders.findOne({ _id: id });
  return order ? stripId(order) : undefined;
}

export async function getOrderByNumber(number: string): Promise<OrderRow | undefined> {
  const order = await db.orders.findOne({ number });
  return order ? stripId(order) : undefined;
}

/** Moves tracked stock by `direction` × qty for every item; marks products out of stock at zero. */
async function adjustStock(orderId: number, items: OrderItemRow[], direction: -1 | 1) {
  let changed = false;
  const notes: string[] = [];
  for (const item of items) {
    if (!item.productId) continue;
    // A single atomic update per product, so concurrent orders can't lose each other's change. Every expression in
    // the stage reads the stock and availability as they were before this update.
    const next = { $add: [{ $ifNull: ["$stock", 0] }, direction * item.qty] };
    const row = await db.products.findOneAndUpdate(
      { _id: item.productId, trackStock: true },
      [
        {
          $set: {
            stock: { $max: [next, 0] },
            availability: {
              $switch: {
                branches: [
                  { case: { $and: [{ $lte: [next, 0] }, { $eq: ["$availability", "in_stock"] }] }, then: "out_of_stock" },
                  { case: { $and: [{ $gt: [next, 0] }, { $eq: ["$availability", "out_of_stock"] }] }, then: "in_stock" },
                ],
                default: "$availability",
              },
            },
            updatedAt: new Date(),
          },
        },
      ],
      { returnDocument: "after", projection: { stock: 1, sku: 1 } },
    );
    if (row) {
      changed = true;
      notes.push(`${row.sku}: ${direction < 0 ? "−" : "+"}${item.qty} (now ${row.stock})`);
    }
  }
  if (changed) {
    await addOrderEvent(orderId, EVENT.stock, `${direction < 0 ? "Stock taken" : "Stock returned"}: ${notes.join(", ")}.`);
    await bumpCatalogVersion().catch(() => undefined);
  }
}

/**
 * Marks an order paid. Idempotent: only the first call for an order takes stock, writes the timeline and sends the
 * customer confirmation and the shop alert; repeats (webhook retries, success-page sync) return { alreadyPaid: true }.
 */
export async function markOrderPaid(
  orderId: number,
  payment: { provider: "stripe" | "test"; ref: string; amountPence?: number | null },
) {
  const before = await db.orders.findOne({ _id: orderId }, { projection: { status: 1 } });
  // Conditional and atomic: only one caller can move the order to paid.
  const paid = await db.orders.findOneAndUpdate(
    { _id: orderId, paidAt: null, status: { $in: ["pending_payment", "cancelled"] } },
    { $set: { status: "paid", paidAt: new Date(), paymentProvider: payment.provider, paymentRef: payment.ref, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!paid) return { alreadyPaid: true as const, order: await getOrderById(orderId) };
  const order = stripId(paid);

  const how = payment.provider === "stripe" ? "Stripe" : "local test payment (no money taken)";
  await addOrderEvent(orderId, EVENT.paid, `Payment of ${formatPounds(order.total)} received by ${how}. Ref ${payment.ref}.`);
  if (before?.status === "cancelled") {
    await addOrderEvent(orderId, EVENT.paymentIssue, "Payment arrived after the order was cancelled. Check it and refund if it shouldn’t go out.");
  }
  if (payment.amountPence != null && payment.amountPence !== toPence(order.total)) {
    await addOrderEvent(
      orderId,
      EVENT.paymentIssue,
      `Amount paid (${formatPounds(payment.amountPence / 100)}) doesn’t match the order total (${formatPounds(order.total)}).`,
    );
  }

  await countDiscountUse(order);

  const items = await getOrderItems(orderId);
  await adjustStock(orderId, items, -1);

  const sent = await sendOrderConfirmation(order, items);
  await addOrderEvent(
    orderId,
    EVENT.email,
    sent.ok ? `Order confirmation emailed to ${order.email}.` : `Order confirmation email failed: ${sent.error}`,
  );
  const alert = await sendShopOrderAlert(order, items);
  if (alert && !alert.ok) await addOrderEvent(orderId, EVENT.email, `Shop new-order alert failed: ${alert.error}`);
  return { alreadyPaid: false as const, order };
}

const formatPounds = (n: number) => `£${n.toFixed(2)}`;

/** Counts the paid order's discount code use (see src/lib/discounts/service.ts) and notes it on the timeline. */
async function countDiscountUse(order: OrderRow) {
  if (!order.discountCode) return;
  try {
    const result = await recordDiscountUse(order);
    if (!result) return;
    if (result.counted) {
      const limit = result.maxUses !== null ? ` of ${result.maxUses}` : "";
      await addOrderEvent(order.id, EVENT.discount, `Discount code ${order.discountCode} use counted (${result.uses}${limit}).`);
      if (result.repeatCustomer) {
        await addOrderEvent(
          order.id,
          EVENT.paymentIssue,
          `Discount code ${order.discountCode} is one use per customer, but ${order.email} had already used it on another paid order. The discount was honoured.`,
        );
      }
      return;
    }
    await addOrderEvent(
      order.id,
      EVENT.paymentIssue,
      result.reason === "limit"
        ? `Discount code ${order.discountCode} had already reached its limit of ${result.maxUses} use${result.maxUses === 1 ? "" : "s"} when this order was paid. The discount (${formatPounds(order.discount)}) was honoured; the use wasn’t counted.`
        : `Discount code ${order.discountCode} no longer exists, so this use wasn’t counted. The discount (${formatPounds(order.discount)}) was honoured.`,
    );
  } catch (err) {
    console.error(`Counting discount code ${order.discountCode} for order ${order.number} failed`, err);
  }
}

/** Cancels an unpaid order (abandoned or expired checkout). Returns false when it was already paid or closed. */
export async function cancelUnpaidOrder(orderId: number, reason: string, actorId?: string | null) {
  // Conditional and atomic: an order that is paid at the same moment stays paid.
  const order = await db.orders.findOneAndUpdate(
    { _id: orderId, status: "pending_payment", paidAt: null },
    { $set: { status: "cancelled", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!order) return false;
  await addOrderEvent(orderId, EVENT.cancelled, reason, actorId);
  // Close the Stripe payment page so it can't be paid after cancelling.
  const stripe = getStripe();
  if (stripe && order.paymentProvider === "stripe" && order.paymentRef?.startsWith("cs_")) {
    await stripe.checkout.sessions.expire(order.paymentRef).catch(() => undefined);
  }
  return true;
}

/**
 * Refunds `amount` (inc VAT) of a paid order: through Stripe when it was paid by Stripe, otherwise recorded only.
 * Marks the order refunded once the whole total has been returned.
 */
export async function refundOrder(order: OrderRow, amount: number, opts: { actorId: string; reason?: string }) {
  const remaining = round2(order.total - order.refundedAmount);
  const value = round2(amount);
  if (!order.paidAt) return { ok: false as const, error: "This order hasn’t been paid, so there’s nothing to refund." };
  if (!(value > 0) || value > remaining) {
    return { ok: false as const, error: `Enter an amount between £0.01 and ${formatPounds(remaining)}.` };
  }
  let ref = "recorded manually";
  if (order.paymentProvider === "stripe") {
    const stripe = getStripe();
    if (!stripe) return { ok: false as const, error: "Stripe isn’t configured here (STRIPE_SECRET_KEY), so the refund can’t be sent." };
    if (!order.paymentRef?.startsWith("pi_")) return { ok: false as const, error: "No Stripe payment is recorded on this order." };
    try {
      const refund = await stripe.refunds.create(
        { payment_intent: order.paymentRef, amount: toPence(value), reason: "requested_by_customer", metadata: { orderId: String(order.id) } },
        { idempotencyKey: `refund-${order.id}-${toPence(order.refundedAmount)}-${toPence(value)}` },
      );
      ref = `Stripe refund ${refund.id}`;
    } catch (err) {
      return { ok: false as const, error: `Stripe refused the refund: ${err instanceof Error ? err.message : String(err)}` };
    }
  } else if (order.paymentProvider === "test") {
    ref = "local test payment, nothing to return";
  }
  const refundedAmount = round2(order.refundedAmount + value);
  const full = refundedAmount >= order.total;
  const row = await db.orders.findOneAndUpdate(
    { _id: order.id },
    { $set: { refundedAmount, ...(full ? { status: "refunded" as const } : {}), updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!row) throw new Error(`Order ${order.number} no longer exists, so the refund couldn’t be recorded`);
  const updated = stripId(row);
  await addOrderEvent(
    order.id,
    EVENT.refunded,
    `${full ? "Refunded in full" : "Partial refund"}: ${formatPounds(value)} (${ref}).${opts.reason ? ` Reason: ${opts.reason}` : ""}`,
    opts.actorId,
  );
  return { ok: true as const, order: updated, amount: value };
}

/** Puts a paid order's tracked stock back (cancellation or returned goods). */
export const restockOrder = async (orderId: number) => adjustStock(orderId, await getOrderItems(orderId), 1);
