"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { QueryState } from "./types";
import { listingHref } from "./url";

/** "Search products…" box of the listing sidebar: filters the current listing as you type (?search=). */
export function ListingSearch({
  basePath,
  query,
  className = "relative mb-4",
}: {
  basePath: string;
  query: QueryState;
  className?: string;
}) {
  const router = useRouter();
  const external = query.search ?? "";
  const [value, setValue] = useState(external);
  // The URL value last seen, and the value this box last sent; a URL change we did not send (e.g. "Clear") resets the box.
  const [seen, setSeen] = useState(external);
  const [sent, setSent] = useState(external);
  const timer = useRef<number | undefined>(undefined);

  if (external !== seen) {
    setSeen(external);
    if (external !== sent) {
      setValue(external);
      setSent(external);
    }
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const apply = (next: string, mode: "push" | "replace") => {
    window.clearTimeout(timer.current);
    const trimmed = next.trim();
    setSent(trimmed);
    if (trimmed === external) return;
    router[mode](listingHref(basePath, query, { search: trimmed || null }), { scroll: false });
  };

  return (
    <form
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        apply(value, "push");
      }}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => apply(next, "replace"), 400);
        }}
        placeholder="Search products…"
        aria-label="Search products"
        className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-sm text-foreground placeholder-muted-foreground focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300 focus:outline-none"
      />
    </form>
  );
}
