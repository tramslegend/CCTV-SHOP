import type { ProseClasses } from "./content-markdown";

// Article copy styles of the blog post page (the source uses @tailwindcss/typography; this clone sets the same metrics
// explicitly). Client-safe: the post editor's preview uses them too.

export const POST_H2 =
  "text-foreground mt-12 mb-4 scroll-mt-28 text-[1.75rem] leading-[1.2] font-bold tracking-[-0.015em] first:mt-4 md:text-[2rem]";
export const POST_H3 =
  "text-foreground mt-9 mb-3 scroll-mt-28 text-[1.375rem] leading-[1.2] font-semibold tracking-[-0.015em] md:text-2xl";
export const POST_P = "my-4 leading-[1.7] text-[oklab(0.1912_0_0)]";

/** The same metrics for an article body written in the admin (markdown). */
export const POST_BODY: ProseClasses = {
  h2: POST_H2,
  h3: POST_H3,
  h4: "text-foreground mt-7 mb-2 text-lg font-semibold",
  p: POST_P,
  ul: "my-4 list-disc pl-6 leading-[1.7]",
  ol: "my-4 list-decimal pl-6 leading-[1.7]",
  li: "my-1.5",
  a: "text-primary font-semibold underline",
  strong: "text-foreground font-semibold",
};
