import { FlaskConical, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutFrame } from "@/components/sites/cctvmaster/account/checkout-flow";
import { emeraldButton, outlineButton } from "@/components/sites/cctvmaster/account/styles";
import { formatGBP } from "@/lib/cctvmaster/money";
import { paymentMode } from "@/lib/orders/payments";
import { getOrderByNumber, getOrderItems } from "@/lib/orders/service";
import { orderToken, verifyOrderToken } from "@/lib/orders/token";
import { cancelTestPayment, completeTestPayment } from "../actions";

export const metadata: Metadata = {
  title: "Test payment",
  robots: { index: false },
};

// Stand-in for Stripe's payment page on machines without STRIPE_SECRET_KEY (never in production).
export default async function TestPaymentPage(props: PageProps<"/checkout/test-payment">) {
  const query = await props.searchParams;
  const number = typeof query.order === "string" ? query.order : "";
  const token = typeof query.token === "string" ? query.token : "";
  const order = paymentMode() === "test" && verifyOrderToken(number, token) ? await getOrderByNumber(number) : undefined;

  if (!order || order.paymentProvider !== "test") {
    return (
      <CheckoutFrame>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <SearchX className="mx-auto h-10 w-10 text-zinc-400" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">This payment link isn&apos;t valid</h1>
          <Link href="/checkout" className={`${emeraldButton} mt-6`}>
            Back to checkout
          </Link>
        </div>
      </CheckoutFrame>
    );
  }
  if (order.paidAt) redirect(`/checkout/success?order=${encodeURIComponent(order.number)}&token=${orderToken(order.number)}`);
  const items = await getOrderItems(order.id);
  const open = order.status === "pending_payment";

  return (
    <CheckoutFrame>
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-xl border-2 border-dashed border-amber-300 bg-white p-6">
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.16em] text-amber-700 uppercase">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            Local test payment · no card · nothing is charged
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Pay for order {order.number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stripe isn&apos;t configured on this machine (no STRIPE_SECRET_KEY). This page stands in for Stripe&apos;s
            payment page so the order can be completed end to end.
          </p>
          <ul className="mt-5 divide-y divide-border border-y border-border text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-foreground/80">
                  {i.qty} × {i.name}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-baseline justify-between text-lg font-semibold text-foreground">
            <span>Total to pay</span>
            <span className="tabular-nums">{formatGBP(order.total)}</span>
          </p>
          {open ? (
            <div className="mt-6 flex flex-col gap-3">
              <form action={completeTestPayment}>
                <input type="hidden" name="order" value={order.number} />
                <input type="hidden" name="token" value={token} />
                <button type="submit" className={`${emeraldButton} w-full`}>
                  Pay {formatGBP(order.total)} (test)
                </button>
              </form>
              <form action={cancelTestPayment}>
                <input type="hidden" name="order" value={order.number} />
                <input type="hidden" name="token" value={token} />
                <button type="submit" className={`${outlineButton} w-full`}>
                  Cancel and go back
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="rounded-md bg-surface px-3 py-2 text-sm text-muted-foreground">This order was cancelled before payment.</p>
              <Link href="/checkout" className={`${emeraldButton} w-full`}>
                Back to checkout
              </Link>
            </div>
          )}
        </div>
      </div>
    </CheckoutFrame>
  );
}
