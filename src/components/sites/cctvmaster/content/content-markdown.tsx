import Link from "next/link";
import type { ComponentProps, JSX } from "react";
import Markdown, { type Components, defaultUrlTransform, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// Markdown written in the admin for blog posts and information pages, rendered with the page's own type styles.
// Same safety rules as the product description renderer (../product/markdown.tsx): raw HTML is never rendered
// (skipHtml), URLs go through react-markdown's sanitiser (plus tel: links), and images may only come from the shop
// itself or its Blob store. Works in server and client components (the admin preview uses it too).

export interface ProseClasses {
  h2: string;
  h3: string;
  h4?: string;
  p: string;
  ul: string;
  ol: string;
  li?: string;
  a: string;
  strong?: string;
  blockquote?: string;
  img?: string;
  hr?: string;
  table?: string;
}

/** Images may only come from the shop itself or its Blob store. */
const isTrustedImage = (src: unknown): src is string =>
  typeof src === "string" &&
  ((src.startsWith("/") && !src.startsWith("//")) || /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(src));

const urlTransform = (url: string) => (/^tel:\+?[\d\s()-]+$/i.test(url) ? url : defaultUrlTransform(url));

interface MdNode {
  type: string;
  depth?: number;
  position?: { start: { line: number } };
  data?: { hProperties?: Record<string, unknown> };
  children?: MdNode[];
}

/** remark plugin: gives top-level headings the anchor ids of the outline (matched by source line). */
function headingIdsPlugin(options: { ids: Record<number, string> }) {
  return (tree: MdNode) => {
    for (const node of tree.children ?? []) {
      if (node.type !== "heading" || (node.depth ?? 9) > 3) continue;
      const id = node.position ? options.ids[node.position.start.line] : undefined;
      if (id) node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
    }
  };
}

type Props<T extends keyof JSX.IntrinsicElements> = ComponentProps<T> & ExtraProps;

/** react-markdown passes its syntax-tree node along; it must not reach the DOM. */
function dom<T extends ExtraProps>(props: T): Omit<T, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

const componentCache = new WeakMap<ProseClasses, Components>();

/** Element renderers for a style set (cached: style sets are module constants, so React keeps the same components). */
function componentsFor(c: ProseClasses): Components {
  let found = componentCache.get(c);
  if (!found) componentCache.set(c, (found = buildComponents(c)));
  return found;
}

function buildComponents(c: ProseClasses): Components {
  return {
    // The page or article title is the h1: markdown headings start at h2.
    h1: (props: Props<"h1">) => <h2 {...dom(props)} className={c.h2} />,
    h2: (props: Props<"h2">) => <h2 {...dom(props)} className={c.h2} />,
    h3: (props: Props<"h3">) => <h3 {...dom(props)} className={c.h3} />,
    h4: (props: Props<"h4">) => <h4 {...dom(props)} className={c.h4 ?? "mt-6 mb-2 font-semibold"} />,
    h5: (props: Props<"h5">) => <h4 {...dom(props)} className={c.h4 ?? "mt-6 mb-2 font-semibold"} />,
    h6: (props: Props<"h6">) => <h4 {...dom(props)} className={c.h4 ?? "mt-6 mb-2 font-semibold"} />,
    p: (props: Props<"p">) => <p {...dom(props)} className={c.p} />,
    ul: (props: Props<"ul">) => <ul {...dom(props)} className={c.ul} />,
    ol: (props: Props<"ol">) => <ol {...dom(props)} className={c.ol} />,
    li: (props: Props<"li">) => <li {...dom(props)} className={c.li} />,
    strong: (props: Props<"strong">) => <strong {...dom(props)} className={c.strong ?? "text-foreground font-semibold"} />,
    em: (props: Props<"em">) => <em {...dom(props)} className="italic" />,
    blockquote: (props: Props<"blockquote">) => (
      <blockquote {...dom(props)} className={c.blockquote ?? "my-5 border-l-4 border-border pl-4 text-muted-foreground"} />
    ),
    hr: (props: Props<"hr">) => <hr {...dom(props)} className={c.hr ?? "my-8 border-border"} />,
    code: (props: Props<"code">) => <code {...dom(props)} className="rounded bg-muted px-1 py-0.5 text-[0.9em]" />,
    pre: (props: Props<"pre">) => <pre {...dom(props)} className="my-4 overflow-x-auto rounded-lg bg-surface p-4 [&_code]:bg-transparent [&_code]:p-0" />,
    // Unsafe URLs (javascript: …) arrive with an empty href: show their text without a link.
    a: ({ href, children }: Props<"a">) =>
      !href ? (
        <span>{children}</span>
      ) : href.startsWith("/") && !href.startsWith("//") ? (
        <Link href={href} className={c.a}>
          {children}
        </Link>
      ) : /^https?:\/\//i.test(href) ? (
        <a href={href} className={c.a} target="_blank" rel="noopener noreferrer nofollow">
          {children}
        </a>
      ) : (
        <a href={href} className={c.a}>
          {children}
        </a>
      ),
    img: ({ src, alt }: Props<"img">) =>
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary sizes inside rich text; sources are restricted above
      isTrustedImage(src) ? <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" className={c.img ?? "my-6 h-auto max-w-full rounded-lg"} /> : null,
    table: (props: Props<"table">) => (
      <div className="my-5 overflow-x-auto">
        <table {...dom(props)} className={c.table ?? "w-full border-collapse text-sm [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold"} />
      </div>
    ),
  };
}

/**
 * Admin-written markdown with the given type styles. `headingIds` (source line → anchor id, from markdownHeadings())
 * puts the outline's anchors on the matching headings, so a table of contents can link to them.
 */
export function ContentMarkdown({
  source,
  classes,
  headingIds,
  className,
}: {
  source: string;
  classes: ProseClasses;
  headingIds?: Record<number, string>;
  className?: string;
}) {
  const body = (
    <Markdown
      remarkPlugins={headingIds ? [remarkGfm, [headingIdsPlugin, { ids: headingIds }]] : [remarkGfm]}
      components={componentsFor(classes)}
      urlTransform={urlTransform}
      skipHtml
    >
      {source}
    </Markdown>
  );
  return className ? <div className={cn(className)}>{body}</div> : body;
}
