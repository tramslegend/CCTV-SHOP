"use client";

import { createLocalStore } from "@/lib/local-store";

// Which account notifications (order updates from the server) this browser has already seen.

const readStore = createLocalStore<string[]>("cm-notifications-read", []);
export const useReadNotifications = readStore.useValue;
export const markNotificationsRead = (ids: string[]) =>
  readStore.set((read) => Array.from(new Set([...read, ...ids])).slice(-500));

// Earlier versions kept a demo account and orders in localStorage; drop them once.
if (typeof window !== "undefined") {
  for (const key of ["cm-account", "cm-orders", "cm-profiles", "cm-order-extras"]) window.localStorage.removeItem(key);
}
