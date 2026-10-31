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
              "font-sentient text-2xl leading-[1.1] text-zinc-950 md:text-3xl",
              // The source's store headings are bold with -0.02em tracking; its <p> variant keeps font-medium.
              Heading === "h1" ? "font-bold tracking-[-0.02em]" : "font-medium tracking-tight",
            )}
          >
            {heading}
          </Heading>
          <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-zinc-500 uppercase tabular-nums">{countLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-700 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {hasFilters ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                •
              </span>
            ) : null}
          </button>
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-sm text-gray-500">
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
              className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300 focus:outline-none"
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
        <div className="mb-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm lg:hidden">
          <ListingSearch basePath={basePath} query={query} className="relative mb-3" />
          <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">Categories</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products"
              aria-current={basePath === "/products" ? "true" : undefined}
              className="inline-flex min-h-11 items-center rounded-full bg-emerald-700 px-3.5 py-1.5 text-sm font-medium text-white transition-all"
            >
              All
            </Link>
            {mobileLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center rounded-full bg-gray-100 px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200"
              >
                {link.name}
              </Link>
            ))}
          </div>
          {hasFilters ? (
            <Link
              href={clearHref}
              scroll={false}
              className="mt-3 inline-flex text-xs font-medium text-gray-500 hover:text-red-600"
            >
              Clear filters
            </Link>
          ) : null}
        </div>
      ) : null}
      {hasFilters ? (
        <div className="mb-4 hidden items-center gap-2 lg:flex">
          <span className="text-xs text-gray-500">Filtered:</span>
          {search ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              “{search}”
            </span>
          ) : null}
          <Link href={clearHref} scroll={false} className="ml-1 text-xs text-gray-500 hover:text-red-500">
            Clear
          </Link>
        </div>
      ) : null}
    </>
  );
}
