"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";


// Consent is stored in the same `_cs` cookie the live site uses ("essential" after "Essential only").
const COOKIE = "_cs";
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const hasChoice = () => document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`));

function choose(value: "essential" | "all") {
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  listeners.forEach((listener) => listener());
}

const button =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md px-3 text-xs h-9 flex-1 transition-transform active:translate-y-px sm:flex-none";

export function CookieBanner() {
  // Rendered only after hydration so returning visitors never see it flash.
  const decided = useSyncExternalStore(subscribe, hasChoice, () => true);
  if (decided) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="border-border bg-background/95 supports-backdrop-filter:bg-background/85 fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[60] border-t backdrop-blur md:bottom-0"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-muted-foreground text-[13px] leading-snug sm:text-sm">
          Our cookies keep the site secure, save your basket, count visits and show us which ads turn into orders.{" "}
          <Link
            href="/privacy"
            className="text-foreground underline decoration-1 underline-offset-2 hover:decoration-2"
          >
            Privacy policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("essential")}
            className={cn(button, "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground")}
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose("all")}
            className={cn(button, "bg-primary text-primary-foreground shadow hover:bg-primary/90")}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
