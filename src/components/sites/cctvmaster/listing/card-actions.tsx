"use client";

import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { addToCart } from "../shop-state";
import { COMPARE_MAX, toggleCompare, useCompare } from "./compare-store";
import type { CartItemData, CompareItem } from "./types";

/** Round basket button inside a product card; it sits in the card link, so it stops the navigation. */
export function CartIconButton({ item }: { item: CartItemData }) {
  return (
    <button
      type="button"
      aria-label="Add to cart"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(item);
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-[0_6px_14px_-6px_rgba(232,163,23,0.8)] transition-colors hover:bg-gold-hover focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
    >
      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/** "Compare" pill under a card; up to four products can be picked. */
export function CompareToggle({ item, name }: { item: CompareItem; name: string }) {
  const picked = useCompare();
  const checked = picked.some((i) => i.slug === item.slug);
  const full = !checked && picked.length >= COMPARE_MAX;
  return (
    <label
      title={full ? `You can compare up to ${COMPARE_MAX} at a time` : undefined}
      className={cn(
        "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground/80 transition-colors select-none hover:border-brand-300 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600",
        full && "cursor-not-allowed opacity-50 hover:border-border",
      )}
    >
      <input
        type="checkbox"
        className="h-4 w-4 accent-brand-700"
        aria-label={`Compare ${name}`}
        checked={checked}
        disabled={full}
        onChange={() => toggleCompare(item)}
      />
      <span className="min-w-[4.75rem]" aria-hidden="true">
        {checked ? "Comparing" : "Compare"}
      </span>
    </label>
  );
}
