// Server-side validation of the category form (zod). Issue paths ("slug", "kitRule.cameras", …) match the form's
// field keys, so the form shows each message next to its field.
import { z } from "zod";
import { MAX_RULE_CAMERAS, RULE_COLOURS, RULE_RESOLUTIONS, RULE_SYSTEMS } from "./kit-rule";

/** Lowercase words joined by single hyphens, as in /categories/outdoor-cameras. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The kit hub: the shop's kit pages are built around this slug, so it can't be renamed, moved or deleted. */
export const KIT_ROOT_SLUG = "cctv-kits";

/** Images the shop stores itself: uploads and bundled assets (/…) or the Vercel Blob store. */
export const isStoredImageUrl = (url: string) =>
  (url.startsWith("/") && !url.startsWith("//") && !url.includes("..")) || /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url);

const kitRuleSchema = z.object({
  system: z.enum(RULE_SYSTEMS),
  cameras: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= MAX_RULE_CAMERAS),
      `Enter a number of cameras from 1 to ${MAX_RULE_CAMERAS}, or leave it empty for any number.`,
    ),
  res: z.enum(RULE_RESOLUTIONS),
  colour: z.enum(RULE_COLOURS),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120, "Keep the name to 120 characters or fewer."),
  slug: z
    .string()
    .trim()
    .min(1, "Enter a URL slug.")
    .max(120, "Keep the slug to 120 characters or fewer.")
    .regex(SLUG_PATTERN, "Use lowercase letters and numbers separated by single hyphens, e.g. outdoor-cameras."),
  parentId: z.number().int().positive().nullable(),
  title: z.string().trim().max(200, "Keep the page title to 200 characters or fewer."),
  metaDescription: z.string().trim().max(320, "Keep the meta description to 320 characters or fewer."),
  description: z.string().max(50_000, "The description is too long (50,000 characters at most)."),
  imageUrl: z.string().trim().max(1000).refine(isStoredImageUrl, "Upload the image again.").nullable(),
  visible: z.boolean(),
  isKitRange: z.boolean(),
  kitRule: kitRuleSchema.nullable(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categoryIdSchema = z.number().int().positive();
export const productIdsSchema = z
  .array(z.string().trim().min(1).max(64))
  .max(5000, "A category can list up to 5,000 products.")
  .refine((ids) => new Set(ids).size === ids.length, "A product is listed twice.");
