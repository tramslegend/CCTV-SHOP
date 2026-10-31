import Link from "next/link";
import { cn } from "@/lib/utils";
import { KitCard } from "./kit-card";
import type { BestSeller } from "./kit-model";

/** Horizontal-scrolling (mobile) / grid (desktop) list of ranked best sellers. */
export function BestSellerList({ items, wide = true }: { items: BestSeller[]; wide?: boolean }) {
  return (
    <ul
      role="list"
      className={cn(
        "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:snap-none md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0",
        wide && "xl:grid-cols-4",
      )}
    >
      {items.map((b, i) => (
        <li key={b.id} className="flex w-[80%] max-w-80 shrink-0 snap-start flex-col gap-2 md:w-auto md:max-w-none">
          <div>
            <p className="bg-primary text-primary-foreground inline-block rounded-full px-2.5 py-1 text-xs font-bold">
              No. {b.rank} seller
            </p>
            <p className="text-foreground mt-2 text-base leading-snug font-semibold">{b.name}</p>
            <p className="text-muted-foreground mt-0.5 text-sm leading-snug">{b.blurb}</p>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-1 lg:grid-cols-1">
            <KitCard kit={b.kit} preload={i < 2} />
          </div>
          <Link
            href={b.kit.href}
            className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center self-start text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            View kit<span className="sr-only">: {b.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function BestSellers({
  items,
  intro,
  className,
  seeAll,
}: {
  items: BestSeller[];
  intro: string;
  className?: string;
  seeAll?: number;
}) {
  if (!items.length) return null;
  return (
    <section id="best-sellers" aria-labelledby="best-sellers-h" className={cn("scroll-mt-28", className)}>
      <h2 id="best-sellers-h" className="text-foreground text-xl font-bold">
        Our best sellers
      </h2>
      <p className="text-muted-foreground mt-1 mb-4 text-sm leading-relaxed">{intro}</p>
      <BestSellerList items={items} />
      {seeAll ? (
        <p className="mt-3">
          <Link
            href="/kits#best-sellers"
            className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            See all {seeAll} best sellers
          </Link>
        </p>
      ) : null}
    </section>
  );
}
