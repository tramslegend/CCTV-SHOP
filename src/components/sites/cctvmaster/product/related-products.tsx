import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { withVat } from "@/lib/cctvmaster/money";
import type { ProductCard } from "@/lib/cctvmaster/types";
import { ProductPrice } from "./product-price";

/** "You May Also Like" horizontal, snap-scrolling card row. */
export function RelatedProducts({ cards, viewAllHref }: { cards: ProductCard[]; viewAllHref: string }) {
  if (!cards.length) return null;
  return (
    <section className="mt-16" aria-labelledby="pdp-related-heading">
      <div className="mb-6 flex items-center justify-between">
        <h2 id="pdp-related-heading" className="flex items-center gap-3 text-xl font-bold sm:text-2xl">
          <span className="bg-primary h-7 w-1.5 rounded-full" aria-hidden="true" />
          You May Also Like
        </h2>
        <Link
          href={viewAllHref}
          className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium transition-colors"
        >
          View All
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="relative -mx-4 px-4">
        <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pt-2 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cards.map((card) => {
            const image = card.imageUrl ?? card.image;
            return (
              <li key={card.slug} className="fc-reveal">
                <Link
                  href={`/products/${card.slug}`}
                  className="group bg-card block w-[200px] flex-shrink-0 snap-start overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_40px_-20px_rgba(24,80,150,0.45)]"
                >
                  <div className="relative h-[200px] w-[200px] overflow-hidden bg-white">
                    {image && (
                      <Image
                        src={image}
                        alt={card.name}
                        fill
                        sizes="200px"
                        className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="w-[200px] p-4">
                    <h3 className="group-hover:text-primary mb-2 line-clamp-2 h-[2.5rem] text-sm font-medium transition-colors">
                      {card.name}
                    </h3>
                    {card.isCallForPrice || card.isContactSales ? (
                      <p className="text-sm font-semibold">Price on request</p>
                    ) : (
                      <ProductPrice amount={withVat(card.price)} className="text-sm font-semibold" />
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function BackToProducts() {
  return (
    <div className="mt-16 border-t border-border pt-8">
      <div className="flex justify-center">
        <Link
          href="/products"
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-12 items-center justify-center gap-2 rounded-md border px-8 text-sm font-medium whitespace-nowrap shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
        >
          <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to All Products
        </Link>
      </div>
    </div>
  );
}
