// How checkout takes payment. Server-only.
//   "stripe"   STRIPE_SECRET_KEY is set: Stripe Checkout (hosted card page), confirmed by the webhook.
//   "test"     no key and not production: a clearly labelled local test payment (no card, nothing charged).
//   "disabled" production without a key: checkout refuses to take orders.
import Stripe from "stripe";
import { incVat, type Totals } from "./pricing";

export type PaymentMode = "stripe" | "test" | "disabled";

export function paymentMode(): PaymentMode {
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return process.env.NODE_ENV === "production" ? "disabled" : "test";
}

let client: Stripe | null = null;

/** The Stripe client, or null when payments by Stripe aren't configured. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key, { appInfo: { name: "shop-checkout" }, maxNetworkRetries: 2 });
  return client;
}

/** Pounds → integer pence. */
export const toPence = (amount: number) => Math.round(amount * 100);

// ---------- Stripe Checkout payload (pure, so it can be checked without a Stripe key) ----------

/** The parts of an order and its server quote the payment page is built from. */
export interface StripeOrderInput {
  order: { id: number; number: string; email: string };
  lines: { name: string; sku: string; slug: string; image?: string; unitPrice: number; qty: number }[];
  totals: Totals;
}

/**
 * The one-off coupon carrying an order's discount code to Stripe, or null when nothing comes off the items.
 * It is a fixed amount in pence (never percent_off, even for percentage codes), so Stripe takes off exactly what the
 * server priced, to the penny; it can be redeemed once and only by this order's session. Coupons apply to the line
 * items only, which is also where our item discounts apply; a free-delivery code instead sets the shipping rate to £0.
 */
export function stripeCouponParams({ order, totals }: StripeOrderInput): Stripe.CouponCreateParams | null {
  const d = totals.discountCode;
  if (!d || !(d.items > 0)) return null;
  return {
    amount_off: toPence(d.items),
    currency: "gbp",
    duration: "once",
    max_redemptions: 1,
    name: d.code.slice(0, 40),
    metadata: { orderId: String(order.id), orderNumber: order.number, code: d.code },
  };
}

/**
 * Checkout Session parameters for an order: inc-VAT unit prices, the delivery charge (zero with a free-delivery code)
 * and the discount coupon, so Stripe charges exactly the order total.
 */
export function stripeSessionParams(
  input: StripeOrderInput,
  opts: { origin: string; couponId?: string | null; now?: number; deliveryMethod: string },
): Stripe.Checkout.SessionCreateParams {
  const { order, lines, totals } = input;
  const rate = totals.vatRate;
  const metadata: Record<string, string> = { orderId: String(order.id), orderNumber: order.number };
  if (totals.discountCode) metadata.discountCode = totals.discountCode.code;
  const image = (url: string | undefined) => {
    if (!url) return undefined;
    const absolute = url.startsWith("/") ? `${opts.origin}${url}` : url;
    return absolute.startsWith("https://") ? [absolute] : undefined;
  };
  const delivery = Math.max(0, Math.round((totals.deliveryIncVat - (totals.discountCode?.delivery ?? 0)) * 100) / 100);
  const freeWithCode = totals.discountCode && totals.discountCode.delivery > 0 ? ` (free with ${totals.discountCode.code})` : "";
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  return {
    mode: "payment",
    currency: "gbp",
    locale: "en-GB",
    customer_email: order.email,
    client_reference_id: order.number,
    metadata,
    payment_intent_data: { metadata, description: `Order ${order.number}` },
    line_items: lines.map((l) => ({
      quantity: l.qty,
      price_data: {
        currency: "gbp",
        unit_amount: toPence(incVat(l.unitPrice, rate)),
        product_data: { name: l.name.slice(0, 250), images: image(l.image), metadata: { sku: l.sku, slug: l.slug } },
      },
    })),
    ...(opts.couponId ? { discounts: [{ coupon: opts.couponId }] } : {}),
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: delivery > 0 ? opts.deliveryMethod : freeWithCode ? `${opts.deliveryMethod}${freeWithCode}` : `${opts.deliveryMethod} (free)`,
          fixed_amount: { amount: toPence(delivery), currency: "gbp" },
        },
      },
    ],
    // Stripe's minimum is 30 minutes; an expired session cancels the pending order (see the webhook).
    expires_at: now + 60 * 60,
    success_url: `${opts.origin}/checkout/success?order=${encodeURIComponent(order.number)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/checkout?cancelled=${encodeURIComponent(order.number)}`,
  };
}

/** What Stripe will charge for these parameters, in pence (line items − coupon + shipping): must equal the order total. */
export function stripeSessionAmount(params: Stripe.Checkout.SessionCreateParams, coupon: Stripe.CouponCreateParams | null) {
  const items = (params.line_items ?? []).reduce((sum, l) => sum + (l.price_data?.unit_amount ?? 0) * (l.quantity ?? 0), 0);
  const shipping = params.shipping_options?.[0]?.shipping_rate_data?.fixed_amount?.amount ?? 0;
  return items - Math.min(items, coupon?.amount_off ?? 0) + shipping;
}
