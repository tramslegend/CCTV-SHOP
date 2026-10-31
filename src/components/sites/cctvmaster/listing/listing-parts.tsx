import { Check, Package, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FacetGroup } from "./listing-data";
import type { QueryState } from "./types";
import { listingHref } from "./url";

const pageButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md text-xs h-11";
const outline = "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground";

/** The source's "decide" filter rows (At night, Smart alerts, …) with a "Showing:" row of active choices. */
export function FacetFilters({
  groups,
  basePath,
  query,
}: {
  groups: FacetGroup[];
  basePath: string;
  query: QueryState;
}) {
  if (!groups.length) return null;
  const toggle = (key: string, value: string) => {
    const current = query[key] ? query[key].split(",") : [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    return listingHref(basePath, query, { [key]: next.join(",") || null });
  };
  const active = groups.flatMap((g) => g.options.filter((o) => o.active).map((o) => ({ group: g, option: o })));
  return (
    <div role="group" aria-label="Filter products" className="mb-5 divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-white">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4">
          <p className="w-28 shrink-0 text-sm font-semibold text-zinc-900">{group.label}</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
            {group.options.map((option) => {
              const className = cn(
                "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none",
                option.active
                  ? "border-transparent bg-emerald-700 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300",
              );
              const content = (
                <>
                  {option.active ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {option.label}
                  <span className={cn("text-xs tabular-nums", option.active ? "text-white/70" : "text-slate-500")}>
                    {option.count}
                  </span>
                </>
              );
              return option.count === 0 && !option.active ? (
                <span key={option.value} aria-disabled="true" className={cn(className, "cursor-not-allowed opacity-40")}>
                  {content}
                </span>
              ) : (
                <Link
                  key={option.value}
                  href={toggle(group.key, option.value)}
                  scroll={false}
                  aria-pressed={option.active}
                  className={className}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {active.length ? (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
          <span className="text-slate-600">Showing:</span>
          {active.map(({ group, option }) => (
            <Link
              key={`${group.key}-${option.value}`}
              href={toggle(group.key, option.value)}
              scroll={false}
              aria-label={`Remove ${group.label} ${option.label}`}
              className="inline-flex min-h-8 items-center gap-1 rounded-full bg-sky-100 px-3 font-medium text-sky-700 hover:bg-sky-100 focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:outline-none"
            >
              {option.label}
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** "Showing 1–24 of N" with Previous / page numbers / Next, as links that keep the other query params. */
export function Pagination({
  page,
  total,
  pageSize,
  basePath,
  query,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  query: QueryState;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const from = Math.max(1, Math.min(page - 3, pages - 6));
  const numbers = Array.from({ length: Math.min(7, pages) }, (_, i) => from + i);
  const href = (p: number) => listingHref(basePath, query, { page: p > 1 ? String(p) : null });
  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <p className="text-sm text-gray-500">
        Showing {start}–{end} of {total}
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} rel="prev" className={cn(pageButton, outline, "px-3")}>
            Previous
          </Link>
        ) : (
          <button type="button" disabled className={cn(pageButton, outline, "px-3")}>
            Previous
          </button>
        )}
        <div className="hidden gap-1 sm:flex">
          {numbers.map((n) =>
            n === page ? (
              <span
                key={n}
                aria-current="page"
                className={cn(pageButton, "bg-primary text-primary-foreground hover:bg-primary/90 w-11 p-0 shadow")}
              >
                <span className="pointer-events-none">{n}</span>
              </span>
            ) : (
              <Link key={n} href={href(n)} className={cn(pageButton, outline, "w-11 p-0")}>
                {n}
              </Link>
            ),
          )}
        </div>
        <span className="text-sm text-gray-500 sm:hidden">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link href={href(page + 1)} rel="next" className={cn(pageButton, outline, "px-3")}>
            Next
          </Link>
        ) : (
          <button type="button" disabled className={cn(pageButton, outline, "px-3")}>
            Next
          </button>
        )}
      </nav>
    </div>
  );
}

/** Shown when a search or filter leaves nothing to list. */
export function EmptyListing({ search, clearHref }: { search: string; clearHref: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-50">
        <Package className="h-7 w-7 text-gray-400" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold tracking-[-0.02em] text-gray-900">No products found</h2>
      <p className="mt-2 text-sm text-gray-500">
        {search ? `No results for "${search}". ` : "Nothing matches these filters. "}
        Try a different search or clear filters.
      </p>
      <Link
        href={clearHref}
        className="bg-background hover:bg-accent mt-6 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-gray-100 px-4 py-2 text-sm font-medium whitespace-nowrap text-gray-900 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-700"
      >
        View All Products
      </Link>
    </div>
  );
}
