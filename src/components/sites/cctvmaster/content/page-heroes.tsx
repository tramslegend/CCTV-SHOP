import { ArrowRight, Phone, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { telHref } from "@/lib/settings/format";
import { cn } from "@/lib/utils";
import { CONTAINER, MonoBreadcrumb } from "./page-parts";

// Heroes of /trade, /visit and /contact, shared by the built-in pages and the versions written in the admin.
// Client-safe.

export function TradeHero({
  kicker,
  title,
  intro,
  note,
  phone,
}: {
  kicker: string;
  title: string;
  intro?: string;
  note?: string;
  phone: string;
}) {
  const phoneHref = telHref(phone);
  return (
    <section className="fc-band border-b border-border">
      <div className="mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">
        <p className="font-mono text-[10px] tracking-[0.18em] text-brand-700 uppercase">{kicker}</p>
        <h1 className="mt-3 max-w-3xl text-3xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {intro && <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">{intro}</p>}
        {note && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{note}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            href="#apply"
          >
            Apply for an account
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          {phoneHref && (
            <a
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-white"
              href={phoneHref}
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {phone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export function VisitHero({ title, intro }: { title: string; intro?: string }) {
  return (
    <section className="fc-band border-b border-border">
      <div className={cn(CONTAINER, "py-12 sm:py-16")}>
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-muted-foreground mb-4 flex items-center justify-center gap-2 text-xs sm:text-sm">
            <Link className="hover:text-primary transition-colors" href="/">
              Home
            </Link>
            <span>/</span>
            <span className="text-primary font-medium">Find Us</span>
          </div>
          <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">{title}</h1>
          {intro && <p className="text-base text-foreground/80 sm:text-lg">{intro}</p>}
        </div>
      </div>
    </section>
  );
}

export function ContactHero({ title, intro, badge }: { title: string; intro?: ReactNode; badge?: string }) {
  return (
    <section className="fc-band border-b border-border">
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[38%] bg-brand-50/70 lg:block" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-y-0 left-[38%] hidden w-px bg-linear-to-b from-transparent via-brand-300/40 to-transparent lg:block"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-8 mx-auto h-px max-w-6xl bg-linear-to-r from-transparent via-brand-300/30 to-transparent"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <MonoBreadcrumb label="Contact" className="mb-6" />
        {badge && (
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 font-mono text-[10px] font-medium tracking-[0.18em] text-brand-800 uppercase">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {badge}
          </span>
        )}
        <h1
          className={cn(
            "font-sentient max-w-3xl text-4xl leading-[1.05] font-bold tracking-tight text-balance text-foreground sm:text-5xl md:text-6xl",
            badge && "mt-5",
          )}
        >
          {title}
        </h1>
        {intro && <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{intro}</p>}
      </div>
    </section>
  );
}
