// Homepage content, stored in the `settings` table under the key "homepage" and edited at /admin/content/homepage.
// One typed shape, neutral defaults and a lenient parser: a missing or malformed value never breaks the homepage (each
// field falls back to its default). Nothing shop-specific belongs here: the owner writes the real copy in the admin.
// Client-safe (no server imports).
import { z } from "zod";

export const HOMEPAGE_KEY = "homepage";

export const SECTION_IDS = ["hero", "categories", "popular", "whyUs", "promise", "articles", "cta"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_LABELS: Record<SectionId, string> = {
  hero: "Hero",
  categories: "Shop by category",
  popular: "Popular products",
  whyUs: "Why us",
  promise: "Delivery promise",
  articles: "Latest articles",
  cta: "Call-to-action band",
};

/** Small icons offered for trust points and footer highlights (drawn by the storefront's FeatureIcon). */
export const FEATURE_ICONS = ["truck", "shield", "headphones", "pound", "lock", "clock", "package", "check", "phone", "mail", "store", "sparkles"] as const;
export type FeatureIconName = (typeof FEATURE_ICONS)[number];

export const FEATURE_ICON_LABELS: Record<FeatureIconName, string> = {
  truck: "Delivery van",
  shield: "Shield",
  headphones: "Headset",
  pound: "Pound sign",
  lock: "Padlock",
  clock: "Clock",
  package: "Parcel",
  check: "Tick",
  phone: "Phone",
  mail: "Envelope",
  store: "Shop front",
  sparkles: "Sparkles",
};

export interface LinkSetting {
  label: string;
  /** "/path", "https://…", "mailto:…" or "tel:…". */
  href: string;
}

export interface FeaturePoint {
  icon: FeatureIconName;
  title: string;
  detail: string;
}

export interface BrandSetting {
  name: string;
  /** Optional logo; the name is shown when empty. */
  logoUrl: string;
}

export interface HeroSettings {
  eyebrow: string;
  headline: string;
  /** Words of the headline shown in a lighter colour (must appear in the headline). */
  highlight: string;
  intro: string;
  primary: LinkSetting;
  secondary: LinkSetting;
  searchPlaceholder: string;
  /** Line under the search box; may contain one [link text](/path). */
  note: string;
  trustPoints: FeaturePoint[];
  brandsTitle: string;
  brands: BrandSetting[];
  /** Kit product shown in the card on the right (by product id). Empty = no card. */
  kit: { productId: string; label: string; badge: string; chip: string };
}

export interface CategoriesSection {
  eyebrow: string;
  title: string;
  highlight: string;
  link: LinkSetting;
  /** "auto": visible top-level categories in their admin order. "pick": the categories in `picks`, in that order. */
  mode: "auto" | "pick";
  picks: string[];
  /** Tile image per category slug, overriding the category's own image. */
  images: Record<string, string>;
}

export interface PopularSection {
  title: string;
  subtitle: string;
  link: LinkSetting;
  /** "auto": most ordered in the last 12 months (topped up from the categories). "pick": `picks` (product ids) in order. */
  mode: "auto" | "pick";
  picks: string[];
  count: number;
}

export interface WhyUsSection {
  eyebrow: string;
  title: string;
  highlight: string;
  intro: string;
  badge: string;
  reasons: { title: string; text: string }[];
}

export interface PromiseSection {
  quote: string;
  highlight: string;
  byline: string;
  stats: { value: string; label: string }[];
  /** Small print under the figures; may contain one [link text](/path). */
  note: string;
}

export interface ArticlesSection {
  title: string;
  count: number;
  link: LinkSetting;
}

export interface CtaSection {
  eyebrow: string;
  headline: string;
  highlight: string;
  text: string;
  /** The first button is the solid one. */
  buttons: LinkSetting[];
}

export interface HomepageSettings {
  /** Display order, each section on or off. */
  sections: { id: SectionId; enabled: boolean }[];
  hero: HeroSettings;
  categories: CategoriesSection;
  popular: PopularSection;
  whyUs: WhyUsSection;
  promise: PromiseSection;
  articles: ArticlesSection;
  cta: CtaSection;
}

export const LIMITS = {
  trustPoints: 4,
  brands: 12,
  categoryPicks: 12,
  popularPicks: 12,
  reasons: 6,
  stats: 3,
  ctaButtons: 3,
} as const;

export const POPULAR_COUNTS = [4, 8, 12] as const;
export const ARTICLE_COUNTS = [3, 6, 9] as const;

// ---------- neutral defaults ----------

export const DEFAULT_HOMEPAGE: HomepageSettings = {
  sections: SECTION_IDS.map((id) => ({ id, enabled: true })),
  hero: {
    eyebrow: "Welcome",
    headline: "Everything you need, in one place.",
    highlight: "in one place.",
    intro: "Browse the range, compare products side by side and order online for quick UK delivery. Not sure what to choose? Get in touch and we'll help.",
    primary: { label: "Shop all products", href: "/products" },
    secondary: { label: "Contact us", href: "/contact" },
    searchPlaceholder: "Search products…",
    note: "",
    trustPoints: [
      { icon: "truck", title: "UK delivery", detail: "Free over {freeFrom}" },
      { icon: "shield", title: "Easy returns", detail: "14 days to change your mind" },
      { icon: "headphones", title: "Friendly help", detail: "Talk to a real person" },
      { icon: "lock", title: "Secure checkout", detail: "Your payment is protected" },
    ],
    brandsTitle: "Brands we stock",
    brands: [],
    kit: { productId: "", label: "Featured kit", badge: "", chip: "" },
  },
  categories: {
    eyebrow: "Categories",
    title: "Find what you need.",
    highlight: "",
    link: { label: "All products", href: "/products" },
    mode: "auto",
    picks: [],
    images: {},
  },
  popular: {
    title: "Popular products",
    subtitle: "What our customers order most",
    link: { label: "View all", href: "/products" },
    mode: "auto",
    picks: [],
    count: 8,
  },
  whyUs: {
    eyebrow: "Why {shop}",
    title: "Why shop with us",
    highlight: "",
    intro: "",
    badge: "",
    reasons: [
      { title: "Clear prices", text: "Prices include VAT and there are no surprise extras at checkout." },
      { title: "Quick dispatch", text: "Order in-stock items before {cutoff} on a working day and they leave the same day." },
      { title: "Easy returns", text: "Changed your mind? You have 14 days to send it back." },
      { title: "Here to help", text: "Not sure what you need? Get in touch and we'll point you in the right direction." },
    ],
  },
  promise: {
    quote: "Order today, get it delivered free over {freeFrom}, and send it back within 14 days if it isn't right.",
    highlight: "delivered free over {freeFrom}",
    byline: "",
    stats: [
      { value: "Free", label: "Delivery over {freeFrom}" },
      { value: "14 days", label: "To change your mind" },
      { value: "UK", label: "Based and run" },
    ],
    note: "",
  },
  articles: { title: "Latest from the blog", count: 3, link: { label: "View all articles", href: "/blog" } },
  cta: {
    eyebrow: "",
    headline: "Ready to get started?",
    highlight: "",
    text: "Browse the full range, or get in touch if you'd like some advice first.",
    buttons: [
      { label: "Shop all products", href: "/products" },
      { label: "Contact us", href: "/contact" },
    ],
  },
};

// ---------- lenient parsing of the stored value ----------

/** A stored string, trimmed and capped; anything else becomes `fallback`. */
export const storedText = (fallback: string, max = 500) =>
  z
    .string()
    .transform((s) => s.trim().slice(0, max))
    .catch(fallback);

export const storedBool = (fallback: boolean) => z.boolean().catch(fallback);

export const storedLink = (fallback: LinkSetting) =>
  z.object({ label: storedText(fallback.label, 80), href: storedText(fallback.href, 500) }).catch(fallback);

/** A stored list: items that don't parse are dropped; anything that isn't a list becomes `fallback`. */
export function storedList<T>(item: z.ZodType<T>, max: number, fallback: T[]) {
  return z.unknown().transform((v): T[] => {
    if (!Array.isArray(v)) return fallback;
    const out: T[] = [];
    for (const raw of v) {
      const parsed = item.safeParse(raw);
      if (parsed.success) out.push(parsed.data);
    }
    return out.slice(0, max);
  });
}

const strict = (max: number) => z.string().transform((s) => s.trim().slice(0, max));

export const storedFeaturePoint = z.object({
  icon: z.enum(FEATURE_ICONS).catch("check"),
  title: strict(60),
  detail: strict(100).catch(""),
});

const storedStrings = (max: number, fallback: string[]) =>
  storedList(strict(80).pipe(z.string().min(1)), max, fallback).transform((list) => [...new Set(list)]);

const D = DEFAULT_HOMEPAGE;

const storedSections = z.unknown().transform((v) => {
  const seen = new Set<SectionId>();
  const out: HomepageSettings["sections"] = [];
  if (Array.isArray(v)) {
    for (const raw of v) {
      const parsed = z.object({ id: z.enum(SECTION_IDS), enabled: z.boolean().catch(true) }).safeParse(raw);
      if (parsed.success && !seen.has(parsed.data.id)) {
        seen.add(parsed.data.id);
        out.push(parsed.data);
      }
    }
  }
  // Sections the stored value doesn't mention (e.g. added later) go at the end, shown.
  for (const id of SECTION_IDS) if (!seen.has(id)) out.push({ id, enabled: true });
  return out;
});

const storedHero = z
  .object({
    eyebrow: storedText(D.hero.eyebrow, 60),
    headline: storedText(D.hero.headline, 160),
    highlight: storedText(D.hero.highlight, 160),
    intro: storedText(D.hero.intro, 600),
    primary: storedLink(D.hero.primary),
    secondary: storedLink(D.hero.secondary),
    searchPlaceholder: storedText(D.hero.searchPlaceholder, 80),
    note: storedText(D.hero.note, 300),
    trustPoints: storedList(storedFeaturePoint, LIMITS.trustPoints, D.hero.trustPoints),
    brandsTitle: storedText(D.hero.brandsTitle, 60),
    brands: storedList(z.object({ name: strict(60).pipe(z.string().min(1)), logoUrl: strict(2000).catch("") }), LIMITS.brands, D.hero.brands),
    kit: z
      .object({
        productId: storedText("", 64),
        label: storedText(D.hero.kit.label, 80),
        badge: storedText(D.hero.kit.badge, 40),
        chip: storedText(D.hero.kit.chip, 40),
      })
      .catch(D.hero.kit),
  })
  .catch(D.hero);

const storedImages = z
  .record(z.string(), z.string())
  .catch({})
  .transform((m) => Object.fromEntries(Object.entries(m).filter(([k, v]) => k && v.trim()).slice(0, 50)));

const storedCategories = z
  .object({
    eyebrow: storedText(D.categories.eyebrow, 60),
    title: storedText(D.categories.title, 160),
    highlight: storedText(D.categories.highlight, 160),
    link: storedLink(D.categories.link),
    mode: z.enum(["auto", "pick"]).catch("auto"),
    picks: storedStrings(LIMITS.categoryPicks, []),
    images: storedImages,
  })
  .catch(D.categories);

const count = (allowed: readonly number[], fallback: number) =>
  z
    .number()
    .int()
    .catch(fallback)
    .transform((n) => (allowed.includes(n) ? n : fallback));

const storedPopular = z
  .object({
    title: storedText(D.popular.title, 120),
    subtitle: storedText(D.popular.subtitle, 200),
    link: storedLink(D.popular.link),
    mode: z.enum(["auto", "pick"]).catch("auto"),
    picks: storedStrings(LIMITS.popularPicks, []),
    count: count(POPULAR_COUNTS, D.popular.count),
  })
  .catch(D.popular);

const storedWhyUs = z
  .object({
    eyebrow: storedText(D.whyUs.eyebrow, 60),
    title: storedText(D.whyUs.title, 160),
    highlight: storedText(D.whyUs.highlight, 160),
    intro: storedText(D.whyUs.intro, 600),
    badge: storedText(D.whyUs.badge, 60),
    reasons: storedList(z.object({ title: strict(80).pipe(z.string().min(1)), text: strict(400).catch("") }), LIMITS.reasons, D.whyUs.reasons),
  })
  .catch(D.whyUs);

const storedPromise = z
  .object({
    quote: storedText(D.promise.quote, 300),
    highlight: storedText(D.promise.highlight, 160),
    byline: storedText(D.promise.byline, 400),
    stats: storedList(z.object({ value: strict(20).pipe(z.string().min(1)), label: strict(60).catch("") }), LIMITS.stats, D.promise.stats),
    note: storedText(D.promise.note, 400),
  })
  .catch(D.promise);

const storedArticles = z
  .object({ title: storedText(D.articles.title, 120), count: count(ARTICLE_COUNTS, D.articles.count), link: storedLink(D.articles.link) })
  .catch(D.articles);

const storedCta = z
  .object({
    eyebrow: storedText(D.cta.eyebrow, 60),
    headline: storedText(D.cta.headline, 200),
    highlight: storedText(D.cta.highlight, 160),
    text: storedText(D.cta.text, 400),
    buttons: storedList(z.object({ label: strict(60).pipe(z.string().min(1)), href: strict(500).pipe(z.string().min(1)) }), LIMITS.ctaButtons, D.cta.buttons),
  })
  .catch(D.cta);

const storedHomepage = z
  .object({
    sections: storedSections,
    hero: storedHero,
    categories: storedCategories,
    popular: storedPopular,
    whyUs: storedWhyUs,
    promise: storedPromise,
    articles: storedArticles,
    cta: storedCta,
  })
  .catch(D);

/** Typed homepage settings from whatever is stored (undefined, partial or bad data → defaults). */
export function parseHomepage(raw: unknown): HomepageSettings {
  const parsed = storedHomepage.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_HOMEPAGE;
}
