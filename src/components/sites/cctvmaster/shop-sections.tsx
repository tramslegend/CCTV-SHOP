import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { withVat } from "@/lib/cctvmaster/money";
import type { ProductCard } from "@/lib/cctvmaster/types";
import type { CategoriesSection, LinkSetting, PopularSection } from "@/lib/homepage/schema";
import type { CategoryTile } from "@/lib/homepage/storefront";
import { fillTokens, type TokenValues } from "@/lib/homepage/text";
import { Highlighted, SmartLink } from "./feature-icon";
import { ArrowRightIcon, ArrowUpRightIcon, PackageIcon } from "./icons";
import { Price, priceParts } from "./price";

const cardSizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 320px, 22vw";

function SectionLink({ link, children }: { link: LinkSetting; children: ReactNode }) {
  if (!link.label || !link.href) return null;
  return (
    <SmartLink
      className="group inline-flex h-11 items-center gap-1.5 self-start text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-800 focus-visible:underline focus-visible:outline-none md:self-end"
      href={link.href}
    >
      {children}
      <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </SmartLink>
  );
}

export function ShopByCategory({ section, tiles, tokens }: { section: CategoriesSection; tiles: CategoryTile[]; tokens: TokenValues }) {
  const t = (text: string) => fillTokens(text, tokens);
  if (!tiles.length) return null;
  return (
    <section id="shop">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="mb-8 flex flex-col gap-2 md:mb-10 md:flex-row md:items-end md:justify-between md:gap-4">
          <div>
            {section.eyebrow && (
              <p className="mb-2 font-mono text-[10px] font-medium tracking-[0.18em] text-emerald-700 uppercase">{t(section.eyebrow)}</p>
            )}
            <h2 className="font-sentient text-3xl leading-[1.05] font-medium tracking-tight text-foreground [font-variation-settings:'opsz'_28] md:text-4xl">
              <Highlighted text={t(section.title)} highlight={t(section.highlight)} wrap={(phrase) => <span className="text-muted-foreground">{phrase}</span>} />
            </h2>
          </div>
          <SectionLink link={section.link}>{t(section.link.label)}</SectionLink>
        </div>
        <ul className="fc-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {tiles.map((category) => (
            <li key={category.slug} className="fc-reveal">
              <Link
                className="group relative flex aspect-square flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all hover:-translate-y-0.5 hover:border-emerald-700 hover:shadow-[0_12px_30px_-12px_rgba(16,185,129,0.35)] focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:outline-none"
                href={category.href}
              >
                <div className="relative flex-1 overflow-hidden bg-white">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes={cardSizes}
                      quality={90}
                      className="object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <span aria-hidden="true" className="absolute inset-4 grid place-items-center rounded-xl bg-surface text-zinc-300">
                      <PackageIcon className="h-10 w-10" strokeWidth="1.25" />
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 right-0 h-12 w-12 origin-top-right scale-0 bg-linear-to-bl from-emerald-700/15 to-transparent transition-transform duration-300 group-hover:scale-100"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground md:text-base">
                      {category.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase tabular-nums">
                      Browse
                    </p>
                  </div>
                  <ArrowUpRightIcon className="h-4 w-4 shrink-0 text-zinc-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-700" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PopularProducts({ section, cards, tokens }: { section: PopularSection; cards: ProductCard[]; tokens: TokenValues }) {
  const t = (text: string) => fillTokens(text, tokens);
  if (!cards.length) return null;
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="mb-8 flex flex-col gap-2 md:mb-10 md:flex-row md:items-end md:justify-between md:gap-4">
          <div>
            <h2 className="font-sentient text-3xl leading-[1.05] font-medium tracking-tight text-foreground [font-variation-settings:'opsz'_28] md:text-4xl">
              {t(section.title)}
            </h2>
            {section.subtitle && <p className="mt-2 text-sm text-muted-foreground">{t(section.subtitle)}</p>}
          </div>
          <SectionLink link={section.link}>{t(section.link.label)}</SectionLink>
        </div>
        <ul className="fc-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {cards.map((product) => (
            <li key={product.slug} className="fc-reveal">
              <Link
                className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-16px_rgba(0,0,0,0.25)] focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                href={`/products/${product.slug}`}
              >
                <div className="relative aspect-square overflow-hidden bg-white">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes={cardSizes}
                      quality={90}
                      className="object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <span aria-hidden="true" className="absolute inset-3 grid place-items-center rounded-lg bg-surface text-zinc-300">
                      <PackageIcon className="h-10 w-10" strokeWidth="1.25" />
                    </span>
                  )}
                  {product.inStock && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 backdrop-blur-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                      Available
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3.5">
                  <p className="line-clamp-2 flex-1 text-sm font-medium text-foreground transition-colors group-hover:text-emerald-800">
                    {product.name}
                  </p>
                  <div className="mt-2.5 flex items-start gap-2">
                    {product.isCallForPrice || product.isContactSales ? (
                      <span className="text-sm font-semibold text-foreground">Call for price</span>
                    ) : (
                      <Price value={priceParts(withVat(product.price))} size="md" className="text-foreground" />
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
