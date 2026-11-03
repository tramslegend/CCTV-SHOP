"use client";

import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ListingSearch } from "./listing-search";
import { SORT_OPTIONS, type QueryState, type SortKey } from "./types";
import { listingHref } from "./url";

interface ControlsProps {
  headingTag: "h1" | "p";
  heading: string;
  countLabel: string;
  basePath: string;
  query: QueryState;
  sort: SortKey;
  /** The sort this listing opens with (left out of the URL). */
  defaultSort: SortKey;
  hasFilters: boolean;
  search: string;
  clearHref: string;
  /** Category chips of the mobile "Filters" panel. */
  mobileLinks: { name: string; href: string }[];
}

/** Heading, product count, sort select and the mobile "Filters" panel above a product grid. */
export function ListingControls({
  headingTag: Heading,
  heading,
  countLabel,
  basePath,
  query,
  sort,
  defaultSort,
  hasFilters,
  search,
  clearHref,
  mobileLinks,
}: ControlsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading
            className={cn(
              "font-sentient text-2xl leading-[1.1] text-foreground md:text-3xl",
              // The source's store headings are bold with -0.02em tracking; its <p> variant keeps font-medium.
              Heading === "h1" ? "font-bold tracking-[-0.02em]" : "font-medium tracking-tight",
            )}
          >
            {heading}
          </Heading>
          <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase tabular-nums">{countLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:border-brand-200 hover:text-brand-700 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {hasFilters ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                •
              </span>
            ) : null}
          </button>
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-sm text-muted-foreground">
              Sort:
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) =>
                router.push(
                  listingHref(basePath, query, { sort: e.target.value === defaultSort ? null : e.target.value }),
                  { scroll: false },
                )
              }
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-brand-300 focus:ring-1 focus:ring-brand-300 focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {open ? (
        <div className="mb-5 rounded-xl border border-border bg-white p-4 shadow-sm lg:hidden">
          <ListingSearch basePath={basePath} query={query} className="relative mb-3" />
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Categories</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products"
              aria-current={basePath === "/products" ? "true" : undefined}
              className="inline-flex min-h-11 items-center rounded-full bg-brand-700 px-3.5 py-1.5 text-sm font-medium text-white transition-all"
            >
              All
            </Link>
            {mobileLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground/80 transition-all hover:bg-border"
              >
                {link.name}
              </Link>
            ))}
          </div>
          {hasFilters ? (
            <Link
              href={clearHref}
              scroll={false}
              className="mt-3 inline-flex text-xs font-medium text-muted-foreground hover:text-red-600"
            >
              Clear filters
            </Link>
          ) : null}
        </div>
      ) : null}
      {hasFilters ? (
        <div className="mb-4 hidden items-center gap-2 lg:flex">
          <span className="text-xs text-muted-foreground">Filtered:</span>
          {search ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              “{search}”
            </span>
          ) : null}
          <Link href={clearHref} scroll={false} className="ml-1 text-xs text-muted-foreground hover:text-red-500">
            Clear
          </Link>
        </div>
      ) : null}
    </>
  );
}
