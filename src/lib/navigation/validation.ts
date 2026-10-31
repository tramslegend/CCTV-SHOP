// Validation of the /admin/content/navigation form (zod): header bar, top bar and its links, footer and announcement
// banner.
// Issue paths ("navigation.footer.columns.1.links.0.href", "announcement.text") match the editor's fields.
// Client-safe; the server action is what enforces it.
import { z } from "zod";
import { FEATURE_ICONS } from "@/lib/homepage/schema";
import { imageUrl, linkPair, requiredLink, text } from "@/lib/homepage/validation";
import {
  ANNOUNCEMENT_COLOURS,
  type AnnouncementSettings,
  LIMITS,
  type NavigationSettings,
  PAYMENT_MARKS,
  type PaymentMarkId,
} from "./schema";

export interface NavigationFormValues {
  navigation: NavigationSettings;
  announcement: AnnouncementSettings;
}

const PAYMENT_IDS = PAYMENT_MARKS.map((m) => m.id) as [PaymentMarkId, ...PaymentMarkId[]];

const headerItem = z.object({
  slug: z.string().trim().min(1).max(200),
  show: z.boolean(),
  icon: imageUrl,
  menu: z.boolean(),
  hidden: z.array(z.string().trim().max(500)).max(300),
  icons: z.record(z.string(), imageUrl).transform((m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v))),
});

export const navigationFormSchema = z
  .object({
    navigation: z.object({
      header: z.array(headerItem).max(100),
      topBar: z.object({ enabled: z.boolean(), showPhone: z.boolean(), showStore: z.boolean(), deliverTo: text(40) }),
      topLinks: z.array(requiredLink()).max(LIMITS.topLinks, `Up to ${LIMITS.topLinks} links.`),
      footer: z.object({
        highlights: z
          .array(z.object({ icon: z.enum(FEATURE_ICONS), title: text(60), detail: text(100) }))
          .max(LIMITS.highlights, `Up to ${LIMITS.highlights} highlights.`),
        columns: z
          .array(z.object({ title: text(60), links: z.array(requiredLink()).max(LIMITS.columnLinks, `Up to ${LIMITS.columnLinks} links per column.`) }))
          .max(LIMITS.columns, `Up to ${LIMITS.columns} columns.`),
        payments: z.array(z.enum(PAYMENT_IDS)).transform((ids) => PAYMENT_IDS.filter((id) => ids.includes(id))),
        bottomText: text(200),
      }),
    }),
    announcement: z.object({
      enabled: z.boolean(),
      text: text(200),
      link: linkPair(),
      colour: z.enum(ANNOUNCEMENT_COLOURS),
      dismissible: z.boolean(),
    }),
  })
  .superRefine((v, ctx) => {
    v.navigation.footer.highlights.forEach((h, i) => {
      if (!h.title) ctx.addIssue({ code: "custom", path: ["navigation", "footer", "highlights", i, "title"], message: "Enter a title or remove this highlight." });
    });
    v.navigation.footer.columns.forEach((c, i) => {
      if (!c.title && c.links.length) ctx.addIssue({ code: "custom", path: ["navigation", "footer", "columns", i, "title"], message: "Enter a heading for this column." });
    });
    if (v.announcement.enabled && !v.announcement.text)
      ctx.addIssue({ code: "custom", path: ["announcement", "text"], message: "Enter the announcement, or switch the banner off." });
    const slugs = v.navigation.header.map((h) => h.slug);
    if (new Set(slugs).size !== slugs.length) ctx.addIssue({ code: "custom", path: ["navigation", "header"], message: "A category is listed twice." });
  }) satisfies z.ZodType<NavigationFormValues, NavigationFormValues>;

/** Every owner-entered link with its field path (for the "does this page exist?" check). */
export function navigationLinks(v: NavigationFormValues): { path: string; href: string }[] {
  return [
    ...v.navigation.topLinks.map((l, i) => ({ path: `navigation.topLinks.${i}.href`, href: l.href })),
    ...v.navigation.footer.columns.flatMap((c, i) => c.links.map((l, j) => ({ path: `navigation.footer.columns.${i}.links.${j}.href`, href: l.href }))),
    { path: "announcement.link.href", href: v.announcement.link.href },
  ].filter((l) => l.href);
}
