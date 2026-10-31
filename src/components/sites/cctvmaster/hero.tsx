import Link from "next/link";
import Image from "next/image";
import type { HeroSettings } from "@/lib/homepage/schema";
import type { FeaturedKit } from "@/lib/homepage/storefront";
import { fillTokens, type TokenValues } from "@/lib/homepage/text";
import { cn } from "@/lib/utils";
import { FeatureIcon, Highlighted, InlineText, SmartLink } from "./feature-icon";
import { ArrowRightIcon, PlusIcon, SearchIcon, SparklesIcon } from "./icons";
import { Price, priceParts } from "./price";

const pointColumns = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4"];

/** The kit picked in the admin: its parts, real price and a link to its page. */
function FeaturedKitCard({ kit, label, badge, chip }: { kit: FeaturedKit; label: string; badge: string; chip: string }) {
  return (
    <div className="relative w-full lg:w-94">
      <div className="relative rotate-[-2.5deg] transform-gpu">
        <Link
          href={`/products/${kit.slug}`}
          className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_28px_60px_-22px_rgba(16,185,129,0.35),0_8px_18px_-10px_rgba(0,0,0,0.08)] transition-colors hover:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {(label || badge) && (
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-zinc-500 uppercase">{label}</p>
              {badge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-emerald-800 uppercase">
                  <SparklesIcon className="h-2.5 w-2.5" />
                  {badge}
                </span>
              )}
            </div>
          )}
          <div className="mb-3 flex items-center gap-3">
            {kit.image && (
              <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-zinc-100 bg-white">
                <Image src={kit.image} alt="" fill sizes="112px" quality={90} className="object-contain p-1" />
              </span>
            )}
            <p className="line-clamp-2 text-sm leading-snug font-semibold tracking-tight text-zinc-950">{kit.name}</p>
          </div>
          <ul className="space-y-2">
            {kit.parts.map((item) => (
              <li key={`${item.sku}-${item.name}`} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-2.5">
                <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-zinc-100 bg-white">
                  {item.image && (
                    <Image src={item.image} alt={`${item.name} (${item.sku})`} fill sizes="80px" quality={90} className="object-contain p-1" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-zinc-950">{item.name}</p>
                  {item.sku && (
                    <p className="font-mono text-[10px] tracking-wider text-zinc-400 uppercase tabular-nums">SKU · {item.sku}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-[10px] tracking-wider text-zinc-500 tabular-nums">×{item.qty}</span>
                  {item.price !== undefined && <Price value={priceParts(item.price)} size="sm" className="text-zinc-950" />}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
            <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-zinc-500 uppercase">Kit total</p>
            <Price value={priceParts(kit.price)} size="lg" className="text-emerald-700" />
          </div>
        </Link>
        {chip && (
          <div
            aria-hidden="true"
            className="absolute -right-3 -bottom-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-zinc-950 px-3 text-[11px] font-semibold text-white shadow-[0_10px_20px_-10px_rgba(0,0,0,0.45)]"
          >
            <PlusIcon className="h-3 w-3" />
            {chip}
          </div>
        )}
      </div>
    </div>
  );
}

/** Homepage hero: copy, buttons, search, trust points, brands and the featured kit, all from /admin/content/homepage. */
export function Hero({ hero, tokens, kit }: { hero: HeroSettings; tokens: TokenValues; kit: FeaturedKit | null }) {
  const t = (text: string) => fillTokens(text, tokens);
  const buttons = [hero.primary, hero.secondary].map((b) => (b.label && b.href ? b : null));
  const points = hero.trustPoints;
  const card = kit && <FeaturedKitCard kit={kit} label={t(hero.kit.label)} badge={t(hero.kit.badge)} chip={t(hero.kit.chip)} />;
  return (
    <section
      className="relative overflow-hidden border-b border-zinc-100 bg-[#FAF9F6] text-zinc-950"
      aria-label="Welcome"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-emerald-50/70 lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-[42%] hidden w-px bg-linear-to-b from-transparent via-emerald-300/40 to-transparent lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-8 mx-auto h-px max-w-7xl bg-linear-to-r from-transparent via-emerald-300/30 to-transparent"
      />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-y-12 px-4 pt-14 pb-12 md:px-6 md:pt-20 md:pb-16 lg:grid-cols-12 lg:gap-x-10 lg:py-24">
        <div className="fc-stagger lg:col-span-7">
          {hero.eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 font-mono text-[10px] font-medium tracking-[0.18em] text-emerald-800 uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  aria-hidden="true"
                  className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"
                />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
              </span>
              {t(hero.eyebrow)}
            </span>
          )}
          <h1 className="font-sentient mt-6 max-w-[18ch] text-4xl leading-[1.02] font-medium tracking-tight text-balance text-zinc-950 [font-variation-settings:'opsz'_36] sm:text-5xl md:text-6xl lg:text-[4.25rem]">
            <Highlighted text={t(hero.headline)} highlight={t(hero.highlight)} wrap={(phrase) => <span className="text-zinc-500">{phrase}</span>} />
          </h1>
          {hero.intro && <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-zinc-600 sm:text-lg">{t(hero.intro)}</p>}
          {(buttons[0] || buttons[1]) && (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {buttons[0] && (
                <div className="fc-press">
                  <SmartLink
                    className="inline-flex h-12 items-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 focus-visible:outline-none"
                    href={buttons[0].href}
                  >
                    {t(buttons[0].label)}
                    <ArrowRightIcon className="h-4 w-4" />
                  </SmartLink>
                </div>
              )}
              {buttons[1] && (
                <div className="fc-press">
                  <SmartLink
                    className="inline-flex h-12 items-center gap-2 rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 transition-all hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none"
                    href={buttons[1].href}
                  >
                    {t(buttons[1].label)}
                  </SmartLink>
                </div>
              )}
            </div>
          )}
          <form
            className="mt-6 flex w-full max-w-md items-center gap-1 rounded-full border border-zinc-200 bg-white p-1.5 transition-colors focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30"
            action="/products"
            method="GET"
          >
            <label htmlFor="hero-search" className="sr-only">
              Search the catalogue
            </label>
            <SearchIcon className="ml-3 h-4 w-4 shrink-0 text-zinc-400" />
            <input
              id="hero-search"
              type="search"
              autoComplete="off"
              enterKeyHint="search"
              placeholder={t(hero.searchPlaceholder)}
              className="min-h-10 flex-1 bg-transparent px-1 py-1.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
              name="search"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            >
              Search
            </button>
          </form>
          {hero.note && (
            <p className="mt-6 text-sm text-zinc-500">
              <InlineText
                text={t(hero.note)}
                linkClassName="font-semibold text-emerald-700 underline-offset-4 transition-colors hover:text-emerald-800 hover:underline"
              />
            </p>
          )}
        </div>
        {card && (
          <>
            <div className="hidden lg:col-span-5 lg:flex lg:items-center lg:justify-center">
              <div className="fc-rise">{card}</div>
            </div>
            <div className="lg:hidden">{card}</div>
          </>
        )}
      </div>
      {points.length > 0 && (
        <div className="relative border-t border-zinc-100 bg-white">
          <ul className={cn("mx-auto grid max-w-7xl divide-x divide-zinc-100", points.length === 1 ? "grid-cols-1" : "grid-cols-2", pointColumns[points.length])}>
            {points.map((point, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-4 md:px-6 md:py-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <FeatureIcon name={point.icon} className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold tracking-tight text-zinc-950">{t(point.title)}</p>
                  {point.detail && <p className="truncate text-[11px] text-zinc-500">{t(point.detail)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hero.brands.length > 0 && (
        <div className="relative border-t border-zinc-100 bg-zinc-50/60">
          <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              {hero.brandsTitle && (
                <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-zinc-500 uppercase">{t(hero.brandsTitle)}</p>
              )}
              <ul
                className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-medium text-zinc-500"
                aria-label={t(hero.brandsTitle) || "Brands"}
              >
                {hero.brands.map((brand) => (
                  <li key={brand.name} className="font-mono tracking-wider uppercase transition-colors hover:text-zinc-900">
                    {brand.logoUrl ? (
                      <Image
                        src={brand.logoUrl}
                        alt={brand.name}
                        width={96}
                        height={24}
                        className="h-5 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
                      />
                    ) : (
                      brand.name
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
