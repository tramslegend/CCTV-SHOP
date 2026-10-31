// Validation of the /admin/content/homepage form (zod). The form edits the stored shape directly; the schema trims and
// checks it and reports problems under the field's path ("hero.primary.href", "whyUs.reasons.2.title"), which the
// editor maps to inline errors. Required fields are only required while their section is switched on.
// Client-safe; the server action is what enforces it.
import { z } from "zod";
import { hrefProblem } from "@/lib/navigation/links";
import { isAllowedImageUrl } from "@/lib/settings/validation";
import {
  ARTICLE_COUNTS,
  FEATURE_ICONS,
  type HomepageSettings,
  LIMITS,
  POPULAR_COUNTS,
  SECTION_IDS,
  type SectionId,
} from "./schema";
import { inlineLinks } from "./text";

export type FieldMessages = Record<string, string>;

export type ContentActionResult<T> =
  | { ok: true; message: string; data: T; warnings: FieldMessages }
  | { ok: false; message: string; fieldErrors?: FieldMessages; warnings?: FieldMessages };

const tooLong = (max: number) => `Keep this under ${max.toLocaleString("en-GB")} characters.`;
export const text = (max: number) => z.string().trim().max(max, tooLong(max));

/** A link: empty, or a shop path / web address / email / phone link. */
export const href = text(500).superRefine((v, ctx) => {
  const problem = hrefProblem(v);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});

export const imageUrl = text(2000).refine((v) => !v || isAllowedImageUrl(v), "Choose an image from the media library or upload one.");

/** Text that may contain [inline](/links): each link is checked. */
export const noteText = (max: number) =>
  text(max).superRefine((v, ctx) => {
    for (const link of inlineLinks(v)) {
      const problem = hrefProblem(link.href);
      if (problem) {
        ctx.addIssue({ code: "custom", message: `Link "${link.label}": ${problem}` });
        return;
      }
    }
  });

/** Label + link that are both filled in or both empty. */
export const linkPair = (labelMax = 60) =>
  z.object({ label: text(labelMax), href }).superRefine((v, ctx) => {
    if (v.label && !v.href) ctx.addIssue({ code: "custom", path: ["href"], message: "Add the page this links to, e.g. /products." });
    if (v.href && !v.label) ctx.addIssue({ code: "custom", path: ["label"], message: "Add the text shown for this link." });
  });

/** Label + link that are both required. */
export const requiredLink = (labelMax = 60) =>
  z.object({ label: text(labelMax), href }).superRefine((v, ctx) => {
    if (!v.label) ctx.addIssue({ code: "custom", path: ["label"], message: "Add the text shown for this link." });
    if (!v.href) ctx.addIssue({ code: "custom", path: ["href"], message: "Add the page this links to, e.g. /products." });
  });

const list = <T extends z.ZodType>(item: T, max: number, what: string) => z.array(item).max(max, `Up to ${max} ${what}.`);

const featurePoint = z.object({ icon: z.enum(FEATURE_ICONS), title: text(60), detail: text(100) });

export const homepageFormSchema = z
  .object({
    sections: z
      .array(z.object({ id: z.enum(SECTION_IDS), enabled: z.boolean() }))
      .refine((s) => s.length === SECTION_IDS.length && new Set(s.map((x) => x.id)).size === SECTION_IDS.length, "Every section must be listed once."),
    hero: z.object({
      eyebrow: text(60),
      headline: text(160),
      highlight: text(160),
      intro: text(600),
      primary: linkPair(),
      secondary: linkPair(),
      searchPlaceholder: text(80),
      note: noteText(300),
      trustPoints: list(featurePoint, LIMITS.trustPoints, "trust points"),
      brandsTitle: text(60),
      brands: list(z.object({ name: text(60), logoUrl: imageUrl }), LIMITS.brands, "brands"),
      kit: z.object({ productId: text(64), label: text(80), badge: text(40), chip: text(40) }),
    }),
    categories: z.object({
      eyebrow: text(60),
      title: text(160),
      highlight: text(160),
      link: linkPair(),
      mode: z.enum(["auto", "pick"]),
      picks: list(z.string().trim().min(1).max(200), LIMITS.categoryPicks, "categories"),
      images: z.record(z.string(), imageUrl).transform((m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v))),
    }),
    popular: z.object({
      title: text(120),
      subtitle: text(200),
      link: linkPair(),
      mode: z.enum(["auto", "pick"]),
      picks: list(z.string().trim().min(1).max(64), LIMITS.popularPicks, "products"),
      count: z.number().refine((n) => (POPULAR_COUNTS as readonly number[]).includes(n), "Choose how many products to show."),
    }),
    whyUs: z.object({
      eyebrow: text(60),
      title: text(160),
      highlight: text(160),
      intro: text(600),
      badge: text(60),
      reasons: list(z.object({ title: text(80), text: text(400) }), LIMITS.reasons, "reasons"),
    }),
    promise: z.object({
      quote: text(300),
      highlight: text(160),
      byline: text(400),
      stats: list(z.object({ value: text(20), label: text(60) }), LIMITS.stats, "figures"),
      note: noteText(400),
    }),
    articles: z.object({
      title: text(120),
      count: z.number().refine((n) => (ARTICLE_COUNTS as readonly number[]).includes(n), "Choose how many articles to show."),
      link: linkPair(),
    }),
    cta: z.object({
      eyebrow: text(60),
      headline: text(200),
      highlight: text(160),
      text: text(400),
      buttons: list(requiredLink(), LIMITS.ctaButtons, "buttons"),
    }),
  })
  .superRefine((v, ctx) => {
    const on = new Set<SectionId>(v.sections.filter((s) => s.enabled).map((s) => s.id));
    const need = (section: SectionId, path: (string | number)[], value: string, message: string) => {
      if (on.has(section) && !value) ctx.addIssue({ code: "custom", path: [section, ...path], message });
    };
    const inside = (section: SectionId, path: (string | number)[], highlight: string, whole: string, where: string) => {
      if (highlight && !whole.includes(highlight))
        ctx.addIssue({ code: "custom", path: [section, ...path], message: `These words must appear in the ${where} exactly as written there.` });
    };
    need("hero", ["headline"], v.hero.headline, "Enter a headline.");
    inside("hero", ["highlight"], v.hero.highlight, v.hero.headline, "headline");
    v.hero.trustPoints.forEach((p, i) => need("hero", ["trustPoints", i, "title"], p.title, "Enter a title or remove this point."));
    v.hero.brands.forEach((b, i) => need("hero", ["brands", i, "name"], b.name, "Enter the brand name or remove it."));

    need("categories", ["title"], v.categories.title, "Enter a heading.");
    inside("categories", ["highlight"], v.categories.highlight, v.categories.title, "heading");
    if (on.has("categories") && v.categories.mode === "pick" && !v.categories.picks.length)
      ctx.addIssue({ code: "custom", path: ["categories", "picks"], message: "Pick at least one category, or switch to automatic." });

    need("popular", ["title"], v.popular.title, "Enter a heading.");
    if (on.has("popular") && v.popular.mode === "pick" && !v.popular.picks.length)
      ctx.addIssue({ code: "custom", path: ["popular", "picks"], message: "Pick at least one product, or switch to automatic." });

    need("whyUs", ["title"], v.whyUs.title, "Enter a heading.");
    inside("whyUs", ["highlight"], v.whyUs.highlight, v.whyUs.title, "heading");
    v.whyUs.reasons.forEach((r, i) => need("whyUs", ["reasons", i, "title"], r.title, "Enter a title or remove this reason."));

    need("promise", ["quote"], v.promise.quote, "Enter the promise.");
    inside("promise", ["highlight"], v.promise.highlight, v.promise.quote, "promise");
    v.promise.stats.forEach((s, i) => need("promise", ["stats", i, "value"], s.value, "Enter the figure or remove it."));

    need("articles", ["title"], v.articles.title, "Enter a heading.");

    need("cta", ["headline"], v.cta.headline, "Enter a headline.");
    inside("cta", ["highlight"], v.cta.highlight, v.cta.headline, "headline");
  }) satisfies z.ZodType<HomepageSettings, HomepageSettings>;

/** Every link in the homepage settings with its field path (for the "does this page exist?" check). */
export function homepageLinks(v: HomepageSettings): { path: string; href: string }[] {
  const out: { path: string; href: string }[] = [
    { path: "hero.primary.href", href: v.hero.primary.href },
    { path: "hero.secondary.href", href: v.hero.secondary.href },
    ...inlineLinks(v.hero.note).map((l) => ({ path: "hero.note", href: l.href })),
    { path: "categories.link.href", href: v.categories.link.href },
    { path: "popular.link.href", href: v.popular.link.href },
    ...inlineLinks(v.promise.note).map((l) => ({ path: "promise.note", href: l.href })),
    { path: "articles.link.href", href: v.articles.link.href },
    ...v.cta.buttons.map((b, i) => ({ path: `cta.buttons.${i}.href`, href: b.href })),
  ];
  return out.filter((l) => l.href);
}

export { fieldErrorsOf } from "@/lib/settings/validation";
