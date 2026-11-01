import Link from "next/link";
import { Fragment } from "react";
import type { Crumb } from "@/lib/cctvmaster/types";
import { cn } from "@/lib/utils";

export interface ChipLink {
  name: string;
  href: string;
  count?: number;
  dashed?: boolean;
}

/**
 * Breadcrumbs, title and one-line description in a full-width forest-green band, then the chip rows on the page
 * canvas, above a category/collection listing.
 */
export function ListingHeader({
  crumbs,
  title,
  description,
  chipRows = [],
  compact = false,
}: {
  crumbs: Crumb[];
  title: string;
  description: string;
  chipRows?: { label: string; chips: ChipLink[]; variant: "primary" | "secondary" }[];
  /** Brand pages use plain chips without the 44px touch height. */
  compact?: boolean;
}) {
  return (
    <>
      <div className="fc-band bg-ink text-white">
        <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((crumb, i) => (
                <Fragment key={crumb.href}>
                  {i > 0 ? <li aria-hidden="true">/</li> : null}
                  {i === crumbs.length - 1 ? (
                    <li aria-current="page" className="font-medium text-white">
                      {crumb.name}
                    </li>
                  ) : (
                    <li>
                      <Link href={crumb.href} className="hover:text-white hover:underline">
                        {crumb.name}
                      </Link>
                    </li>
                  )}
                </Fragment>
              ))}
            </ol>
          </nav>
          <h1 className="fc-rise mt-2 text-2xl font-bold tracking-[-0.02em] sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">{description}</p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        {chipRows.map((row) =>
          row.chips.length ? (
            <div key={row.label} className="mt-4">
              <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">{row.label}</p>
              <div className="flex flex-wrap gap-2">
                {row.chips.map((chip) =>
                  row.variant === "primary" ? (
                    <Link
                      key={chip.href}
                      href={chip.href}
                      className={cn(
                        "border-border hover:border-primary hover:text-primary rounded-full border bg-white px-3.5 py-1.5 text-sm font-medium transition-colors",
                        !compact && "inline-flex min-h-11 items-center",
                      )}
                    >
                      {chip.name}
                      {chip.count !== undefined ? (
                        <span className="text-muted-foreground ml-1.5 text-xs">{chip.count}</span>
                      ) : null}
                    </Link>
                  ) : (
                    <Link
                      key={chip.href}
                      href={chip.href}
                      className={cn(
                        "border-border text-muted-foreground hover:text-foreground rounded-full border bg-white px-3 py-1 text-xs transition-colors",
                        !compact && "inline-flex min-h-11 items-center",
                        chip.dashed && "border-dashed",
                      )}
                    >
                      {chip.name}
                      {chip.count !== undefined ? <span className="ml-1.5">{chip.count}</span> : null}
                    </Link>
                  ),
                )}
              </div>
            </div>
          ) : null,
        )}
      </div>
    </>
  );
}
