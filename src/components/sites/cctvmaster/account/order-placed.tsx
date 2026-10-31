import { CircleCheck, Clock, SearchX } from "lucide-react";
import Link from "next/link";
import type { ReceiptOrder } from "@/lib/orders/receipt";
import { CheckoutFrame } from "./checkout-flow";
import { ClearCart } from "./clear-cart";
import { OrderLines, OrderTotals, StatusBadge, deliveryAddressLines, formatDate } from "./order-bits";
import { emeraldButton, eyebrow, outlineButton } from "./styles";

/** Whether an order placed at `iso` makes the weekday dispatch cut-off (UK time). */
function dispatchLabel(iso: string, cutoff: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const minutes = Number(parts.find((p) => p.type === "hour")?.value ?? 0) * 60 + Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const [ch, cm] = cutoff.split(":").map(Number);
  const label = `${ch % 12 || 12}${cm ? `:${String(cm).padStart(2, "0")}` : ""}${ch < 12 ? "am" : "pm"}`;
  const working = !["Sat", "Sun"].includes(weekday);
  return working && minutes < ch * 60 + cm
    ? { title: "Leaves us today", body: `Placed before the ${label} cut-off. We pack the order and hand it to the courier.` }
    : {
        title: "Leaves us on the next working day",
        body: `Placed after the ${label} cut-off, so it goes out on the next working day.`,
      };
}

function nextSteps(order: ReceiptOrder, cutoff: string, collectFrom: string | null) {
  const confirmation = { title: "A confirmation by email", body: `It lists every item in the order and is on its way to ${order.email}.` };
  if (collectFrom)
    return [
      confirmation,
      { title: "We get it ready", body: "We pick and pack the order, then email you as soon as it’s ready to collect." },
      { title: `Collect from ${collectFrom}`, body: "Bring the order number or the confirmation email with you." },
    ];
  return [
    confirmation,
    dispatchLabel(order.paidAt ?? order.placedAt, cutoff),
    {
      title: "Tracking by email",
      body: `Once the parcel is on its way, the tracking number (${order.deliveryMethod}) arrives by email.`,
    },
    { title: "Delivered to the address you gave", body: "The tracking link shows where the parcel is at any time." },
  ];
}

export function OrderNotFound() {
  return (
    <CheckoutFrame>
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
          <SearchX className="h-7 w-7 text-zinc-500" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">We couldn&apos;t find that order</h1>
        <p className="mt-2 text-zinc-500">
          Open it from the link in your confirmation email, or sign in to see your orders.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard/orders" className={emeraldButton}>
            Your orders
          </Link>
          <Link href="/products" className={outlineButton}>
            Continue shopping
          </Link>
        </div>
      </div>
    </CheckoutFrame>
  );
}

export function OrderPlaced({
  order,
  cutoff,
  justPlaced,
  signedIn,
  thankYou = "",
  collectFrom = null,
}: {
  order: ReceiptOrder;
  cutoff: string;
  /** Arrived here straight from payment: empty the basket. */
  justPlaced: boolean;
  signedIn: boolean;
  /** The shop's own thank-you message (Admin → Checkout → Messages). */
  thankYou?: string;
  /** Where to collect a click & collect order; null for deliveries. */
  collectFrom?: string | null;
}) {
  const awaiting = order.status === "pending_payment";
  const closed = order.status === "cancelled" || order.status === "refunded";
  return (
    <CheckoutFrame>
      {justPlaced && !awaiting && !closed && <ClearCart />}
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${awaiting ? "bg-amber-50" : "bg-emerald-50"}`}>
            {awaiting ? (
              <Clock className="h-7 w-7 text-amber-600" aria-hidden="true" />
            ) : (
              <CircleCheck className="h-7 w-7 text-emerald-700" aria-hidden="true" />
            )}
          </div>
          <p className={`${eyebrow} mt-5 justify-center`}>
            <span aria-hidden="true" className="h-px w-6 bg-emerald-700" />
            {awaiting ? "Confirming payment" : closed ? "Order" : "Order placed"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-3xl">
            {awaiting ? "We’re confirming your payment." : closed ? `This order is ${order.status}.` : "Thank you. The order is in."}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500 sm:text-base">
            {awaiting
              ? "This usually takes a few seconds. Refresh this page in a moment; we’ll also email you as soon as it’s confirmed."
              : closed
                ? "If you have a question about it, get in touch and quote the order number."
                : `A confirmation is on its way to ${order.email}.`}
          </p>
          {thankYou && !awaiting && !closed && (
            <p className="mx-auto mt-4 max-w-xl rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm whitespace-pre-line text-zinc-700">
              {thankYou}
            </p>
          )}
        </div>

        <section aria-labelledby="order-title" className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h2 id="order-title" className="font-mono text-[10px] font-medium tracking-[0.18em] text-zinc-500 uppercase">
                Order number
              </h2>
              <p className="mt-1 text-2xl font-semibold tracking-wide text-zinc-950 tabular-nums">{order.number}</p>
            </div>
            <div className="space-y-1.5 text-right text-sm text-zinc-500">
              <p>Placed {formatDate(order.placedAt, true)}</p>
              <StatusBadge status={order.status} />
            </div>
          </div>
          <OrderLines order={order} />
          <div className="grid gap-6 border-t border-zinc-100 pt-5 sm:grid-cols-2">
            <dl className="text-sm">
              {collectFrom && (
                <>
                  <dt className="font-semibold text-zinc-950">Collect from</dt>
                  <dd className="mt-1 mb-3 leading-6 text-zinc-700">{collectFrom}</dd>
                </>
              )}
              <dt className="font-semibold text-zinc-950">{collectFrom ? "Your address" : "Delivering to"}</dt>
              <dd className="mt-1 leading-6 text-zinc-700">
                {deliveryAddressLines(order).map((line, i) => (
                  // Two address lines can read the same (e.g. "1" as the street and the town), so the key includes the position.
                  <span key={`${i}-${line}`} className="block">
                    {line}
                  </span>
                ))}
              </dd>
              <dt className="mt-3 font-semibold text-zinc-950">Contact</dt>
              <dd className="mt-1 break-words text-zinc-700">
                {order.email}
                {order.phone ? ` · ${order.phone}` : ""}
              </dd>
              {order.trackingNumber && (
                <>
                  <dt className="mt-3 font-semibold text-zinc-950">Tracking</dt>
                  <dd className="mt-1 text-zinc-700">
                    {order.carrier} ·{" "}
                    {order.trackingUrl ? (
                      <a href={order.trackingUrl} className="font-semibold text-emerald-700 underline underline-offset-2" target="_blank" rel="noreferrer">
                        {order.trackingNumber}
                      </a>
                    ) : (
                      order.trackingNumber
                    )}
                  </dd>
                </>
              )}
            </dl>
            <OrderTotals order={order} />
          </div>
        </section>

        {!closed && (
          <section aria-labelledby="next-title" className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
            <h2 id="next-title" className="text-base font-semibold text-zinc-950">
              What happens next
            </h2>
            <ol className="mt-4 space-y-4">
              {nextSteps(order, cutoff, collectFrom).map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-emerald-700 text-xs font-semibold text-emerald-700">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">{step.title}</p>
                    <p className="text-sm text-zinc-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          {signedIn ? (
            <>
              <Link href={`/dashboard/orders/${order.number}`} className={emeraldButton}>
                Track this order
              </Link>
              <Link href="/dashboard/orders" className={outlineButton}>
                Your orders
              </Link>
            </>
          ) : (
            <Link href={`/signup?next=${encodeURIComponent("/dashboard/orders")}`} className={emeraldButton}>
              Create an account to track orders
            </Link>
          )}
          <Link href="/products" className="inline-flex h-11 items-center justify-center px-3 text-sm font-semibold text-zinc-700 hover:text-emerald-700">
            Continue browsing
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500">
          A question about this order? Every way to reach us is on the{" "}
          <Link href="/contact" className="font-semibold text-zinc-700 underline underline-offset-2 hover:text-emerald-700">
            contact page
          </Link>
          .
        </p>
      </div>
    </CheckoutFrame>
  );
}
