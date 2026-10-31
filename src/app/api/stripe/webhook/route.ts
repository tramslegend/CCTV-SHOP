import type Stripe from "stripe";
import { db } from "@/db";
import { paymentIntentId } from "@/lib/orders/checkout";
import { getStripe } from "@/lib/orders/payments";
import { round2 } from "@/lib/orders/pricing";
import { addOrderEvent, cancelUnpaidOrder, markOrderPaid } from "@/lib/orders/service";
import { EVENT } from "@/lib/orders/status";

// Stripe webhook (register https://<site>/api/stripe/webhook in the Stripe dashboard for the events below).
// The signature is verified with STRIPE_WEBHOOK_SECRET. Every handler is idempotent, so Stripe's retries are safe;
// a failure returns 500 so Stripe tries again.

const orderIdOf = (session: Stripe.Checkout.Session) => {
  const id = Number(session.metadata?.orderId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

async function onSessionPaid(session: Stripe.Checkout.Session) {
  const orderId = orderIdOf(session);
  if (!orderId || (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")) return;
  await markOrderPaid(orderId, { provider: "stripe", ref: paymentIntentId(session), amountPence: session.amount_total });
}

async function onSessionClosed(session: Stripe.Checkout.Session, reason: string) {
  const orderId = orderIdOf(session);
  if (orderId) await cancelUnpaidOrder(orderId, reason);
}

/** Refunds made in the Stripe dashboard: keep the order in step (refunds made from our admin are already counted). */
async function onChargeRefunded(charge: Stripe.Charge) {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return;
  const order = await db.orders.findOne({ paymentRef: pi });
  if (!order) return;
  const refunded = round2(charge.amount_refunded / 100);
  if (refunded <= order.refundedAmount) return;
  const full = refunded >= order.total;
  // Only ever raises the refunded amount: a refund recorded in the meantime (our admin, a retried webhook) wins.
  const { modifiedCount } = await db.orders.updateOne(
    { _id: order.id, refundedAmount: { $lt: refunded } },
    { $set: { refundedAmount: refunded, ...(full ? { status: "refunded" as const } : {}), updatedAt: new Date() } },
  );
  if (!modifiedCount) return;
  await addOrderEvent(
    order.id,
    EVENT.refunded,
    `${full ? "Refunded in full" : "Partial refund"} in the Stripe dashboard: £${round2(refunded - order.refundedAmount).toFixed(2)}.`,
  );
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response("Stripe webhooks aren't configured", { status: 503 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await onSessionPaid(event.data.object);
        break;
      case "checkout.session.expired":
        await onSessionClosed(event.data.object, "Payment page expired without payment.");
        break;
      case "checkout.session.async_payment_failed":
        await onSessionClosed(event.data.object, "The payment failed.");
        break;
      case "charge.refunded":
        await onChargeRefunded(event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook ${event.type} failed`, err);
    return new Response("Webhook handler failed", { status: 500 });
  }
  return Response.json({ received: true });
}
