import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Faq, LinkItem } from "./premises-data";

/**
 * The source overrides Tailwind's `.container` with `max-width:1280px !important` and 1rem/1.5rem/2rem padding
 * (which also beats any `max-w-*` on the same element). Our globals keep the stock container, so kit pages use this.
 */
export const CONTAINER =
  "mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 min-[1920px]:max-w-[1600px] min-[1920px]:px-12";

/**
 * The source wraps store pages in `.store-font`, whose `:is(h1…h6){letter-spacing:-.02em;font-weight:700}` rule
 * outranks heading utility classes. Our shared shell doesn't have it, so kit page roots add this.
 */
export const STORE_HEADINGS = "[&_:is(h1,h2,h3,h4,h5,h6)]:font-bold [&_:is(h1,h2,h3,h4,h5,h6)]:tracking-[-0.02em]";

/** Long-form text block with the source's own `.prose` rules (it doesn't use the Typography plugin). */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-none leading-[1.7] text-[color-mix(in_oklab,var(--foreground)_88%,var(--muted-foreground))]",
        "[&_:is(h2,h3)]:text-foreground [&_:is(h2,h3)]:leading-[1.2] [&_:is(h2,h3)]:tracking-[-.015em]",
        "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-[1.75rem] [&_h2]:font-bold md:[&_h2]:text-[2rem]",
        "[&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:text-[1.375rem] [&_h3]:font-semibold md:[&_h3]:text-2xl",
        "[&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1.5 [&_li::marker]:text-muted-foreground",
        "[&_strong]:text-foreground [&_strong]:font-semibold",
        "[&_a]:text-primary [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-2 [&_a:hover]:decoration-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FaqList({ faqs, className }: { faqs: Faq[]; className?: string }) {
  return (
    <div className={cn("divide-border mt-3 divide-y", className)}>
      {faqs.map((f) => (
        <details key={f.q} className="group py-3">
          <summary className="cursor-pointer list-none text-sm font-medium sm:text-base">{f.q}</summary>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed break-words sm:text-base">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Breadcrumb with "/" separators (business and premises pages). */
export function SlashBreadcrumb({ items, current }: { items: LinkItem[]; current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c) => (
          <Fragment key={c.href}>
            <li>
              <Link href={c.href} className="hover:underline">
                {c.label}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
          </Fragment>
        ))}
        <li aria-current="page" className="text-foreground font-medium">
          {current}
        </li>
      </ol>
    </nav>
  );
}

/** Breadcrumb with chevrons (category pages). */
export function ChevronBreadcrumb({ items }: { items: LinkItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-muted-foreground mb-3 text-sm">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((c, i) =>
          i < items.length - 1 ? (
            <li key={c.href} className="flex min-w-0 items-center gap-1">
              <Link href={c.href} className="hover:text-foreground break-words">
                {c.label}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </li>
          ) : (
            <li key={c.href} aria-current="page" className="text-foreground min-w-0 font-medium break-words">
              {c.label}
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}

export function LinkGrid({ title, links, intro }: { title: string; links: LinkItem[]; intro?: ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {intro}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.href + l.label}>
            {l.href.startsWith("http") ? (
              <a href={l.href} className="underline" rel="noopener noreferrer" target="_blank">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="underline">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
