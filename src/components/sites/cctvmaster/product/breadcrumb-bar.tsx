import Link from "next/link";
import type { Crumb } from "@/lib/cctvmaster/types";

/** Grey breadcrumb strip under the header; the current page is the truncated last item. */
export function BreadcrumbBar({ crumbs }: { crumbs: Crumb[] }) {
  const trail = crumbs.slice(0, -1);
  const current = crumbs.at(-1);
  return (
    <div className="border-b bg-gray-50/50">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <nav aria-label="Breadcrumb">
          <ol className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            {trail.map((c, i) => (
              <li key={c.href} className={i ? "flex items-center gap-2" : undefined}>
                {i > 0 && (
                  <span aria-hidden="true" className="text-muted-foreground">
                    /
                  </span>
                )}
                <Link className="hover:text-foreground transition-colors" href={c.href}>
                  {c.name}
                </Link>
              </li>
            ))}
            {current && (
              <li className="flex min-w-0 items-center gap-2" aria-current="page">
                <span aria-hidden="true" className="text-muted-foreground">
                  /
                </span>
                <span className="text-foreground max-w-[200px] truncate font-medium">{current.name}</span>
              </li>
            )}
          </ol>
        </nav>
      </div>
    </div>
  );
}
