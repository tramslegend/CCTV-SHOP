"use client";

import { Cookie } from "lucide-react";
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
    // Navy like the footer, with a gold top edge, soft blue, gold and coral glows, and the gold main button.
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[60] overflow-hidden bg-linear-to-r from-ink via-[#17305a] to-ink text-white shadow-[inset_0_2px_0_0_var(--gold),0_-12px_30px_-12px_rgba(19,34,56,0.5)] md:bottom-0"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_140%_at_10%_50%,rgba(42,120,204,0.35),transparent_70%),radial-gradient(30%_140%_at_70%_50%,rgba(232,163,23,0.16),transparent_70%),radial-gradient(25%_140%_at_95%_50%,rgba(242,112,79,0.18),transparent_70%)]"
      />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-start gap-3 sm:items-center">
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-300/15 text-amber-300">
            <Cookie className="h-5 w-5" />
          </span>
          <p className="text-[13px] leading-snug text-slate-200 sm:text-sm">
            Our cookies keep the site secure, save your basket, count visits and show us which ads turn into orders.{" "}
            <Link
              href="/privacy"
              className="font-semibold text-amber-300 underline decoration-1 underline-offset-2 hover:text-amber-200 hover:decoration-2"
            >
              Privacy policy
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("essential")}
            className={cn(button, "border border-white/30 bg-white/5 text-white hover:border-sky-300/70 hover:bg-white/10 focus-visible:ring-sky-300")}
          >
            Essential only
          </button>
          <button type="button" onClick={() => choose("all")} className={cn(button, "fc-gold font-semibold focus-visible:ring-amber-200")}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
