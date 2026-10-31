// Server-side validation of the page editor and the blog post form (zod). Issue paths match the editors' field keys,
// so errors show next to the right input. Server and client safe (no server imports), but only the actions use it.
import { z } from "zod";
import { CALLOUT_TONES } from "./blocks";

export type FieldErrors = Record<string, string>;

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max.toLocaleString("en-GB")} characters.`);
const optionalText = (max: number) => text(max).transform((v) => v || null);
const id = z.string().trim().min(1).max(64);

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Images may be shop paths (/sites/…, /uploads/…) or Vercel Blob URLs, as elsewhere in the admin. */
export const isAllowedImageUrl = (u: string) =>
  (u.startsWith("/") && !u.startsWith("//") && !u.includes("..") && !u.includes("\\")) ||
  /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s]+$/i.test(u);

const imageUrl = z.string().trim().min(1).max(2000).refine(isAllowedImageUrl, "This image address isn't supported. Upload the image or choose it from the library.");

/** Button links: a shop path, a web address, an email or phone link, an #anchor or a {{placeholder}}. */
const LINK_RE = /^(\/(?!\/)\S*|https?:\/\/\S+|mailto:\S+|tel:[+\d\s()-]+|#\S+|\{\{\s*[a-zA-Z]+\.[a-zA-Z]+\s*\}\})$/;

// ---------- pages ----------

const faqItems = z
  .array(z.object({ id, q: text(500).min(1, "Enter the question."), a: text(4000).min(1, "Enter the answer.") }))
  .min(1, "Add at least one question, or remove this block.")
  .max(60, "Keep this block to 60 questions; split it with a heading if you need more.");

const blockSchema = z.discriminatedUnion(
  "type",
  [
    z.object({ id, type: z.literal("heading"), text: text(300).min(1, "Enter the heading, or remove this block."), level: z.union([z.literal(2), z.literal(3)]) }),
    z.object({ id, type: z.literal("text"), markdown: text(20_000).min(1, "Write some text, or remove this block.") }),
    z.object({ id, type: z.literal("faq"), items: faqItems }),
    z
      .object({
        id,
        type: z.literal("callout"),
        tone: z.enum(CALLOUT_TONES),
        title: text(200),
        body: text(4000),
        linkLabel: text(80),
        linkHref: text(500),
      })
      .superRefine((b, ctx) => {
        if (!b.title && !b.body) ctx.addIssue({ code: "custom", path: ["body"], message: "Write a title or some text, or remove this block." });
        if (b.linkLabel && !b.linkHref) ctx.addIssue({ code: "custom", path: ["linkHref"], message: "Enter where the button goes." });
        if (b.linkHref && !b.linkLabel) ctx.addIssue({ code: "custom", path: ["linkLabel"], message: "Enter the button text." });
        if (b.linkHref && !LINK_RE.test(b.linkHref))
          ctx.addIssue({ code: "custom", path: ["linkHref"], message: "Use a shop path such as /contact, or a full address starting https://." });
      }),
    z.object({
      id,
      type: z.literal("image"),
      url: z.string().trim().min(1, "Choose or upload an image, or remove this block.").max(2000).refine((u) => !u || isAllowedImageUrl(u), "This image address isn't supported. Upload the image instead."),
      alt: text(300).min(1, "Describe the image for people who can't see it."),
      caption: text(500),
    }),
    z.object({
      id,
      type: z.literal("facts"),
      items: z
        .array(z.object({ id, label: text(120).min(1, "Enter a label."), value: text(120), note: text(300) }))
        .min(1, "Add at least one fact, or remove this block.")
        .max(12, "Keep this block to 12 facts."),
    }),
  ],
  { error: "Unknown block type." },
);

export const pageInputSchema = z.object({
  title: text(200).min(1, "Enter the page heading."),
  intro: text(1500),
  metaDescription: text(320),
  status: z.enum(["active", "draft"], { error: "Choose published or draft." }),
  blocks: z.array(blockSchema).max(150, "Keep the page under 150 blocks."),
});

export type PageInput = z.output<typeof pageInputSchema>;

// ---------- blog posts ----------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (v: string) => DATE_RE.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

export const POST_STATUSES = ["draft", "active", "archived"] as const;

export const postInputSchema = z
  .object({
    title: text(200).min(1, "Enter the post title."),
    slug: text(200)
      .toLowerCase()
      .min(1, "Enter a URL slug.")
      .regex(SLUG_RE, "Use lowercase letters, numbers and single hyphens only (e.g. choosing-a-cctv-kit)."),
    excerpt: optionalText(500),
    coverImage: imageUrl.nullable(),
    section: optionalText(100),
    keywords: optionalText(200),
    tags: text(1000).transform((v) =>
      [...new Set(v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))],
    ),
    authorName: optionalText(120),
    authorTitle: optionalText(120),
    authorImage: imageUrl.nullable(),
    publishedAt: z.string().trim().refine(isRealDate, "Enter the publish date."),
    modifiedAt: z
      .string()
      .trim()
      .refine((v) => !v || isRealDate(v), "Enter a valid date, or leave it empty.")
      .transform((v) => v || null),
    status: z.enum(POST_STATUSES, { error: "Choose a status." }),
    listed: z.boolean(),
    position: z
      .string()
      .trim()
      .refine((v) => !v || /^\d{1,5}$/.test(v), "Enter a whole number, e.g. 1 to show it first.")
      .transform((v) => (v ? Math.max(1, Number(v)) : 1)),
    body: text(200_000).transform((v) => v || null),
    faq: z.array(z.object({ id, q: text(500), a: text(4000) })).max(50, "Keep the FAQ to 50 questions."),
    products: z.array(z.object({ id })).max(24, "Choose up to 24 products."),
    related: z.array(z.object({ slug: text(200).min(1) })).max(12, "Choose up to 12 related posts."),
    sources: z.array(z.object({ id, title: text(300), url: text(2000) })).max(50, "Keep the sources to 50."),
  })
  .superRefine((v, ctx) => {
    if (v.tags.length > 20) ctx.addIssue({ code: "custom", path: ["tags"], message: "Use up to 20 tags." });
    v.tags.forEach((t) => {
      if (t.length > 40) ctx.addIssue({ code: "custom", path: ["tags"], message: `Keep each tag under 40 characters (“${t.slice(0, 20)}…”).` });
    });
    if (!v.authorName && (v.authorTitle || v.authorImage))
      ctx.addIssue({ code: "custom", path: ["authorName"], message: "Enter the author's name, or clear the job title and photo." });
    if (v.modifiedAt && v.modifiedAt < v.publishedAt)
      ctx.addIssue({ code: "custom", path: ["modifiedAt"], message: "The updated date can't be before the publish date." });
    v.faq.forEach((f, i) => {
      if (f.q && !f.a) ctx.addIssue({ code: "custom", path: ["faq", i, "a"], message: "Enter the answer." });
      if (!f.q && f.a) ctx.addIssue({ code: "custom", path: ["faq", i, "q"], message: "Enter the question." });
    });
    v.sources.forEach((src, i) => {
      if (!src.title && !src.url) return;
      if (!src.title) ctx.addIssue({ code: "custom", path: ["sources", i, "title"], message: "Enter the source's title." });
      if (!/^https?:\/\/[^\s/$.?#].\S*$/i.test(src.url))
        ctx.addIssue({ code: "custom", path: ["sources", i, "url"], message: "Enter the full address, starting https://." });
    });
    const seenProducts = new Set<string>();
    v.products.forEach((p, i) => {
      if (seenProducts.has(p.id)) ctx.addIssue({ code: "custom", path: ["products", i], message: "Listed twice." });
      seenProducts.add(p.id);
    });
    const seenPosts = new Set<string>();
    v.related.forEach((r, i) => {
      if (seenPosts.has(r.slug)) ctx.addIssue({ code: "custom", path: ["related", i], message: "Listed twice." });
      seenPosts.add(r.slug);
    });
  });

export type PostInput = z.output<typeof postInputSchema>;

/** First message per field path, e.g. { "title": "…", "faq.2.a": "…" }. */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
