import Link from "next/link";
import { Check, ChevronDown, PackageCheck, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { KitCard } from "./kit-card";
import {
  CAMERA_OPTIONS,
  COLOUR_LABELS,
  FINDER_USES,
  FORM_LABELS,
  type FilterKey,
  filterLabels,
  filterQuery,
  type KitFilters,
  type KitSummary,
  matches,
  PAGE_SIZE,
  parseFilters,
  parsePage,
  parseSort,
  PRICE_BANDS,
  RES_OPTIONS,
  resLabel,
  type SearchParamsRecord,
  SORTS,
  sortKits,
  storageLabelFor,
  SYSTEM_LABELS,
  USE_LABELS,
} from "./kit-model";

interface FacetOption {
  label: string;
  count: number;
  href: string;
  active: boolean;
}

interface Facet {
  id: string;
  title: string;
  help?: string;
  summary: string;
  groups: { heading?: string; options: FacetOption[] }[];
}

const without = (f: KitFilters, ...keys: FilterKey[]) => {
  const out = { ...f };
  for (const k of keys) delete out[k];
  return out;
};

/** Filter sidebar, result count, sort, cards and pagination for a set of kits (server-rendered, link-driven). */
export function KitListing({
  kits,
  basePath,
  fixed = {},
  searchParams,
}: {
  kits: KitSummary[];
  basePath: string;
  fixed?: KitFilters;
  searchParams: SearchParamsRecord;
}) {
  const fixedKeys = Object.keys(fixed) as FilterKey[];
  const user = without(parseFilters(searchParams), ...fixedKeys);
  const sort = parseSort(searchParams);
  const effective: KitFilters = { ...user, ...fixed };
  const results = sortKits(
    kits.filter((k) => matches(k, effective)),
    sort,
  );
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(parsePage(searchParams), pages);
  const shown = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const href = (f: KitFilters, extra: { sort?: typeof sort; page?: number } = { sort }) =>
    `${basePath}${filterQuery(f, extra)}`;

  // Each option links to the current filters with that option toggled; counts ignore the facet's own selection.
  const option = (
    key: FilterKey,
    value: KitFilters[FilterKey],
    label: string,
    test: (k: KitSummary) => boolean,
    clears: FilterKey[] = [],
  ): FacetOption => {
    const active = user[key] === value;
    const base = without(effective, key, ...clears);
    const next = active ? without(user, key) : { ...without(user, key, ...clears), [key]: value };
    return {
      label,
      active,
      count: kits.filter((k) => matches(k, base) && test(k)).length,
      href: href(next),
    };
  };

  const facets: Facet[] = [];
  const summary = (opts: FacetOption[]) => opts.find((o) => o.active)?.label ?? "Any";

  if (!fixed.cameras) {
    const uses = FINDER_USES.map((u) => option("use", u, USE_LABELS[u], (k) => k.use === u, ["cameras"]));
    const counts = CAMERA_OPTIONS.map((n) =>
      option("cameras", n, `${n} ${n === 1 ? "camera" : "cameras"}`, (k) => k.cameraCount === n, ["use"]),
    );
    const extra = user.cameras && !CAMERA_OPTIONS.includes(user.cameras)
      ? [option("cameras", user.cameras, `${user.cameras} cameras`, (k) => k.cameraCount === user.cameras, ["use"])]
      : [];
    facets.push({
      id: "cameras",
      title: "How many cameras?",
      help: "Choose by the type of place, or pick an exact number if you already know.",
      summary: summary([...uses, ...counts, ...extra]),
      groups: [
        { heading: "By type of place", options: uses },
        { heading: "Or an exact number", options: [...counts, ...extra] },
      ],
    });
  }
  if (!fixed.system) {
    const opts = (["IP", "ANALOG"] as const).map((s) => option("system", s, SYSTEM_LABELS[s], (k) => k.system === s));
    facets.push({
      id: "system",
      title: "Already got cable?",
      help: "A network kit runs a cable to each camera. A coax kit reuses an old system’s cable.",
      summary: summary(opts),
      groups: [{ options: opts }],
    });
  }
  if (!fixed.res) {
    const opts = RES_OPTIONS.map((r) => option("res", r, resLabel(r), (k) => k.res === r, ["resmin"]));
    if (user.resmin) {
      opts.unshift(option("resmin", user.resmin, user.resmin === 8 ? "4K" : `${user.resmin}MP or sharper`, (k) => (k.res ?? 0) >= user.resmin!, ["res"]));
    }
    facets.push({
      id: "res",
      title: "Picture detail",
      help: "The higher the number, the further you can zoom in on a recording.",
      summary: summary(opts),
      groups: [{ options: opts }],
    });
  }
  {
    const opts = (["bullet", "turret", "dome", "ptz"] as const).map((v) => option("form", v, FORM_LABELS[v], (k) => k.form === v));
    facets.push({
      id: "form",
      title: "Camera shape",
      help: "Bullets face one way. Turrets and domes stay put and look around.",
      summary: summary(opts),
      groups: [{ options: opts }],
    });
  }
  if (!fixed.colour) {
    const opts = (["white", "black", "mixed"] as const).map((v) => option("colour", v, COLOUR_LABELS[v], (k) => k.colour === v));
    facets.push({
      id: "colour",
      title: "Camera colour",
      help: "Only shows kits where we know what colour the cameras are.",
      summary: summary(opts),
      groups: [{ options: opts }],
    });
  }
  {
    const sizes = [...new Set(kits.map((k) => k.storageTb).filter((t): t is number => !!t))].sort((a, b) => a - b);
    const opts = sizes.map((t) => option("storage", t, storageLabelFor(t), (k) => k.storageTb === t));
    facets.push({
      id: "storage",
      title: "Days of recording",
      help: "A bigger drive keeps more days before it records over the oldest.",
      summary: summary(opts),
      groups: [{ options: opts }],
    });
  }
  {
    const opts = PRICE_BANDS.map((b) => option("price", b.value, b.label, (k) => k.priceBand === b.value));
    facets.push({ id: "price", title: "Your budget", summary: summary(opts), groups: [{ options: opts }] });
  }
  {
    const brands = [...new Set(kits.map((k) => k.brand).filter((b): b is string => !!b))].sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base" }),
    );
    const opts = brands.map((b) => option("brand", b, b, (k) => k.brand === b));
    facets.push({ id: "brand", title: "Prefer a brand?", summary: summary(opts), groups: [{ options: opts }] });
  }

  // Hide empty options, and facets that leave nothing to choose between.
  const visible = facets
    .map((f) => ({ ...f, groups: f.groups.map((g) => ({ ...g, options: g.options.filter((o) => o.count > 0 || o.active) })) }))
    .filter((f) => {
      const opts = f.groups.flatMap((g) => g.options);
      return opts.some((o) => o.active) || opts.length > 1;
    });

  const activeLabels = filterLabels(without(effective, "stock"));
  const hasUserFilters = Object.keys(user).length > 0;
  const count = results.length;

  const firstActive = visible.findIndex((f) => f.groups.some((g) => g.options.some((o) => o.active)));

  const facetList = (mobile: boolean) => (
    <div className="border-border border-t">
      {visible.map((f, i) => {
        const active = f.groups.some((g) => g.options.some((o) => o.active));
        // Mobile facets share a name (an exclusive accordion), so the browser keeps only one open: open just one.
        const open = mobile ? i === Math.max(0, firstActive) : active || i < 3;
        return (
          <details key={f.id} name={mobile ? "kit-facet" : undefined} open={open} className="group border-border border-b">
            <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer list-none items-center gap-2 py-2 focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <span className="text-foreground block text-sm font-semibold">{f.title}</span>
                <span className="text-muted-foreground block truncate text-xs">{f.summary}</span>
              </span>
              <ChevronDown
                className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="pb-3">
              {f.help && <p className="text-muted-foreground mb-2 px-3 text-xs leading-snug">{f.help}</p>}
              {f.groups.map((g, gi) =>
                g.options.length ? (
                  <div key={gi} className={gi > 0 ? "mt-2" : undefined}>
                    {g.heading && (
                      <p className="text-muted-foreground px-3 pb-1 text-[11px] font-semibold tracking-wide uppercase">
                        {g.heading}
                      </p>
                    )}
                    <ul className="space-y-0.5">
                      {g.options.map((o) => (
                        <li key={o.label}>
                          <Link
                            href={o.href}
                            scroll={false}
                            aria-current={o.active ? "true" : undefined}
                            className={cn(
                              "focus-visible:ring-ring flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                              o.active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground",
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="h-4 w-4 shrink-0" aria-hidden="true">
                                {o.active && <Check className="h-4 w-4" />}
                              </span>
                              <span className="truncate">{o.label}</span>
                            </span>
                            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                              {o.count.toLocaleString("en-GB")}
                              <span className="sr-only"> kits</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          </details>
        );
      })}
    </div>
  );

  const footnote = (
    <p className="text-muted-foreground border-border mt-4 border-t pt-4 text-xs leading-relaxed">
      <span>
        If one part is priced on request, the whole kit shows “Price on request” — just ask and we&apos;ll give you a
        price. Nothing quite right?
      </span>{" "}
      <Link href="/kit-builder" className="underline underline-offset-4">
        Build your own, part by part
      </Link>
      <span>.</span>
    </p>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <details className="border-border rounded-2xl border p-4 lg:hidden">
        <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filter kits
          {hasUserFilters && (
            <span className="bg-primary/10 text-primary ml-auto rounded-full px-2 py-0.5 text-xs">
              {Object.keys(user).length} on
            </span>
          )}
        </summary>
        <div className="mt-3">
          {hasUserFilters && (
            <Link href={href({})} scroll={false} className="text-primary mb-2 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
              Clear all filters
            </Link>
          )}
          {facetList(true)}
          {footnote}
        </div>
      </details>
      <aside className="hidden lg:block" aria-label="Filter kits">
        <div className="mb-2 flex min-h-11 items-center justify-between gap-2">
          <h2 className="text-foreground text-sm font-semibold">Filter kits</h2>
          {hasUserFilters && (
            <Link href={href({})} scroll={false} className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4">
              Clear all
            </Link>
          )}
        </div>
        {facetList(false)}
        {footnote}
      </aside>
      <div>
        <div className="mb-4 space-y-2">
          <p className="text-foreground text-sm">
            <span className="font-semibold">
              {count.toLocaleString("en-GB")} {count === 1 ? "kit" : "kits"}
            </span>{" "}
            listed{activeLabels.length ? ` · ${activeLabels.join(" · ")}` : ""}
          </p>
          <Link
            href={href(user.stock ? without(user, "stock") : { ...user, stock: true })}
            scroll={false}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 items-center gap-1 text-xs underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
          >
            <PackageCheck className="h-3 w-3" aria-hidden="true" />
            {user.stock ? "Show every kit, including ones we order in" : "Only show kits ready to send"}
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-muted-foreground text-xs">Sort by</span>
            {SORTS.map((s) => (
              <Link
                key={s.value}
                href={href(user, { sort: s.value })}
                scroll={false}
                aria-current={s.value === sort ? "true" : undefined}
                className={cn(
                  "focus-visible:ring-ring flex min-h-11 items-center rounded text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  s.value === sort
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground underline underline-offset-4",
                )}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
        <span className="sr-only" aria-live="polite">
          {count} kits listed
        </span>
        <div id="kit-results" className="scroll-mt-28 outline-none">
          {shown.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((k) => (
                <KitCard key={k.slug} kit={k} />
              ))}
            </div>
          ) : (
            <div className="border-border bg-card rounded-2xl border p-6 text-center">
              <p className="text-foreground text-base font-semibold">No ready-made kits listed right now</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Our kit builder can put the same system together for you, one part and one question at a time.
              </p>
              <Link
                href="/kit-builder/cctv"
                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold"
              >
                Use the kit builder
              </Link>
            </div>
          )}
          {pages > 1 && <Pagination page={page} pages={pages} hrefFor={(p) => `${href(user, { sort, page: p })}#kit-results`} />}
        </div>
      </div>
    </div>
  );
}

function pageWindow(page: number, pages: number): number[] {
  const set = new Set<number>([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3].forEach((p) => set.add(p));
  if (page >= pages - 2) [pages - 1, pages - 2].forEach((p) => set.add(p));
  return [...set].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
}

function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  const nums = pageWindow(page, pages);
  const box = "flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium transition-colors";
  return (
    <nav aria-label="Kit pages" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className={cn("border-border hover:border-primary", box)}>
          Previous
        </Link>
      )}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - nums[i - 1] > 1 && <span className="text-muted-foreground text-sm">…</span>}
          <Link
            href={hrefFor(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(box, n === page ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary")}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={hrefFor(page + 1)} className={cn("border-border hover:border-primary", box)}>
          Next
        </Link>
      )}
    </nav>
  );
}
