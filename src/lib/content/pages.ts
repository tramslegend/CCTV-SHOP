// The shop's editable information pages. Each has built-in content (its route under src/app/(store)); once the owner
// publishes their own version in /admin/content/pages, the route renders that instead, inside the same page frame.
// Client-safe.
import type { PageBlock } from "./blocks";

export const PAGE_SLUGS = [
  "about",
  "delivery",
  "returns",
  "faqs",
  "trade",
  "visit",
  "guides",
  "contact",
  "privacy",
  "terms",
  "cookies",
  "reviews-policy",
] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

/** Page frame the blocks are rendered in (matches the built-in page's look). */
export type PageLayout = "article" | "plain" | "help" | "legal" | "trade" | "visit" | "contact";

export interface PageDef {
  slug: PageSlug;
  path: string;
  /** Name in the admin. */
  label: string;
  group: "Company" | "Help" | "Legal";
  layout: PageLayout;
  /** Small label above the heading, on layouts that show one. */
  kicker?: string;
  /** What the owner edits on this page, shown in the editor. */
  summary: string;
  /** Parts of the page that stay as they are (forms, live shop details…). */
  fixed?: string;
  /** Legal text: the owner is responsible for its accuracy. */
  legal?: boolean;
  /** Show the "last updated" date of the custom version. */
  showUpdated?: boolean;
}

export const PAGE_DEFS: Record<PageSlug, PageDef> = {
  about: {
    slug: "about",
    path: "/about",
    label: "About us",
    group: "Company",
    layout: "article",
    summary: "Who you are, what you sell and how buying works.",
  },
  delivery: {
    slug: "delivery",
    path: "/delivery",
    label: "Delivery & collection",
    group: "Help",
    layout: "plain",
    summary: "Delivery costs, dispatch times and collection.",
  },
  returns: {
    slug: "returns",
    path: "/returns",
    label: "Returns & refunds",
    group: "Legal",
    layout: "legal",
    kicker: "Legal · Returns",
    summary: "Your returns, cancellation and refund policy.",
    legal: true,
    showUpdated: true,
  },
  faqs: {
    slug: "faqs",
    path: "/faqs",
    label: "FAQs",
    group: "Help",
    layout: "help",
    kicker: "Help · UK",
    summary: "Common questions, grouped under headings.",
  },
  trade: {
    slug: "trade",
    path: "/trade",
    label: "Trade accounts",
    group: "Company",
    layout: "trade",
    kicker: "Trade accounts",
    summary: "The heading and intro of the trade page, and the information under it.",
    fixed: "The “Apply for an account” button, your phone number and the application form stay as they are.",
  },
  visit: {
    slug: "visit",
    path: "/visit",
    label: "Visit us",
    group: "Company",
    layout: "visit",
    summary: "The heading and intro, and the information under the address card.",
    fixed: "The address card with opening hours, directions and phone comes from Settings and stays as it is.",
  },
  guides: {
    slug: "guides",
    path: "/guides",
    label: "Guides (intro)",
    group: "Help",
    layout: "help",
    kicker: "Free tool · UK",
    summary: "The heading and intro of the guides hub, plus optional blocks above the guide list.",
    fixed: "The calculator links and the list of guides by topic stay as they are.",
  },
  contact: {
    slug: "contact",
    path: "/contact",
    label: "Contact (intro)",
    group: "Help",
    layout: "contact",
    summary: "The heading and intro of the contact page, plus optional blocks under it.",
    fixed: "Your phone, email, address, opening hours and the contact form stay as they are.",
  },
  privacy: {
    slug: "privacy",
    path: "/privacy",
    label: "Privacy policy",
    group: "Legal",
    layout: "legal",
    kicker: "Legal · Privacy",
    summary: "How you collect and use customers' personal data.",
    legal: true,
    showUpdated: true,
  },
  terms: {
    slug: "terms",
    path: "/terms",
    label: "Terms & conditions",
    group: "Legal",
    layout: "legal",
    kicker: "Legal · Terms",
    summary: "Your terms of sale.",
    legal: true,
    showUpdated: true,
  },
  cookies: {
    slug: "cookies",
    path: "/cookies",
    label: "Cookie policy",
    group: "Legal",
    layout: "legal",
    kicker: "Legal · Cookies",
    summary: "Which cookies the shop uses and why.",
    legal: true,
    showUpdated: true,
  },
  "reviews-policy": {
    slug: "reviews-policy",
    path: "/reviews-policy",
    label: "Reviews policy",
    group: "Legal",
    layout: "plain",
    summary: "How product reviews are collected, checked and published.",
    showUpdated: true,
  },
};

export const isPageSlug = (v: string): v is PageSlug => (PAGE_SLUGS as readonly string[]).includes(v);

/** A published (or previewed) custom version of a page. */
export interface ManagedPageData {
  slug: PageSlug;
  title: string;
  intro: string;
  metaDescription: string;
  blocks: PageBlock[];
  /** ISO timestamp of the last save (the "last updated" date on legal pages). */
  updatedAt: string;
}

const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" });
const fullDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

/** "October 2026" */
export const formatMonthYear = (iso: string) => monthYear.format(new Date(iso));
/** "14 October 2026" */
export const formatFullDate = (iso: string) => fullDate.format(new Date(iso));
