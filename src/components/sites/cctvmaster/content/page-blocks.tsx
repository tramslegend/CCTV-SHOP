import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { type PageBlock, uniqueIds } from "@/lib/content/blocks";
import { cn } from "@/lib/utils";
import { ContentMarkdown, type ProseClasses } from "./content-markdown";
import { article, legal } from "./page-parts";

// Renders an information page's content blocks (written in /admin/content/pages) in the type styles of the page they
// replace: "article" (/about, /visit, /trade), "plain" (/delivery, /reviews-policy), "help" (/faqs, /guides) and
// "legal" (/privacy, /terms, /cookies, /returns). Client-safe: the page editor's preview uses it as well.

export type BlockVariant = "article" | "plain" | "help" | "legal";

const helpLink = "font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800";

const PROSE: Record<BlockVariant, ProseClasses> = {
  article: {
    h2: article.h2,
    h3: "mt-8 mb-2 text-lg font-semibold",
    p: article.p,
    ul: article.ul,
    ol: "text-muted-foreground mb-4 list-decimal space-y-2 pl-6",
    a: article.link,
  },
  plain: {
    h2: "mt-10 mb-3 text-xl font-bold tracking-tight first:mt-0 sm:text-2xl",
    h3: "mt-6 mb-2 font-semibold",
    p: "text-muted-foreground mb-3 text-sm leading-relaxed md:text-base",
    ul: "text-muted-foreground mb-3 list-disc space-y-1.5 pl-6 text-sm leading-relaxed md:text-base",
    ol: "text-muted-foreground mb-3 list-decimal space-y-1.5 pl-6 text-sm leading-relaxed md:text-base",
    a: "text-foreground font-semibold underline underline-offset-2",
  },
  help: {
    h2: "mt-12 mb-5 text-xl font-semibold tracking-tight text-foreground first:mt-0 sm:text-2xl",
    h3: "mt-8 mb-3 font-semibold text-foreground",
    p: "my-3 text-sm leading-relaxed text-muted-foreground",
    ul: "my-3 list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-muted-foreground",
    ol: "my-3 list-decimal space-y-1.5 pl-6 text-sm leading-relaxed text-muted-foreground",
    a: helpLink,
  },
  legal: {
    h2: legal.h2,
    h3: legal.h3,
    p: legal.p,
    ul: legal.ul,
    ol: legal.ul.replace("list-disc", "list-decimal"),
    li: legal.li,
    a: legal.link,
  },
};

/** Answer text inside a question block: same links, tighter paragraphs. */
const ANSWER: Record<BlockVariant, ProseClasses> = {
  article: { ...PROSE.article, p: "text-muted-foreground leading-relaxed [&+p]:mt-2" },
  plain: { ...PROSE.plain, p: "text-muted-foreground text-sm leading-relaxed [&+p]:mt-2" },
  help: { ...PROSE.help, p: "text-sm leading-relaxed text-muted-foreground [&+p]:mt-2" },
  legal: { ...PROSE.legal, p: "leading-[1.7] text-[oklab(0.1912_0_0)] [&+p]:mt-2" },
};

/** Text in a notice box. */
const NOTICE: ProseClasses = {
  ...PROSE.article,
  p: "text-muted-foreground mb-3 leading-relaxed last:mb-0",
  ul: "text-muted-foreground mb-3 list-disc space-y-1.5 pl-6 last:mb-0",
  a: "text-foreground font-semibold underline underline-offset-2",
};

const TONE: Record<string, string> = {
  note: "bg-muted/50 border",
  important: "border border-amber-200 bg-amber-50",
  success: "border border-emerald-200 bg-emerald-50",
};

const isSafeHref = (href: string) => /^(\/(?!\/)|https?:\/\/|mailto:|tel:|#)/i.test(href);
const isTrustedImage = (src: string) =>
  (src.startsWith("/") && !src.startsWith("//")) || /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(src);

function BlockLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  if (href.startsWith("/") || href.startsWith("#"))
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  const external = /^https?:\/\//i.test(href);
  return (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

function Faq({ items, variant }: { items: { id: string; q: string; a: string }[]; variant: BlockVariant }) {
  const shown = items.filter((i) => i.q.trim());
  if (!shown.length) return null;
  if (variant === "help")
    return (
      <div className="mb-6 flex flex-col gap-6">
        {shown.map((item) => (
          <details key={item.id} open className="group border-b border-border pb-5">
            <summary className="mb-2 flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
              <span>{item.q}</span>
              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <ContentMarkdown source={item.a} classes={ANSWER.help} />
          </details>
        ))}
      </div>
    );
  if (variant === "plain")
    return (
      <div className="mb-12 grid gap-6 md:grid-cols-2">
        {shown.map((item) => (
          <div key={item.id}>
            <h3 className="mb-2 font-semibold">{item.q}</h3>
            <ContentMarkdown source={item.a} classes={ANSWER.plain} />
          </div>
        ))}
      </div>
    );
  return (
    <div className={cn("space-y-5", variant === "legal" ? "my-6" : "mb-6")}>
      {shown.map((item) => (
        <div key={item.id}>
          <h3 className={cn("mb-1 font-semibold", variant === "legal" && "text-foreground")}>{item.q}</h3>
          <ContentMarkdown source={item.a} classes={ANSWER[variant]} />
        </div>
      ))}
    </div>
  );
}

function Facts({ items, variant }: { items: { id: string; label: string; value: string; note: string }[]; variant: BlockVariant }) {
  const shown = items.filter((i) => i.label.trim() || i.value.trim());
  if (!shown.length) return null;
  const cols = shown.length === 1 ? "" : shown.length === 2 || shown.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-3";
  return (
    <dl className={cn("grid gap-4", cols, variant === "plain" ? "mb-12" : "my-8")}>
      {shown.map((s) => (
        <div key={s.id} className="bg-muted/40 rounded-xl border p-5">
          <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{s.label}</dt>
          {s.value && <dd className="mt-2 text-2xl font-bold">{s.value}</dd>}
          {s.note && <dd className="text-muted-foreground mt-1 text-sm">{s.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function PageBlocks({ blocks, variant }: { blocks: PageBlock[]; variant: BlockVariant }) {
  const prose = PROSE[variant];
  const headings = blocks.filter((b): b is Extract<PageBlock, { type: "heading" }> => b.type === "heading" && !!b.text.trim());
  const ids = new Map(uniqueIds(headings.map((h) => h.text)).map((id, i) => [headings[i].id, id]));

  return (
    <>
      {blocks.map((block) => {
        switch (block.type) {
          case "heading": {
            if (!block.text.trim()) return null;
            const Tag = block.level === 3 ? "h3" : "h2";
            return (
              <Tag key={block.id} id={ids.get(block.id)} className={cn(block.level === 3 ? prose.h3 : prose.h2, "scroll-mt-24")}>
                {block.text}
              </Tag>
            );
          }
          case "text":
            return block.markdown.trim() ? <ContentMarkdown key={block.id} source={block.markdown} classes={prose} /> : null;
          case "faq":
            return <Faq key={block.id} items={block.items} variant={variant} />;
          case "facts":
            return <Facts key={block.id} items={block.items} variant={variant} />;
          case "callout": {
            if (!block.title.trim() && !block.body.trim()) return null;
            const href = block.linkHref.trim();
            return (
              <div key={block.id} className={cn("my-8 rounded-lg p-6", TONE[block.tone] ?? TONE.note)}>
                {block.title.trim() && <h2 className="mb-2 text-xl font-semibold">{block.title}</h2>}
                {block.body.trim() && <ContentMarkdown source={block.body} classes={NOTICE} />}
                {href && block.linkLabel.trim() && isSafeHref(href) && (
                  <BlockLink
                    href={href}
                    className="bg-primary text-primary-foreground mt-4 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium"
                  >
                    {block.linkLabel}
                  </BlockLink>
                )}
              </div>
            );
          }
          case "image":
            if (!block.url || !isTrustedImage(block.url)) return null;
            return (
              <figure key={block.id} className="my-8">
                <Image
                  src={block.url}
                  alt={block.alt}
                  width={1600}
                  height={900}
                  sizes="(max-width: 1280px) 100vw, 1200px"
                  className="h-auto w-full rounded-xl border bg-surface"
                />
                {block.caption.trim() && <figcaption className="text-muted-foreground mt-2 text-sm">{block.caption}</figcaption>}
              </figure>
            );
        }
      })}
    </>
  );
}
