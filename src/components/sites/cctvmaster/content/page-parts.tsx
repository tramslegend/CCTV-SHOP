import { ChevronRight, Mail, Phone } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { telHref } from "@/lib/settings/format";
import type { StoreSettings } from "@/lib/settings/schema";
import { cn } from "@/lib/utils";
import { RichText } from "./rich-text";

// Building blocks shared by the company, help and legal pages. Client-safe (no server imports): the page editor's
// preview in the back office renders the same frames.

/** The source's customised `container`: centred, 1280px max, 16/24/32px gutters. */
export const CONTAINER = "mx-auto w-full max-w-[1280px] px-4 sm:px-6 xl:px-8";

/** Plain article styles used on /about, /visit and the lower half of /trade. */
export const article = {
  h2: "mt-10 mb-4 text-2xl font-semibold tracking-tight",
  p: "text-muted-foreground mb-4 leading-relaxed",
  ul: "text-muted-foreground mb-4 list-disc space-y-2 pl-6",
  link: "text-foreground font-medium underline underline-offset-2",
};

/** Question-and-answer list in the plain article style. */
export function QaList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mb-6 space-y-5">
      {items.map((item) => (
        <div key={item.q}>
          <h3 className="mb-1 font-semibold">{item.q}</h3>
          <p className="text-muted-foreground leading-relaxed">
            <RichText text={item.a} linkClassName={article.link} />
          </p>
        </div>
      ))}
    </div>
  );
}

/** Muted call-to-action box with a single primary button. */
export function CtaBox({ title, body, href, label }: { title: string; body: string; href: string; label: string }) {
  return (
    <div className="bg-muted/50 my-8 rounded-lg border p-6">
      <h2 className="mb-2 text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mb-4">{body}</p>
      <Link
        className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium"
        href={href}
      >
        {label}
      </Link>
    </div>
  );
}

/** Cream hero with the emerald edge bar, as on /guides and /faqs. */
export function HelpHero({ kicker, title, intro }: { kicker: string; title: string; intro: string }) {
  return (
    <section className="fc-band border-b border-border">
      <div className="absolute inset-y-0 left-0 hidden w-[6px] bg-brand-600 lg:block" aria-hidden="true" />
      <div className={cn(CONTAINER, "py-12 sm:py-16")}>
        <div className="max-w-3xl">
          <p className="mb-3 font-mono text-xs tracking-widest text-brand-700 uppercase">{kicker}</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">{title}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{intro}</p>
        </div>
      </div>
    </section>
  );
}

/** Mono breadcrumb used by the contact and legal heroes. */
export function MonoBreadcrumb({ label, className }: { label: string; className?: string }) {
  return (
    <nav
      className={cn(
        "flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase",
        className,
      )}
      aria-label="Breadcrumb"
    >
      <Link className="transition-colors hover:text-brand-700" href="/">
        Home
      </Link>
      <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="text-brand-700">{label}</span>
    </nav>
  );
}

// ---------- legal pages ----------

export type LegalBlock =
  | { type: "h2"; text: string; id?: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

/** A titled group of blocks; `id` becomes the section's aria-labelledby heading id, as on /terms and /returns. */
export interface LegalSection {
  id?: string;
  title: string;
  blocks: LegalBlock[];
}

export const legal = {
  h2: "mt-12 mb-4 text-[1.75rem] leading-[1.2] font-bold tracking-[-0.015em] text-foreground md:text-[2rem]",
  h3: "mt-9 mb-3 text-[1.375rem] leading-[1.2] font-semibold tracking-[-0.015em] text-foreground md:text-2xl",
  p: "my-4 leading-[1.7] text-[oklab(0.1912_0_0)]",
  ul: "my-4 list-disc pl-6 leading-[1.7] text-[oklab(0.1912_0_0)] marker:text-brand-600",
  li: "my-1.5",
  link: "text-primary underline font-normal",
};

function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={i} id={block.id} className={legal.h2}>
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className={legal.h3}>
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={i} className={legal.ul}>
                {block.items.map((item) => (
                  <li key={item} className={legal.li}>
                    <RichText text={item} linkClassName={legal.link} />
                  </li>
                ))}
              </ul>
            );
          default:
            return (
              <p key={i} className={legal.p}>
                <RichText text={block.text} linkClassName={legal.link} />
              </p>
            );
        }
      })}
    </>
  );
}

/** Legal page body. Sections with an id are wrapped in <section aria-labelledby>, the rest render flat. */
export function LegalBody({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="max-w-none text-base">
      {sections.map((s) =>
        s.id ? (
          <section key={s.title} aria-labelledby={s.id}>
            <LegalBlocks blocks={[{ type: "h2", text: s.title, id: s.id }, ...s.blocks]} />
          </section>
        ) : (
          <div key={s.title} className="contents">
            <LegalBlocks blocks={[{ type: "h2", text: s.title }, ...s.blocks]} />
          </div>
        ),
      )}
    </div>
  );
}

/** Legal page frame; the "Questions about this policy?" strip uses the phone and email from Settings. */
export function LegalShell({
  store,
  crumb,
  kicker,
  title,
  updated,
  children,
}: {
  store: Pick<StoreSettings, "phone" | "email">;
  crumb: string;
  kicker: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  const phoneHref = telHref(store.phone);
  const linkClass =
    "inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800 focus-visible:underline focus-visible:outline-none";
  return (
    <div className="flex min-h-full flex-col text-foreground">
      <section className="fc-band border-b border-border">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-2 bg-brand-50 lg:block" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-y-0 left-2 hidden w-px bg-brand-200/60 lg:block"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-6 mx-auto h-px max-w-5xl bg-linear-to-r from-transparent via-brand-300/30 to-transparent"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <MonoBreadcrumb label={crumb} className="mb-5" />
          <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-brand-800 uppercase">{kicker}</p>
          <h1 className="font-sentient mt-3 text-3xl leading-[1.05] font-bold tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase tabular-nums">
            Last updated · {updated}
          </p>
        </div>
        <div
          className="relative h-px w-full bg-linear-to-r from-transparent via-brand-500/40 to-transparent"
          aria-hidden="true"
        />
      </section>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">{children}</div>
      <div className="border-t border-border bg-surface/60">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Questions about this policy?
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {phoneHref && (
              <a className={linkClass} href={phoneHref}>
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {store.phone}
              </a>
            )}
            {store.email && (
              <a className={linkClass} href={`mailto:${store.email}`}>
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {store.email}
              </a>
            )}
            {!phoneHref && !store.email && (
              <Link className={linkClass} href="/contact">
                Contact us
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
