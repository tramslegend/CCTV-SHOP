// Blog structure (body or outline with section summaries, FAQ, related posts, tags, sources) stored with each post in
// the database. Server-only: import from server components and metadata only, after `await ensureCatalog()`.
import { getBlogBody, getBlogExtras, getBlogOrder, getBlogPost, getBlogPosts } from "@/lib/cctvmaster/catalog";
import type { BlogPost } from "@/lib/cctvmaster/types";
import { markdownHeadings, readingMinutes as minutes } from "@/lib/content/markdown";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface PostContent {
  /** Article body written in the admin (markdown). When set, it replaces the outline below. */
  markdown?: string;
  /** Source line → heading anchor, for the body's headings (see ContentMarkdown). */
  headingIds?: Record<number, string>;
  toc: TocItem[];
  /** Outline section summaries by heading id (posts without a body). */
  body: Record<string, string>;
  faq: { q: string; a: string }[];
  products: string[];
  related: string[];
  tags: string[];
  sources: { title: string; href: string }[];
}

export const BLOG_PAGE_SIZE = 12;

/** Posts in the source's /blog listing order. */
export function getListedPosts(): BlogPost[] {
  const bySlug = new Map(getBlogPosts().map((p) => [p.slug, p]));
  return getBlogOrder()
    .map((slug) => bySlug.get(slug))
    .filter((p): p is BlogPost => !!p);
}

export function getPostContent(slug: string): PostContent | undefined {
  const c = getBlogExtras(slug) ?? {};
  const markdown = getBlogBody(slug);
  if (!markdown && !c.toc) return undefined;
  const headings = markdown ? markdownHeadings(markdown) : [];
  return {
    markdown,
    headingIds: markdown ? Object.fromEntries(headings.map((h) => [h.line, h.id])) : undefined,
    toc: markdown
      ? headings.map(({ id, text, level }) => ({ id, text, level }))
      : (c.toc ?? []).map(([id, text, level]) => ({ id, text, level: level === 3 ? 3 : 2 })),
    body: c.body ?? {},
    faq: (c.faq ?? []).map(([q, a]) => ({ q, a })),
    products: c.products ?? [],
    related: c.related ?? [],
    tags: c.tags ?? [],
    sources: (c.sources ?? []).map(([title, href]) => ({ title, href })),
  };
}

export function getRelatedPosts(slugs: string[]): BlogPost[] {
  return slugs.map((s) => getBlogPost(s)).filter((p): p is BlogPost => !!p);
}

/** Reading time as the source computes it: whole minutes at 200 words a minute. */
export const readingMinutes = (wordCount?: number) => minutes(wordCount);

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-10-06" → "6 October 2026" */
export const formatPostDate = (iso?: string) => (iso ? dateFormat.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)) : "");
