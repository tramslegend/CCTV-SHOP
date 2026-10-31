// Server-side validation of the product form (zod). Field paths in the issues ("price", "attributes.2.value", …)
// match the form's field ids, so errors show next to the right input.
import { z } from "zod";
import { AVAILABILITIES, type FieldErrors, KIT_ROLES, KIT_SYSTEMS, PRODUCT_STATUSES } from "@/components/admin/products/types";

const MONEY = /^\d{1,9}(\.\d{1,2})?$/;
const cleanNumber = (v: string) => v.replace(/[£,\s]/g, "");
const round2 = (n: number) => Math.round(n * 100) / 100;

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max.toLocaleString("en-GB")} characters.`);
/** Optional text: empty becomes null. */
const optionalText = (max: number) => text(max).transform((v) => v || null);

const requiredMoney = z
  .string()
  .trim()
  .min(1, "Enter a price.")
  .refine((v) => MONEY.test(cleanNumber(v)), "Enter an amount such as 49.99.")
  .transform((v) => round2(Number(cleanNumber(v))));

const optionalMoney = z
  .string()
  .trim()
  .refine((v) => !v || MONEY.test(cleanNumber(v)), "Enter an amount such as 49.99, or leave it empty.")
  .transform((v) => (v ? round2(Number(cleanNumber(v))) : null));

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => !v || /^-?\d+$/.test(cleanNumber(v)), "Enter a whole number.")
    .transform((v) => (v ? Number(cleanNumber(v)) : null))
    .refine((n) => n === null || (n >= min && n <= max), `Enter a number from ${min} to ${max.toLocaleString("en-GB")}.`);

const requiredInt = (min: number, max: number, message: string) =>
  optionalInt(min, max).refine((n): n is number => n !== null, message).transform((n) => n as number);

const optionalDecimal = (max: number) =>
  z
    .string()
    .trim()
    .refine((v) => !v || /^\d+(\.\d+)?$/.test(v), "Enter a number.")
    .transform((v) => (v ? Number(v) : null))
    .refine((n) => n === null || n <= max, `Enter a number up to ${max}.`);

/** Images and component pictures may be shop paths (/sites/…, /uploads/…) or Vercel Blob URLs. */
export const isAllowedImageUrl = (u: string) =>
  (u.startsWith("/") && !u.startsWith("//") && !u.includes("..") && !u.includes("\\")) ||
  /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s]+$/i.test(u);

const imageUrl = z.string().trim().min(1).max(2000).refine(isAllowedImageUrl, "This image address isn't supported. Upload the image instead.");

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const STORAGE_TOKEN_RE = /^(?:(\d{1,2})X)?(\d+(?:\.\d+)?)(TB|GB)$/;

/** "2X8TB" → 2 drives, 16 TB; "500GB" → 1 drive, 0.5 TB. */
export function parseStorageToken(token: string): { drives: number; capacityTb: number } | null {
  const m = STORAGE_TOKEN_RE.exec(token);
  if (!m) return null;
  const drives = m[1] ? Number(m[1]) : 1;
  const each = Number(m[2]) / (m[3] === "GB" ? 1000 : 1);
  return { drives, capacityTb: Math.round(drives * each * 1000) / 1000 };
}

const id = z.string().trim().min(1).max(64);

export const productInputSchema = z
  .object({
    name: text(300).min(1, "Enter the product name."),
    slug: text(200)
      .toLowerCase()
      .min(1, "Enter a URL slug.")
      .regex(SLUG_RE, "Use lowercase letters, numbers and single hyphens only (e.g. 4mp-turret-camera)."),
    sku: text(100).min(1, "Enter the SKU.").regex(/^\S+$/, "SKUs can't contain spaces."),
    brand: optionalText(100),
    status: z.enum(PRODUCT_STATUSES, { error: "Choose a status." }),
    badge: optionalText(40),
    price: requiredMoney,
    compareAtPrice: optionalMoney,
    costPrice: optionalMoney,
    isContactSales: z.boolean(),
    isCallForPrice: z.boolean(),
    availability: z.enum(AVAILABILITIES, { error: "Choose the availability." }),
    trackStock: z.boolean(),
    stock: optionalInt(0, 1_000_000),
    weightGrams: optionalInt(0, 1_000_000),
    primaryCategoryId: z.number().int().positive().nullable(),
    extraCategoryIds: z.array(z.number().int().positive()).max(50, "Choose up to 50 categories."),
    images: z.array(z.object({ url: imageUrl, alt: optionalText(300) })).max(30, "A product can have up to 30 images."),
    shortDescription: optionalText(500),
    description: optionalText(50_000),
    attributes: z
      .array(z.object({ name: text(120), value: text(1000), type: z.string().max(40).optional() }))
      .max(150, "Keep the specifications under 150 rows."),
    related: z.array(z.object({ id })).max(48, "Choose up to 48 related products."),
    guides: z.array(text(200).min(1)).max(12, "Choose up to 12 guides."),
    seoTitle: optionalText(120),
    seoDescription: optionalText(320),
    kit: z
      .object({
        systemType: z.enum(KIT_SYSTEMS, { error: "Choose the system type." }),
        channelCount: requiredInt(1, 256, "Enter the recorder's channel count."),
        cameraCount: requiredInt(0, 256, "Enter how many cameras the kit includes."),
        resolutionMp: optionalDecimal(100),
        storageToken: text(20)
          .toUpperCase()
          .refine((v) => !v || STORAGE_TOKEN_RE.test(v), "Use a size such as 4TB, 500GB or 2X8TB."),
        storageCapacityTb: optionalDecimal(1000),
      })
      .nullable(),
    components: z
      .array(
        z.object({
          componentId: id.nullable(),
          name: text(300).min(1, "Enter the component name."),
          sku: text(100),
          role: z.enum(KIT_ROLES, { error: "Choose a role." }),
          qty: requiredInt(1, 999, "Enter a quantity."),
          imageUrl: imageUrl.nullable(),
        }),
      )
      .max(60, "A kit can have up to 60 components."),
  })
  .superRefine((v, ctx) => {
    if (v.compareAtPrice !== null && v.compareAtPrice <= v.price)
      ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "The compare-at price must be higher than the price." });
    if (v.trackStock && v.stock === null)
      ctx.addIssue({ code: "custom", path: ["stock"], message: "Enter the quantity in stock, or turn off stock tracking." });
    v.attributes.forEach((a, i) => {
      if (a.name && !a.value) ctx.addIssue({ code: "custom", path: ["attributes", i, "value"], message: "Enter a value." });
      if (!a.name && a.value) ctx.addIssue({ code: "custom", path: ["attributes", i, "name"], message: "Enter a name." });
    });
    const dupes = new Set<string>();
    v.related.forEach((r, i) => {
      if (dupes.has(r.id)) ctx.addIssue({ code: "custom", path: ["related", i], message: "Listed twice." });
      dupes.add(r.id);
    });
  });

export type ProductInput = z.output<typeof productInputSchema>;

/** First message per field path, e.g. { "price": "…", "attributes.2.value": "…" }. */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
