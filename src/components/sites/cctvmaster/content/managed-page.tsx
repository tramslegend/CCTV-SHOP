import Link from "next/link";
import type { ReactNode } from "react";
import { fillBlock, fillTokens, tokenValues } from "@/lib/content/blocks";
import { formatFullDate, formatMonthYear, type ManagedPageData, PAGE_DEFS } from "@/lib/content/pages";
import type { ShopSettings } from "@/lib/settings/schema";
import { cn } from "@/lib/utils";
import { type BlockVariant, PageBlocks } from "./page-blocks";
import { ContactHero, TradeHero, VisitHero } from "./page-heroes";
import { article, CONTAINER, HelpHero, legal, LegalShell } from "./page-parts";

// An information page written in /admin/content/pages, rendered inside the frame of the built-in page it replaces.
// `slot` is the part of the page that stays built in (the trade application form, the visit page's address card, the
// contact form, the guide list); the admin preview passes a placeholder. Client-safe.

export function ManagedPage({ page, settings, slot }: { page: ManagedPageData; settings: ShopSettings; slot?: ReactNode }) {
  const def = PAGE_DEFS[page.slug];
  const tokens = tokenValues(settings);
  const title = fillTokens(page.title, tokens);
  const intro = fillTokens(page.intro, tokens);
  const blocks = page.blocks.map((b) => fillBlock(b, tokens));
  const body = (variant: BlockVariant) => <PageBlocks blocks={blocks} variant={variant} />;

  switch (def.layout) {
    case "article":
      return (
        <div className={cn(CONTAINER, "py-12")}>
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {intro && <p className={cn(article.p, "text-base md:text-lg")}>{intro}</p>}
          {body("article")}
          {slot}
        </div>
      );

    case "plain":
      return (
        <div className={cn(CONTAINER, "py-12 md:py-16")}>
          <nav className="text-muted-foreground mb-6 text-sm" aria-label="Breadcrumb">
            <Link className="hover:underline" href="/">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span aria-current="page">{title}</span>
          </nav>
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {intro && <p className="text-muted-foreground mb-2 max-w-2xl text-base leading-relaxed md:text-lg">{intro}</p>}
          {def.showUpdated && <p className="text-muted-foreground text-sm">Last updated {formatFullDate(page.updatedAt)}</p>}
          <div className="mt-10">{body("plain")}</div>
          {slot}
        </div>
      );

    case "help":
      return (
        <div className="flex min-h-full flex-col bg-white text-foreground">
          <HelpHero kicker={def.kicker ?? ""} title={title} intro={intro} />
          {blocks.length > 0 && (
            <section className={slot ? "pt-12 sm:pt-16" : "py-12 sm:py-16"}>
              <div className={CONTAINER}>
                <div className={cn("max-w-3xl", def.slug === "faqs" && "mx-auto")}>{body("help")}</div>
              </div>
            </section>
          )}
          {slot}
        </div>
      );

    case "legal":
      return (
        <LegalShell store={settings.store} crumb={title} kicker={def.kicker ?? "Legal"} title={title} updated={formatMonthYear(page.updatedAt)}>
          <div className="max-w-none text-base">
            {intro && <p className={cn(legal.p, "text-lg")}>{intro}</p>}
            {body("legal")}
          </div>
          {slot}
        </LegalShell>
      );

    case "trade":
      return (
        <>
          <TradeHero kicker={def.kicker ?? ""} title={title} intro={intro} phone={settings.store.phone} />
          {blocks.length > 0 && <section className="mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">{body("article")}</section>}
          {slot}
        </>
      );

    case "visit":
      return (
        <div className="min-h-screen">
          <VisitHero title={title} intro={intro} />
          <section className="py-12 sm:py-16">
            <div className={cn(CONTAINER, "space-y-8")}>
              {slot}
              {blocks.length > 0 && <div>{body("article")}</div>}
            </div>
          </section>
        </div>
      );

    case "contact":
      return (
        <div className="bg-white text-foreground">
          <ContactHero title={title} intro={intro} />
          {blocks.length > 0 && (
            <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
              <div className="max-w-3xl">{body("article")}</div>
            </section>
          )}
          {slot}
        </div>
      );
  }
}
