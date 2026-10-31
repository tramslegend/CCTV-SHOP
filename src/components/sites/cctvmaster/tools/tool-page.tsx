import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CONTAINER } from "../account/styles";

/** Layout shared by the three /tools pages: cream hero with the emerald edge, the tool card, then a short explainer. */
export function ToolPage({
  title,
  lede,
  explainerTitle,
  explainer,
  links,
  children,
}: {
  title: string;
  lede: string;
  explainerTitle: string;
  explainer: string[];
  links?: { label: string; href: string }[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-950">
      <section className="relative overflow-hidden border-b border-zinc-100 bg-[#FAF9F6]">
        <div aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-[6px] bg-emerald-600 lg:block" />
        <div className={cn(CONTAINER, "py-12 sm:py-16")}>
          <div className="max-w-3xl">
            <p className="mb-3 font-mono text-xs tracking-widest text-emerald-700 uppercase">Free tool · UK</p>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl md:text-5xl">{title}</h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">{lede}</p>
          </div>
        </div>
      </section>
      <section className="py-12 sm:py-16">
        <div className={cn(CONTAINER, "[--ring:#047857]")}>
          {children}
          <div className="mt-10 max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-600">
            <h2 className="text-foreground text-lg font-semibold">{explainerTitle}</h2>
            {explainer.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
            {links && (
              <p>
              {links.map((link, i) => (
                <Fragment key={link.href}>
                  {i > 0 && " · "}
                  <Link className="text-primary font-semibold hover:underline" href={link.href}>
                    {link.label}
                  </Link>
                </Fragment>
              ))}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Form-control classes the source's calculators use. */
export const calcInput =
  "border-input bg-background w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
export const calcLabel = "text-foreground mb-1.5 block text-sm font-medium";
export const calcCard = "border-border bg-card rounded-xl border p-6 sm:p-8";
export const statLabel = "text-muted-foreground text-xs font-semibold tracking-wider uppercase";
export const statValue = "text-foreground mt-1 text-3xl font-bold tabular-nums";
export const statNote = "text-muted-foreground mt-1 text-sm";
