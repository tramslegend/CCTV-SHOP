"use client";

import { useEffect } from "react";
import { clearCart } from "../shop-state";

/** Empties the basket once an order has been paid (rendered by the success page only after checkout). */
export function ClearCart() {
  useEffect(() => {
    clearCart();
  }, []);
  return null;
}
