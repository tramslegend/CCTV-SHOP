import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const pageHref = (n: number) => (n <= 1 ? "/blog" : `/blog?page=${n}`);

const navBtn =
  "text-muted-foreground hover:bg-muted hover:text-foreground inline-flex min-h-11 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors";
const disabledBtn =
  "text-muted-foreground/40 inline-flex min-h-11 cursor-not-allowed items-center gap-1 rounded-md border px-3 text-sm font-medium";
const numBtn =
  "text-muted-foreground hover:bg-muted hover:text-foreground inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors";

/** First, last and the current page ±1, with "…" for gaps — e.g. 1 2 … 9 or 1 … 4 5 6 … 9. */
function pageItems(current: number, total: number): (number | "gap")[] {
  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) items.push("gap");
    items.push(n);
  });
  return items;
}

export function BlogPagination({ current, total }: { current: number; total: number }) {
  if (total <= 1) return null;
  return (
    <nav className="mt-12 flex items-center justify-center gap-1" aria-label="Blog pagination">
      {current > 1 ? (
        <Link className={navBtn} rel="prev" href={pageHref(current - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Link>
      ) : (
        <button className={disabledBtn} type="button" disabled>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </button>
      )}
      <div className="hidden items-center gap-1 sm:flex">
        {pageItems(current, total).map((item, i) =>
          item === "gap" ? (
            <span key={`gap-${i}`} className="text-muted-foreground px-1.5 text-sm">
              …
            </span>
          ) : item === current ? (
            <span
              key={item}
              className="bg-foreground text-background inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 text-sm font-semibold"
              aria-current="page"
            >
              {item}
            </span>
          ) : (
            <Link key={item} className={numBtn} href={pageHref(item)}>
              {item}
            </Link>
          ),
        )}
      </div>
      <span className="text-muted-foreground px-2 text-sm sm:hidden">
        Page {current} of {total}
      </span>
      {current < total ? (
        <Link className={navBtn} rel="next" href={pageHref(current + 1)}>
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <button className={disabledBtn} type="button" disabled>
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </nav>
  );
}
