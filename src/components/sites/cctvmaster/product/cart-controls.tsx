"use client";

import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { addToCart, useCart, type CartLine } from "../shop-state";

const MAX_QTY = 999;

const useInCart = (slug: string) => useCart().find((l) => l.slug === slug)?.qty ?? 0;

/** Blue "N in your cart" box shown under the availability badge once the product is in the basket. */
export function InCartNotice({ slug }: { slug: string }) {
  const qty = useInCart(slug);
  if (!qty) return null;
  return (
    <div className="fc-rise flex items-center gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
        <ShoppingCart className="h-5 w-5 text-blue-600" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-blue-700">{qty} in your cart</p>
      </div>
    </div>
  );
}

const baseButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-md px-8 text-base font-semibold whitespace-nowrap focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:flex-1 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

/** Quantity stepper, Add to Cart (briefly turns into a green "Added to Cart!") and View Cart with a basket count. */
export function PurchasePanel({ item, children }: { item: Omit<CartLine, "qty">; children?: ReactNode }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inCart = useInCart(item.slug);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 2000);
    return () => window.clearTimeout(t);
  }, [added]);

  const add = () => {
    addToCart(item, qty);
    setAdded(true);
    setQty(1);
  };

  return (
    <div className="fc-rise space-y-4 pt-2 [animation-delay:400ms]">
      <div className="space-y-4">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <span id="pdp-qty-label" className="text-sm font-medium">
            Quantity:
          </span>
          <div
            role="group"
            aria-labelledby="pdp-qty-label"
            className="bg-background flex items-center overflow-hidden rounded-xl border shadow-sm"
          >
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="hover:bg-accent flex h-11 w-11 items-center justify-center font-medium transition-colors disabled:opacity-50"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span
              className="min-w-16 border-x px-5 py-2.5 text-center text-lg font-semibold tabular-nums"
              aria-live="polite"
              aria-atomic="true"
            >
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={qty >= MAX_QTY}
              onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
              className="hover:bg-accent flex h-11 w-11 items-center justify-center font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={add}
            className={cn(
              baseButton,
              "text-primary-foreground shadow transition-all duration-300",
              added ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary hover:bg-primary/90",
            )}
          >
            {added ? (
              <span className="fc-rise flex items-center">
                <Check className="mr-2 h-5 w-5" aria-hidden="true" />
                Added to Cart!
              </span>
            ) : (
              <span className="flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" aria-hidden="true" />
                Add to Cart
              </span>
            )}
          </button>
          <Link
            href="/cart"
            className={cn(
              baseButton,
              "shadow-sm transition-colors",
              inCart
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "border-input bg-background hover:bg-accent hover:text-accent-foreground border",
            )}
          >
            <ShoppingCart className="mr-2 h-5 w-5" aria-hidden="true" />
            View Cart
            {inCart > 0 && (
              <span
                className="bg-primary text-primary-foreground ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold"
                aria-label={`${inCart} of this item in your basket`}
              >
                {inCart}
              </span>
            )}
          </Link>
        </div>
        {inCart > 0 && (
          <p
            className="flex items-center gap-2 text-sm font-medium text-emerald-700"
            aria-live="polite"
            aria-atomic="true"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            You&apos;ve already got {inCart} in your basket
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
