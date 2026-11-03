import Link from "next/link";
import type { BlogPost } from "@/lib/cctvmaster/types";
import type { ArticlesSection, PromiseSection, WhyUsSection } from "@/lib/homepage/schema";
import { fillTokens, type TokenValues } from "@/lib/homepage/text";
import { cn } from "@/lib/utils";
import { BlogCard } from "./content/blog-card";
import { Highlighted, InlineText } from "./feature-icon";
import { ArrowRightIcon, CircleCheckIcon, QuoteIcon } from "./icons";
import { TILE_TONES } from "./tones";

export function WhyUs({ section, tokens }: { section: WhyUsSection; tokens: TokenValues }) {
  const t = (text: string) => fillTokens(text, tokens);
  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="grid gap-10 md:grid-cols-12 md:gap-12">
          <div className={cn("fc-reveal", section.reasons.length ? "md:col-span-4" : "md:col-span-8")}>
            {section.eyebrow && (
              <p className="mb-2 font-mono text-[10px] font-medium tracking-[0.18em] text-brand-700 uppercase">{t(section.eyebrow)}</p>
            )}
            <h2 className="font-sentient text-3xl leading-[1.05] font-medium tracking-tight text-foreground [font-variation-settings:'opsz'_28] md:text-4xl">
              <Highlighted
                text={t(section.title)}
                highlight={t(section.highlight)}
                wrap={(phrase) => <span className="bg-linear-to-r from-brand-700 via-brand-500 to-sky-600 bg-clip-text text-transparent">{phrase}</span>}
              />
            </h2>
            {section.intro && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t(section.intro)}</p>}
            {section.badge && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 font-mono text-[10px] font-medium tracking-[0.18em] text-brand-700 uppercase">
                <CircleCheckIcon className="h-3 w-3" />
                {t(section.badge)}
              </div>
            )}
          </div>
          {section.reasons.length > 0 && (
            <ul className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:col-span-8 md:grid-cols-2">
              {section.reasons.map((reason, i) => (
                <li
                  key={i}
                  className={cn(
                    "fc-reveal group relative flex flex-col gap-2 bg-white p-6 transition-colors hover:bg-surface",
                    // An odd last card spans both columns so the grid has no gap.
                    section.reasons.length % 2 === 1 && i === section.reasons.length - 1 && "md:col-span-2",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-lg font-mono text-xs font-semibold tabular-nums",
                      TILE_TONES[i % TILE_TONES.length],
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">{t(reason.title)}</h3>
                  {reason.text && <p className="text-sm leading-relaxed text-muted-foreground">{t(reason.text)}</p>}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-linear-to-r from-brand-600 via-sky-500 to-amber-400 transition-transform duration-300 group-hover:scale-x-100"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

const statColumns = ["", "grid-cols-1 max-w-xs", "grid-cols-2 max-w-xl", "grid-cols-3 max-w-3xl"];

export function DeliveryPromise({ section, tokens }: { section: PromiseSection; tokens: TokenValues }) {
  const t = (text: string) => fillTokens(text, tokens);
  return (
    <section className="fc-band">
      <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
        <div className="fc-reveal text-center">
          <QuoteIcon className="mx-auto mb-6 h-7 w-7 text-amber-300" strokeWidth="1.5" />
          <p className="font-sentient mx-auto max-w-3xl text-2xl leading-tight tracking-tight text-balance text-foreground sm:text-3xl md:text-[2.25rem]">
            <Highlighted text={t(section.quote)} highlight={t(section.highlight)} wrap={(phrase) => <span className="text-brand-700">{phrase}</span>} />
          </p>
          {section.byline && <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t(section.byline)}</p>}
        </div>
        {section.stats.length > 0 && (
          <div
            className={cn(
              "fc-reveal mx-auto mt-12 grid divide-x divide-border overflow-hidden rounded-xl border border-border bg-white",
              statColumns[section.stats.length],
            )}
          >
            {section.stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center px-4 py-5 text-center">
                <p className="font-sentient text-2xl font-semibold tracking-tight text-amber-300 tabular-nums sm:text-3xl">{t(stat.value)}</p>
                {stat.label && <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">{t(stat.label)}</p>}
              </div>
            ))}
          </div>
        )}
        {section.note && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>
              <InlineText text={t(section.note)} linkClassName="underline underline-offset-2 hover:text-foreground/80" />
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export function LatestArticles({ section, posts, tokens }: { section: ArticlesSection; posts: BlogPost[]; tokens: TokenValues }) {
  if (!posts.length) return null;
  const t = (text: string) => fillTokens(text, tokens);
  return (
    <section aria-labelledby="latest-articles-heading">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-10">
          <h2 id="latest-articles-heading" className="text-2xl font-bold tracking-tight md:text-3xl">
            {t(section.title)}
          </h2>
          {section.link.label && section.link.href && (
            <Link
              className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
              href={section.link.href}
            >
              {t(section.link.label)}
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
