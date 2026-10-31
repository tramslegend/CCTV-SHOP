"use client";

import Image from "next/image";
import Link from "next/link";
import { COMPARE_MAX, clearCompare, compareHref, removeCompare, useCompare } from "./compare-store";

/** Floating bar listing the products picked for comparison. */
export function CompareTray() {
  const items = useCompare();
  if (!items.length) return null;
  return (
    <aside
      aria-label="Your comparison"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-3 md:bottom-5"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-emerald-200 bg-white p-3 shadow-[0_18px_40px_-20px_rgba(16,185,129,0.55)]">
        <p className="mr-auto text-sm font-semibold text-zinc-900 sm:mr-0">
          <span>
            {items.length} of {COMPARE_MAX} picked
          </span>
        </p>
        <ul className="order-first flex w-full items-center gap-2 overflow-x-auto sm:order-none sm:w-auto sm:flex-1">
          {items.map((item) => (
            <li
              key={item.slug}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-100 bg-zinc-50 py-1 pr-1 pl-1"
            >
              <span
                aria-hidden="true"
                className="relative block h-10 w-10 overflow-hidden rounded-lg bg-white [&_img]:h-full [&_img]:w-full [&_img]:object-contain"
              >
                {item.image ? <Image src={item.image} alt="" width={40} height={40} sizes="40px" /> : null}
              </span>
              <span className="hidden max-w-[9rem] truncate text-xs text-zinc-700 lg:block">{item.title}</span>
              <button
                type="button"
                onClick={() => removeCompare(item.slug)}
                aria-label={`Remove ${item.title}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-base text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          {items.length > 1 ? (
            <Link
              href={compareHref(items)}
              className="inline-flex min-h-10 items-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Compare now
            </Link>
          ) : (
            <span className="text-xs text-zinc-500">Pick one more to compare</span>
          )}
          <button
            type="button"
            onClick={clearCompare}
            className="text-xs font-medium text-zinc-600 underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {items.length >= COMPARE_MAX ? `You can compare up to ${COMPARE_MAX} at a time` : ""}
        </p>
      </div>
    </aside>
  );
}
