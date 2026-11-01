import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/lib/cctvmaster/types";
import { CompareTray } from "./compare-tray";
import { ListingControls } from "./listing-controls";
import {
  PAGE_SIZE,
  applyFacets,
  buildSidebar,
  facetGroups,
  getKitNav,
  hasActiveFilters,
  parseListingQuery,
  queryState,
  searchWithin,
  sortCards,
  type SearchParams,
} from "./listing-data";
import { EmptyListing, FacetFilters, Pagination } from "./listing-parts";
import { ListingSidebar } from "./listing-sidebar";
import { ProductCard } from "./product-card";
import { listingHref } from "./url";
import { defaultSortFor } from "./types";

/** The source's `.container` (max 1280px, 1/1.5/2rem gutters). */
export const CONTAINER = "mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 min-[1920px]:max-w-[1600px] min-[1920px]:px-12";

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

interface ListingViewProps {
  basePath: string;
  searchParams: SearchParams;
  /** Every product of this listing, before search/filters. */
  cards: ProductCardData[];
  /** The listing's own product order set in the admin (category pages); also makes "Featured" the default sort. */
  order?: string[];
  headingTag?: "h1" | "p";
  /** Show the source's "decide" filter rows (category pages only). */
  showFacets?: boolean;
  /** Show the "Home › Products" bar above the listing (/products). */
  breadcrumbBar?: boolean;
}

/** Sidebar + controls + filter rows + product grid + pagination, shared by every product listing. */
export function ListingView({
  basePath,
  searchParams,
  cards,
  order,
  headingTag = "p",
  showFacets = false,
  breadcrumbBar = false,
}: ListingViewProps) {
  const defaultSort = defaultSortFor(!!order);
  const parsed = parseListingQuery(searchParams, defaultSort);
  const q = showFacets ? parsed : { ...parsed, facets: {} };
  const state = queryState(q, defaultSort);
  const pool = q.search ? searchWithin(cards, q.search) : cards;
  const groups = showFacets ? facetGroups(pool, q.facets) : [];
  const results = sortCards(applyFacets(pool, q.facets), q.sort, order);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(q.page, pages);
  const visible = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtered = hasActiveFilters(q);
  const reset: Record<string, null> = { search: null };
  for (const key of Object.keys(q.facets)) reset[key] = null;
  const clearHref = listingHref(basePath, state, reset);
  const nodes = buildSidebar(cards.map((c) => c.slug));
  const kitNav = getKitNav();
  const pageState = { ...state };
  if (page > 1) pageState.page = String(page);
  else delete pageState.page;

  return (
    <>
      <div className="min-h-screen bg-surface/40">
        {breadcrumbBar ? (
          <div className="border-b border-border bg-white">
            <div className={`${CONTAINER} py-3`}>
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href="/" className="transition-colors hover:text-emerald-700">
                  Home
                </Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-medium text-foreground">Products</span>
              </nav>
            </div>
          </div>
        ) : null}
        <div className={`${CONTAINER} py-6`}>
          <div className="flex gap-8">
            <aside className="sticky top-32 z-30 hidden w-56 shrink-0 self-start lg:block">
              <ListingSidebar
                basePath={basePath}
                query={state}
                allCount={cards.length}
                nodes={nodes}
                kitNav={kitNav}
                clearHref={filtered ? clearHref : undefined}
              />
            </aside>
            <div className="min-w-0 flex-1">
              <ListingControls
                headingTag={headingTag}
                heading="All products"
                countLabel={filtered ? `${results.length} of ${plural(cards.length, "product")}` : plural(cards.length, "product")}
                basePath={basePath}
                query={state}
                sort={q.sort}
                defaultSort={defaultSort}
                hasFilters={filtered}
                search={q.search}
                clearHref={clearHref}
                mobileLinks={[
                  { name: kitNav.name, href: kitNav.href },
                  ...kitNav.systems.map((s) => ({ name: s.name, href: s.href })),
                  ...nodes.map((n) => ({ name: n.name, href: n.href })),
                ]}
              />
              <span className="sr-only" aria-live="polite">
                {filtered ? `${plural(results.length, "product")} found` : ""}
              </span>
              <div className="scroll-mt-28 outline-none">
                <FacetFilters groups={groups} basePath={basePath} query={state} />
                {visible.length ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {visible.map((card, i) => (
                      <ProductCard key={card.slug} card={card} eager={i < 4} />
                    ))}
                  </div>
                ) : (
                  <EmptyListing search={q.search} clearHref={clearHref} />
                )}
                <Pagination page={page} total={results.length} pageSize={PAGE_SIZE} basePath={basePath} query={pageState} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <CompareTray />
    </>
  );
}
