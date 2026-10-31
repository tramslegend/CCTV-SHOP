"use client";

import { useSyncExternalStore } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight back-office notifications. `toast.success()` / `toast.error()` can be called from any client code;
// render <AdminToaster /> once on the page. The store lives at module level, so a toast survives client navigation
// (e.g. "Product created" shown after moving to the new product's page).

interface ToastItem {
  id: number;
  kind: "success" | "error";
  message: string;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(kind: ToastItem["kind"], message: string) {
  const id = nextId++;
  items = [...items.slice(-3), { id, kind, message }];
  emit();
  setTimeout(() => dismiss(id), kind === "error" ? 8000 : 4000);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const EMPTY: ToastItem[] = [];

export function AdminToaster() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
  return (
    <ol aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2">
      {list.map((t) => (
        <li
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={cn(
            "animate-in fade-in slide-in-from-bottom-2 pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-white p-3 text-sm shadow-lg",
            t.kind === "error" ? "border-red-200" : "border-emerald-200",
          )}
        >
          {t.kind === "error" ? (
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
          ) : (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          )}
          <p className="min-w-0 flex-1 leading-snug">{t.message}</p>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="text-muted-foreground -m-1 rounded p-1 hover:bg-zinc-100 hover:text-zinc-950"
            aria-label="Dismiss notification"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ol>
  );
}
