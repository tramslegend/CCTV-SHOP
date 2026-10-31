"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getShopSession } from "@/lib/orders/customer";
import { startPayment } from "@/lib/orders/checkout";
import { paymentMode } from "@/lib/orders/payments";
import { getCheckoutSettings } from "@/lib/checkout/server";
import { type CheckoutSettings, postcodeInAreas, STANDARD_DELIVERY_ID } from "@/lib/checkout/settings";
import { formatGBP } from "@/lib/cctvmaster/money";
import { incVat, round2, type Totals } from "@/lib/orders/pricing";
import { addOrderEvent, cancelUnpaidOrder, createOrder, getOrderByNumber, markOrderPaid, quoteCart, type CartProblem } from "@/lib/orders/service";
import { EVENT } from "@/lib/orders/status";
import { orderToken, verifyOrderToken } from "@/lib/orders/token";
import { z } from "zod";
import { cartSchema, type CartInput, type CheckoutInput, checkoutSchema, EMAIL_RE, fieldErrors } from "@/lib/orders/validation";

export interface QuotedBasketLine {
  slug: string;
  name: string;
  sku: string;
  image?: string;
  /** Unit price ex VAT. */
  price: number;
  /** Unit price inc VAT, as charged. */
  unitIncVat: number;
  qty: number;
}

export type QuoteResult =
  | {
      ok: true;
      lines: QuotedBasketLine[];
      problems: CartProblem[];
      /** totals.discountCode is the applied code (server-priced), or null. */
      totals: Totals;
      /** Why the discount code given wasn't applied. */
      discountError?: string;
    }
  | { ok: false; error: string };

const toBasketLines = (quote: Awaited<ReturnType<typeof quoteCart>>): QuotedBasketLine[] =>
  quote.lines.map((l) => ({
    slug: l.slug,
    name: l.name,
    sku: l.sku,
    image: l.image,
    price: l.unitPrice,
    unitIncVat: incVat(l.unitPrice, quote.totals.vatRate),
    qty: l.qty,
  }));

const toQuoteResult = (quote: Awaited<ReturnType<typeof quoteCart>>): Extract<QuoteResult, { ok: true }> => ({
  ok: true,
  lines: toBasketLines(quote),
  problems: quote.problems,
  totals: quote.totals,
  ...(quote.discountError ? { discountError: quote.discountError } : {}),
});

const quoteOptionsSchema = z
  .object({
    code: z.string().trim().max(40).optional(),
    email: z.string().trim().max(254).optional(),
    delivery: z.string().trim().max(40).optional(),
  })
  .default({});

/** The delivery option with this id when it's offered, otherwise standard delivery. */
const deliveryOptionFor = (checkout: CheckoutSettings, id: string | undefined) =>
  checkout.delivery.find((o) => o.enabled && o.id === (id ?? STANDARD_DELIVERY_ID)) ?? null;

/**
 * Current server prices, stock and totals for a basket (slugs and quantities only), with a discount code when one is
 * given (its value is worked out here; the email is only used for one-use-per-customer codes) and the delivery
 * option's price.
 */
export async function quoteBasket(cart: CartInput, options?: { code?: string; email?: string; delivery?: string }): Promise<QuoteResult> {
  const parsed = cartSchema.safeParse(cart);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Your basket couldn’t be read." };
  const opts = quoteOptionsSchema.safeParse(options);
  const { code, email, delivery } = opts.success ? opts.data : {};
  const checkout = await getCheckoutSettings();
  const option = deliveryOptionFor(checkout, delivery) ?? checkout.delivery[0];
  const quote = await quoteCart(parsed.data, { code, email: email && EMAIL_RE.test(email) ? email.toLowerCase() : null, delivery: option });
  return toQuoteResult(quote);
}

export type PlaceOrderResult =
  | { ok: true; url: string; external: boolean }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      /** Basket changed on the server (price, stock or availability): show the new quote before taking payment. */
      quote?: Extract<QuoteResult, { ok: true }>;
      /** The discount code can't be used any more (the quote is without it). */
      discountRejected?: boolean;
      /** Guest checkout is off: the customer has to sign in first. */
      needsAccount?: boolean;
    };

const PAUSED_TEXT = "We're not taking online orders at the moment. Please call or email us to order.";

/**
 * Creates the order from the basket (re-priced here) and the customer's details, then returns where to pay:
 * Stripe's hosted page, or the local test payment page when Stripe isn't configured (development only).
 * The rules set in Admin → Checkout (ordering paused, guest checkout, required fields, delivery options and the
 * postcodes they serve, minimum order) are enforced here, whatever the browser sent.
 */
export async function placeOrder(input: CheckoutInput & { expectedTotal: number }): Promise<PlaceOrderResult> {
  const checkout = await getCheckoutSettings();
  if (!checkout.ordering.enabled) return { ok: false, error: checkout.ordering.pausedMessage || PAUSED_TEXT };
  const mode = paymentMode();
  if (mode === "disabled") {
    return { ok: false, error: "Payments aren’t set up yet, so we can’t take orders online. Please call us to order." };
  }
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted details.", fieldErrors: fieldErrors(parsed.error) };
  }
  const session = await getShopSession();
  const user = session && !session.user.banned ? session.user : null;
  if (!checkout.form.guestCheckout && !user) {
    return { ok: false, error: "Please sign in or create an account to place your order.", needsAccount: true };
  }

  const { form } = checkout;
  const problems: Record<string, string> = {};
  if (form.phone === "required" && !parsed.data.contact.phone) problems["contact.phone"] = "Please enter a contact phone number.";
  if (form.requireTerms && !parsed.data.acceptTerms) problems.terms = "Please tick the box to agree to the terms of sale.";
  const option = deliveryOptionFor(checkout, parsed.data.deliveryOption);
  if (!option) problems.delivery = "That delivery option isn’t available any more. Please choose another.";
  else if (option.kind === "delivery" && postcodeInAreas(parsed.data.shipping.postcode, option.excludedAreas))
    problems.delivery = `${option.name} isn’t available for ${parsed.data.shipping.postcode.toUpperCase()}. Please choose another delivery option.`;
  if (!option || Object.keys(problems).length) return { ok: false, error: "Please check the highlighted details.", fieldErrors: problems };

  // Fields the checkout doesn't ask for aren't stored, even if sent.
  const data = {
    ...parsed.data,
    contact: {
      ...parsed.data.contact,
      phone: form.phone === "hidden" ? undefined : parsed.data.contact.phone,
      company: form.company ? parsed.data.contact.company : undefined,
    },
    note: form.notes ? parsed.data.note : undefined,
  };
  // The code is checked again now, against the order being placed: a code that expired or was used up since the
  // review is refused here (and its use is only counted once the order is paid).
  const quote = await quoteCart(data.cart, { code: data.discountCode, email: data.contact.email, delivery: option });
  const quoted = toQuoteResult(quote);
  if (quote.problems.length || !quote.lines.length) {
    return { ok: false, error: "Some items in your basket have changed. Please check it before paying.", quote: quoted };
  }
  if (quote.discountError) {
    return {
      ok: false,
      error: `${quote.discountError} We’ve taken the code off your order, so please check the new total before paying.`,
      quote: quoted,
      discountRejected: true,
    };
  }
  if (Math.round(quote.totals.total * 100) !== Math.round(Number(input.expectedTotal) * 100)) {
    return { ok: false, error: "Prices have been updated since you started checking out. Please check the new total.", quote: quoted };
  }
  if (form.minimumOrder > 0) {
    const items = round2(quote.totals.itemsIncVat - (quote.totals.discountCode?.items ?? 0));
    if (items < form.minimumOrder)
      return { ok: false, error: `The minimum order is ${formatGBP(form.minimumOrder)} (items, inc. VAT). Please add a little more to your basket.` };
  }

  const order = await createOrder(data, quote, user, option.name);
  if (form.requireTerms) await addOrderEvent(order.id, EVENT.customer, "Customer ticked “I agree to the terms of sale”.");
  const payment = await startPayment(order, quote);
  if (!payment.ok) return { ok: false, error: payment.error };
  return { ok: true, url: payment.url, external: payment.url.startsWith("http") };
}

// ---------- local test payment (no Stripe key, development only) ----------

async function testOrder(number: string, token: string) {
  if (paymentMode() !== "test") return null;
  if (!verifyOrderToken(number, token)) return null;
  const order = await getOrderByNumber(number);
  return order && order.paymentProvider === "test" ? order : null;
}

export async function completeTestPayment(form: FormData) {
  const number = String(form.get("order") ?? "");
  const token = String(form.get("token") ?? "");
  const order = await testOrder(number, token);
  if (!order) redirect("/checkout");
  if (order.status === "pending_payment") {
    await markOrderPaid(order.id, { provider: "test", ref: `test_${randomUUID().replace(/-/g, "").slice(0, 16)}` });
  }
  redirect(`/checkout/success?order=${encodeURIComponent(order.number)}&token=${orderToken(order.number)}&placed=1`);
}

export async function cancelTestPayment(form: FormData) {
  const number = String(form.get("order") ?? "");
  const token = String(form.get("token") ?? "");
  const order = await testOrder(number, token);
  if (order) await cancelUnpaidOrder(order.id, "Customer left the test payment page without paying.");
  redirect("/checkout");
}
