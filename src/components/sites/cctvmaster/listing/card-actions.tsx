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
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
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
        "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground/80 transition-colors select-none hover:border-emerald-300 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-600",
        full && "cursor-not-allowed opacity-50 hover:border-border",
      )}
    >
      <input
        type="checkbox"
        className="h-4 w-4 accent-emerald-700"
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
