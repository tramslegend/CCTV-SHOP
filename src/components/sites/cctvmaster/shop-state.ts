"use client";

import { createLocalStore, createMemoryStore } from "@/lib/local-store";
import { withVat } from "@/lib/cctvmaster/money";

// Browser-side shop state: the basket and wishlist live in localStorage. Accounts and orders are server-side
// (Better Auth + Postgres); checkout re-prices the basket from the database, so the prices kept here are for display.

export interface CartLine {
  slug: string;
  name: string;
  sku?: string;
  /** Unit price ex-VAT, as stored in the catalogue (display only: checkout re-prices on the server). */
  price: number;
  image?: string;
  qty: number;
}

export interface SavedItem {
  slug: string;
  name: string;
  price: number;
  image?: string;
}

export interface Toast {
  id: number;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export const cartStore = createLocalStore<CartLine[]>("cm-cart", []);
export const wishlistStore = createLocalStore<SavedItem[]>("cm-wishlist", []);
const toastStore = createMemoryStore<Toast[]>([]);

export const useCart = cartStore.useValue;
export const useWishlist = wishlistStore.useValue;
export const useToasts = toastStore.useValue;

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (lines: CartLine[]) =>
  Math.round(lines.reduce((sum, l) => sum + withVat(l.price) * l.qty, 0) * 100) / 100;

let toastId = Date.now();
export function showToast(toast: Omit<Toast, "id">) {
  const id = ++toastId;
  toastStore.set((list) => [...list.slice(-2), { ...toast, id }]);
  window.setTimeout(() => dismissToast(id), 4000);
}
export const dismissToast = (id: number) => toastStore.set((list) => list.filter((t) => t.id !== id));

export function addToCart(item: Omit<CartLine, "qty">, qty = 1) {
  cartStore.set((lines) => {
    const existing = lines.find((l) => l.slug === item.slug);
    if (existing) return lines.map((l) => (l.slug === item.slug ? { ...l, qty: Math.min(999, l.qty + qty) } : l));
    return [...lines, { ...item, qty }];
  });
  showToast({ title: `Added ${qty}x ${item.name} to your basket`, action: { label: "View basket", href: "/cart" } });
}

export const setCartQty = (slug: string, qty: number) =>
  cartStore.set((lines) =>
    qty <= 0 ? lines.filter((l) => l.slug !== slug) : lines.map((l) => (l.slug === slug ? { ...l, qty: Math.min(999, qty) } : l)),
  );

export const removeFromCart = (slug: string) => cartStore.set((lines) => lines.filter((l) => l.slug !== slug));
export const clearCart = () => cartStore.set(() => []);

/** Brings the basket in line with the server's prices, names and stock after a checkout quote. */
export function syncCart(update: { slug: string; name: string; sku?: string; price: number; image?: string; qty: number }[]) {
  cartStore.set((lines) => {
    const bySlug = new Map(update.map((u) => [u.slug, u]));
    return lines.flatMap((l) => {
      const u = bySlug.get(l.slug);
      return u ? [{ ...l, name: u.name, sku: u.sku ?? l.sku, price: u.price, image: u.image ?? l.image, qty: u.qty }] : [];
    });
  });
}

export function toggleWishlist(item: SavedItem) {
  let added = false;
  wishlistStore.set((list) => {
    added = !list.some((i) => i.slug === item.slug);
    return added ? [...list, item] : list.filter((i) => i.slug !== item.slug);
  });
  showToast({
    title: added ? `Saved ${item.name} to your wishlist` : `Removed ${item.name} from your wishlist`,
    action: added ? { label: "View wishlist", href: "/dashboard/wishlist" } : undefined,
  });
}
