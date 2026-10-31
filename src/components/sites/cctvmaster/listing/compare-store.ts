"use client";

import { createLocalStore } from "@/lib/local-store";
import type { CompareItem } from "./types";

// Products picked for side-by-side comparison (the source allows four at a time).
export const COMPARE_MAX = 4;

const compareStore = createLocalStore<CompareItem[]>("cm-compare", []);

export const useCompare = compareStore.useValue;

export function toggleCompare(item: CompareItem) {
  compareStore.set((list) => {
    if (list.some((i) => i.slug === item.slug)) return list.filter((i) => i.slug !== item.slug);
    return list.length >= COMPARE_MAX ? list : [...list, item];
  });
}

export const removeCompare = (slug: string) => compareStore.set((list) => list.filter((i) => i.slug !== slug));
export const clearCompare = () => compareStore.set(() => []);

export const compareHref = (items: CompareItem[]) =>
  `/compare?skus=${items.map((i) => encodeURIComponent(i.sku)).join(",")}`;
