// Starting payment for a freshly created order. Server-only.
import type Stripe from "stripe";
import { db } from "@/db";
import { getStripe, paymentMode, stripeCouponParams, stripeSessionAmount, stripeSessionParams, toPence } from "./payments";
import { addOrderEvent, cancelUnpaidOrder, type OrderRow, type Quote } from "./service";
import { siteUrl } from "./settings";
import { DELIVERY_METHOD, EVENT } from "./status";
import { orderToken } from "./token";

export type StartPaymentResult = { ok: true; url: string } | { ok: false; error: string };

export async function startPayment(order: OrderRow, quote: Quote): Promise<StartPaymentResult> {
  const mode = paymentMode();
  if (mode === "test") {
    await db.orders.updateOne({ _id: order.id }, { $set: { paymentProvider: "test", updatedAt: new Date() } });
    await addOrderEvent(order.id, EVENT.paymentStarted, "Sent to the local test payment page (Stripe isn’t configured).");
    return { ok: true, url: `/checkout/test-payment?order=${encodeURIComponent(order.number)}&token=${orderToken(order.number)}` };
  }

  const stripe = getStripe();
  if (mode !== "stripe" || !stripe) {
    await cancelUnpaidOrder(order.id, "Payments aren’t set up, so the checkout was refused.");
    return { ok: false, error: "Payments aren’t set up yet, so we can’t take orders online. Please call us to order." };
  }

  const input = { order, lines: quote.lines, totals: quote.totals };
  const coupon = stripeCouponParams(input);
  const params = stripeSessionParams(input, { origin: siteUrl(), deliveryMethod: order.deliveryMethod ?? DELIVERY_METHOD });
  if (stripeSessionAmount(params, coupon) !== toPence(order.total)) {
    await cancelUnpaidOrder(order.id, "The payment page total didn’t match the order total, so the checkout was stopped.");
    return { ok: false, error: "We couldn’t open the payment page. Please try again in a moment." };
  }

  try {
    // The order's discount goes to Stripe as a one-off coupon for exactly the amount we priced (see payments.ts).
    if (coupon) {
      const created = await stripe.coupons.create(coupon, { idempotencyKey: `coupon-${order.id}` });
      params.discounts = [{ coupon: created.id }];
    }
    const session = await stripe.checkout.sessions.create(params, { idempotencyKey: `checkout-${order.id}` });
    if (!session.url) throw new Error("Stripe returned no payment page URL");
    await db.orders.updateOne({ _id: order.id }, { $set: { paymentProvider: "stripe", paymentRef: session.id, updatedAt: new Date() } });
    await addOrderEvent(order.id, EVENT.paymentStarted, `Stripe checkout started (session ${session.id}).`);
    return { ok: true, url: session.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await cancelUnpaidOrder(order.id, `Stripe checkout couldn’t be started: ${message}`);
    return { ok: false, error: "We couldn’t open the payment page. Please try again in a moment." };
  }
}

/** Confirms a Stripe Checkout Session belongs to this order; returns the session (or null). */
export async function retrieveCheckoutSession(order: Pick<OrderRow, "id">, sessionId: string) {
  const stripe = getStripe();
  if (!stripe || !sessionId.startsWith("cs_")) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session.metadata?.orderId === String(order.id) ? session : null;
  } catch {
    return null;
  }
}

export const paymentIntentId = (session: Stripe.Checkout.Session) =>
  typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? session.id);
