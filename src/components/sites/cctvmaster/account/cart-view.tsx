"use client";

import { ArrowRight, CircleCheck, FileText, Minus, Plus, ShoppingBag, ShoppingCart, TriangleAlert, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { quoteBasket } from "@/app/(store)/checkout/actions";
import { useHydrated } from "@/lib/local-store";
import { formatGBP } from "@/lib/cctvmaster/money";
import { incVat, type PricingSettings } from "@/lib/orders/pricing";
import { cn } from "@/lib/utils";
import { cartStore, removeFromCart, setCartQty, showToast, useCart, type CartLine } from "../shop-state";
import { ProductThumb } from "./product-thumb";
import { CONTAINER, shadcnButton, shadcnOutline, shadcnPrimary } from "./styles";
import { basketTotals, itemsLabel } from "./totals";

const brand = "text-[#047857]";

export function CartView({ pricing }: { pricing: PricingSettings }) {
  const hydrated = useHydrated();
  const lines = useCart();
  const [problems, setProblems] = useState<Record<string, string>>({});
  const basketKey = lines.map((l) => `${l.slug}:${l.qty}`).join("|");

  // Prices in the basket were copied when each item was added: refresh them (and flag anything that can no longer
  // be bought) from the server. Checkout re-prices again before taking payment.
  useEffect(() => {
    if (!basketKey) return;
    let live = true;
    const cart = basketKey.split("|").map((part) => {
      const i = part.lastIndexOf(":");
      return { slug: part.slice(0, i), qty: Number(part.slice(i + 1)) };
    });
    quoteBasket(cart)
      .then((q) => {
        if (!live || !q.ok) return;
        const fresh = new Map(q.lines.map((l) => [l.slug, l]));
        const stale = cartStore.get().some((l) => {
          const f = fresh.get(l.slug);
          return f && (f.price !== l.price || f.name !== l.name);
        });
        if (stale) {
          cartStore.set((all) =>
            all.map((l) => {
              const f = fresh.get(l.slug);
              return f ? { ...l, price: f.price, name: f.name, sku: f.sku, image: f.image ?? l.image } : l;
            }),
          );
        }
        setProblems(Object.fromEntries(q.problems.map((p) => [p.slug, p.message])));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [basketKey]);

  // The basket lives in localStorage, so the server renders a neutral placeholder.
  if (!hydrated) return <div className={cn(CONTAINER, "min-h-[60vh] py-8")} aria-busy="true" />;
  if (lines.length === 0) return <EmptyCart />;

  const totals = basketTotals(lines, pricing);
  const free = totals.delivery === 0;

  return (
    <div className={cn(CONTAINER, "py-8")}>
      <div className="mb-6">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Link className="hover:text-foreground" href="/">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground">Shopping Cart</span>
        </div>
      </div>
      <div className="mb-8 flex items-center gap-3">
        <ShoppingCart className={cn("h-8 w-8", brand)} aria-hidden="true" />
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {lines.map((line, i) => (
            <CartLineCard key={line.slug} line={line} eager={i < 3} vatRate={pricing.vatRate} problem={problems[line.slug]} />
          ))}
        </div>

        <div className="min-w-0 lg:col-span-1">
          <div className="bg-card text-card-foreground sticky top-32 flex flex-col gap-0 overflow-hidden rounded-xl border py-0 shadow-sm">
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 rounded-t-xl bg-[#047857] px-6 py-4">
              <h2 className="leading-none font-semibold text-white">Order Summary</h2>
            </div>
            <div className="space-y-4 px-6 pt-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                {free ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CircleCheck className="h-5 w-5" aria-hidden="true" />
                    <span className="font-medium">You qualify for FREE delivery!</span>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center gap-2 text-sm text-green-700">
                      <Truck className="h-4 w-4" aria-hidden="true" />
                      <span>
                        Spend <strong>{formatGBP(totals.toFreeDelivery)}</strong> more for FREE delivery
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(totals.freeDeliveryProgress)}
                      aria-label="Progress to free delivery"
                      className="relative h-2 w-full overflow-hidden rounded-full bg-green-200"
                    >
                      <div
                        className="bg-primary h-full w-full flex-1 transition-all"
                        style={{ transform: `translateX(-${100 - totals.freeDeliveryProgress}%)` }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Free delivery on orders over {formatGBP(totals.freeDeliveryFrom)}
                    </p>
                  </>
                )}
              </div>
              <SummaryRow label={`Items (${totals.count}) — ex VAT`} value={formatGBP(totals.itemsExVat)} />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{free ? "Delivery" : "Delivery (inc. VAT)"}</span>
                {free ? (
                  <span className="font-medium text-green-700">FREE</span>
                ) : (
                  <span>{formatGBP(totals.delivery)}</span>
                )}
              </div>
              <SummaryRow
                label={free ? `VAT (${totals.vatPercent}%)` : `VAT on items (${totals.vatPercent}%)`}
                value={formatGBP(totals.vat)}
              />
              <div role="none" className="bg-border h-px w-full shrink-0" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className={brand}>{formatGBP(totals.total)}</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 px-6 pt-0 pb-6">
              <Link href="/checkout" className={cn(shadcnButton, shadcnPrimary, "h-10 w-full rounded-md px-8")}>
                Proceed to Checkout
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
              <Link href="/contact" className={cn(shadcnButton, shadcnOutline, "h-10 w-full rounded-md px-8")}>
                <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
                Get a quote
              </Link>
              <div role="none" className="bg-border my-1 h-px w-full shrink-0" />
              <Link
                href="/products"
                className={cn(
                  shadcnButton,
                  "hover:bg-accent hover:text-accent-foreground text-muted-foreground h-9 w-full rounded-md px-4 py-2",
                )}
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed right-0 bottom-16 left-0 z-50 border-t bg-white shadow-2xl md:hidden"
        role="region"
        aria-label="Basket total and checkout"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs">Total · {itemsLabel(totals.count)}</p>
            <p className={cn("text-lg font-bold", brand)}>{formatGBP(totals.total)}</p>
          </div>
          <Link href="/checkout" className={cn(shadcnButton, shadcnPrimary, "h-12 shrink-0 rounded-md px-6")}>
            Checkout
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function CartLineCard({ line, eager, vatRate, problem }: { line: CartLine; eager: boolean; vatRate: number; problem?: string }) {
  const remove = () => {
    removeFromCart(line.slug);
    showToast({ title: `Removed ${line.name} from your basket` });
  };
  return (
    <div className="bg-card text-card-foreground flex flex-col gap-0 rounded-xl border py-0 shadow-sm transition-opacity">
      <div className="p-4">
        <div className="flex gap-4">
          <ProductThumb src={line.image} alt={line.name} sizes="96px" className="h-24 w-24 rounded-md border" eager={eager} />
          <div className="min-w-0 flex-1">
            <Link className="hover:text-primary line-clamp-2 font-medium" href={`/products/${line.slug}`}>
              {line.name}
            </Link>
            {line.sku && <p className="text-muted-foreground mt-1 text-xs">SKU: {line.sku}</p>}
            <p className={cn("mt-2 text-lg font-bold", brand)}>
              {formatGBP(incVat(line.price, vatRate))}
              <span className="text-muted-foreground ml-1 text-xs font-medium">inc. VAT</span>
            </p>
            {problem && (
              <p role="status" className="mt-1 flex items-start gap-1 text-xs font-medium text-amber-800">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {problem}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center rounded-md border">
              <button
                type="button"
                disabled={line.qty <= 1}
                onClick={() => setCartQty(line.slug, line.qty - 1)}
                className="hover:bg-accent px-3 py-1 transition-opacity disabled:opacity-50"
                aria-label={`Decrease quantity of ${line.name}`}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[40px] border-x px-3 py-1 text-center tabular-nums" aria-live="polite" aria-atomic="true">
                {line.qty}
              </span>
              <button
                type="button"
                disabled={line.qty >= 999}
                onClick={() => setCartQty(line.slug, line.qty + 1)}
                className="hover:bg-accent px-3 py-1 transition-opacity disabled:opacity-50"
                aria-label={`Increase quantity of ${line.name}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={remove}
              className={cn(
                shadcnButton,
                "text-destructive hover:text-destructive hover:bg-destructive/10 h-8 rounded-md px-3 text-xs",
              )}
            >
              <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className={cn(CONTAINER, "py-16")}>
      <div className="mx-auto max-w-md text-center">
        <div className="bg-muted mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <ShoppingCart className="text-muted-foreground h-10 w-10" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven&apos;t added anything to your cart yet.</p>
        <Link href="/products" className={cn(shadcnButton, shadcnPrimary, "h-10 rounded-md px-8")}>
          <ShoppingBag className="mr-2 h-5 w-5" aria-hidden="true" />
          Start Shopping
        </Link>
      </div>
    </div>
  );
}
