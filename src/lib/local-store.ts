"use client";

import { useSyncExternalStore } from "react";

// A tiny localStorage-backed store that React components subscribe to. The server snapshot is always `initial`,
// so markup that depends on stored state renders after hydration.
export function createLocalStore<T>(key: string, initial: T) {
  const listeners = new Set<() => void>();
  let raw: string | null | undefined;
  let value = initial;

  const get = (): T => {
    if (typeof window === "undefined") return initial;
    const next = window.localStorage.getItem(key);
    if (next !== raw) {
      raw = next;
      try {
        value = next ? (JSON.parse(next) as T) : initial;
      } catch {
        value = initial;
      }
    }
    return value;
  };

  const set = (update: (prev: T) => T) => {
    window.localStorage.setItem(key, JSON.stringify(update(get())));
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => e.key === key && listener();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  const useValue = () => useSyncExternalStore(subscribe, get, () => initial);
  return { get, set, useValue };
}

// Same interface, kept in memory only (for transient UI such as toasts).
export function createMemoryStore<T>(initial: T) {
  const listeners = new Set<() => void>();
  let value = initial;
  const get = () => value;
  const set = (update: (prev: T) => T) => {
    value = update(value);
    listeners.forEach((l) => l());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const useValue = () => useSyncExternalStore(subscribe, get, () => initial);
  return { get, set, useValue };
}

// True once the component has hydrated on the client.
const noop = () => () => {};
export const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
