"use client";

import { addToCart } from "../shop-state";
import type { CartItemData } from "./types";

export function CompareAddButton({ item }: { item: CartItemData }) {
  return (
    <button
      type="button"
      onClick={() => addToCart(item)}
      aria-label={`Add ${item.name} to your basket`}
      className="inline-flex min-h-9 items-center rounded-full fc-gold px-4 text-xs font-semibold disabled:opacity-60"
    >
      Add to basket
    </button>
  );
}
