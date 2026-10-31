import type { ComponentProps } from "react";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// Product descriptions written in the admin (markdown). Raw HTML is never rendered (skipHtml) and link/image URLs go
// through react-markdown's default sanitiser, so a description can't inject markup or scripts into the shop.

/** Prose metrics matching the generated "Product Description" copy, plus the extra elements markdown can produce. */
export const markdownProseClass =
  "max-w-none text-base leading-[1.7] text-[oklch(0.1912_0_0)] [&>:first-child]:mt-0 [&>:last-child]:mb-0 " +
  "[&_h3]:text-foreground [&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:text-[22px] [&_h3]:leading-[1.2] [&_h3]:font-semibold sm:[&_h3]:text-2xl " +
  "[&_h4]:text-foreground [&_h4]:mt-7 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold [&_h5]:mt-6 [&_h5]:mb-2 [&_h5]:font-semibold " +
  "[&_li]:my-1.5 [&_p]:my-4 [&_strong]:text-foreground [&_strong]:font-semibold [&_em]:italic " +
  "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 " +
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:no-underline " +
  "[&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_blockquote]:text-gray-600 " +
  "[&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-50 [&_pre]:p-4 " +
  "[&_hr]:my-8 [&_hr]:border-gray-100 [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg " +
  "[&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border-b [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border-b [&_td]:border-gray-100 [&_td]:px-3 [&_td]:py-2";

/** Images may only come from the shop itself or its Blob store. */
const isTrustedImage = (src: unknown): src is string =>
  typeof src === "string" &&
  ((src.startsWith("/") && !src.startsWith("//")) || /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(src));

type Props<T extends keyof React.JSX.IntrinsicElements> = ComponentProps<T> & ExtraProps;

/** react-markdown passes its syntax-tree node along; it must not reach the DOM. */
function dom<T extends ExtraProps>(props: T): Omit<T, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

// The section already has an h2 ("Product Description"), so markdown headings start one level below it.
const components: Components = {
  h1: (props: Props<"h1">) => <h3 {...dom(props)} />,
  h2: (props: Props<"h2">) => <h3 {...dom(props)} />,
  h3: (props: Props<"h3">) => <h4 {...dom(props)} />,
  h4: (props: Props<"h4">) => <h5 {...dom(props)} />,
  h5: (props: Props<"h5">) => <h6 {...dom(props)} />,
  // Unsafe URLs (javascript: …) arrive with an empty href: show their text without a link.
  a: (props: Props<"a">) =>
    !props.href ? (
      <span>{props.children}</span>
    ) : /^https?:\/\//i.test(props.href) ? (
      <a {...dom(props)} target="_blank" rel="noopener noreferrer nofollow" />
    ) : (
      <a {...dom(props)} />
    ),
  img: ({ src, alt }: Props<"img">) =>
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary sizes inside rich text; sources are restricted above
    isTrustedImage(src) ? <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" /> : null,
  table: (props: Props<"table">) => (
    <div className="overflow-x-auto">
      <table {...dom(props)} />
    </div>
  ),
};

/** Renders admin-written markdown as sanitised HTML (works in server and client components). */
export function MarkdownContent({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn(markdownProseClass, className)}>
      <Markdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {source}
      </Markdown>
    </div>
  );
}
