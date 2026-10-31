import Link from "next/link";
import type { ProductCard } from "@/lib/cctvmaster/types";
import type { LandingPage } from "./collections";
import type { SearchParams } from "./listing-data";
import { ListingHeader } from "./listing-header";
import { Faq } from "./listing-seo";
import { ListingView } from "./listing-view";

/** Collection / brand landing page: header, the shared listing, then a short copy block with FAQ and links. */
export function LandingPageView({
  page,
  basePath,
  cards,
  searchParams,
}: {
  page: LandingPage;
  basePath: string;
  cards: ProductCard[];
  searchParams: SearchParams;
}) {
  return (
    <>
      <ListingHeader
        crumbs={[
          { name: "Home", href: "/" },
          { name: "Products", href: "/products" },
          { name: page.name, href: basePath },
        ]}
        title={page.name}
        description={page.description}
        chipRows={page.chipRows}
        compact
      />
      <ListingView basePath={basePath} searchParams={searchParams} cards={cards} />
      <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-6 sm:px-6">
        <h2 className="text-xl font-bold tracking-[-0.02em]">{page.copyHeading}</h2>
        {page.paragraphs.map((p, i) => (
          <p key={i} className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
            {p}
          </p>
        ))}
        {page.faqs.length ? <Faq heading="Frequently asked questions" faqs={page.faqs} /> : null}
        {page.links.length ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {page.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border-border hover:border-primary hover:text-primary rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
