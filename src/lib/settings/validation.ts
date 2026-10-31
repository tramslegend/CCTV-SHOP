// Validation of the /admin/settings forms (zod). Each section's form values are plain strings; the schemas check them,
// normalise them (postcode case, VAT number spacing, https:// on links…) and output the stored shapes from ./schema.
// Issue paths ("address.postcode", "openingHours.1.days", "social.instagram") match the form's field ids.
// Client-safe; the server actions are what enforce it.
import { isSupportedCountry } from "libphonenumber-js";
import { z } from "zod";
import { VAT_RATE } from "@/lib/cctvmaster/money";
import {
  CUTOFF_RE,
  type DeliverySettings,
  type NotificationSettings,
  type SeoSettings,
  type SocialSettings,
  type StoreSettings,
  type TaxSettings,
} from "./schema";

export type FieldErrors = Record<string, string>;

export type SettingsActionResult<T> = { ok: true; message: string; data: T } | { ok: false; message: string; fieldErrors?: FieldErrors };

// ---------- form values ----------

export type StoreFormValues = StoreSettings;

export interface DeliveryFormValues {
  fee: string;
  freeFrom: string;
  cutoff: string;
  transitMin: string;
  transitMax: string;
}

export type NotificationFormValues = NotificationSettings;

export interface SeoFormValues {
  seo: SeoSettings;
  social: SocialSettings;
}

export const storeToForm = (s: StoreSettings): StoreFormValues => ({
  ...s,
  address: { ...s.address },
  openingHours: s.openingHours.map((r) => ({ ...r })),
});

export const deliveryToForm = (d: DeliverySettings): DeliveryFormValues => ({
  fee: d.fee.toFixed(2),
  freeFrom: d.freeFrom.toFixed(2),
  cutoff: d.cutoff,
  transitMin: String(d.transitDays[0]),
  transitMax: String(d.transitDays[1]),
});

export const seoToForm = (seo: SeoSettings, social: SocialSettings): SeoFormValues => ({ seo: { ...seo }, social: { ...social } });

// ---------- field rules ----------

const tooLong = (max: number) => `Keep this under ${max.toLocaleString("en-GB")} characters.`;
const text = (max: number) => z.string().trim().max(max, tooLong(max));
const required = (max: number, message: string) => text(max).min(1, message);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const email = text(254).refine((v) => !v || EMAIL_RE.test(v), "Enter an email address such as hello@yourshop.co.uk.");

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, " "))
  .refine((v) => {
    if (!v) return true;
    const digits = v.replace(/\D/g, "").length;
    return /^\+?[\d ()-]+$/.test(v) && digits >= 7 && digits <= 15;
  }, "Enter a phone number such as 020 7946 0958.");

/** Shop paths (/uploads/…, /sites/…) or this shop's Vercel Blob URLs, as stored by the logo upload. */
export const isAllowedImageUrl = (u: string) =>
  (u.startsWith("/") && !u.startsWith("//") && !u.includes("..") && !u.includes("\\")) ||
  /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s]+$/i.test(u);

const imageUrl = text(2000).refine((v) => !v || isAllowedImageUrl(v), "Upload the logo here instead of linking to it.");

/** Adds https:// when the scheme is missing; returns null for anything that isn't a web address. */
export function normaliseUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return "";
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`);
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const webUrl = (message: string, hosts?: RegExp) =>
  text(500)
    .transform((v, ctx) => {
      const url = normaliseUrl(v);
      if (url === null || (url && hosts && !hosts.test(new URL(url).hostname))) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return url;
    });

const UK_COUNTRY = /^(uk|united kingdom|great britain|gb|england|scotland|wales|northern ireland)$/i;
const UK_POSTCODE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/;

const address = z
  .object({
    line1: text(120),
    line2: text(120),
    city: text(80),
    county: text(80),
    postcode: text(16).transform((v) => v.toUpperCase().replace(/\s+/g, " ")),
    country: text(60),
  })
  .transform((a, ctx) => {
    if (a.postcode && (!a.country || UK_COUNTRY.test(a.country))) {
      const m = UK_POSTCODE.exec(a.postcode);
      if (!m) {
        ctx.addIssue({ code: "custom", path: ["postcode"], message: "Enter a UK postcode such as SW1A 1AA." });
        return z.NEVER;
      }
      return { ...a, postcode: `${m[1]} ${m[2]}` };
    }
    return a;
  });

const openingHours = z.preprocess(
  (v) => (Array.isArray(v) ? v.filter((r) => !(r && typeof r === "object" && !String(r.days ?? "").trim() && !String(r.hours ?? "").trim())) : v),
  z
    .array(
      z.object({
        days: required(40, "Enter the days, e.g. Mon – Fri."),
        hours: required(40, "Enter the hours, e.g. 09:00 – 17:00, or Closed."),
      }),
    )
    .max(10, "Up to 10 rows."),
);

const companyNumber = text(20)
  .transform((v) => v.toUpperCase().replace(/\s+/g, ""))
  .refine((v) => !v || /^[A-Z0-9]{8}$/.test(v), "A company number has 8 characters, e.g. 01234567 or SC123456.");

const vatNumber = text(20)
  .transform((v) => v.toUpperCase().replace(/[\s.-]+/g, ""))
  .transform((v, ctx) => {
    if (!v) return v;
    const m = /^(GB|XI)?(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/.exec(v);
    if (!m) {
      ctx.addIssue({ code: "custom", message: "Enter a UK VAT number such as GB 123 4567 89." });
      return z.NEVER;
    }
    return `${m[1] ?? "GB"}${m[2]}`;
  });

export const storeFormSchema = z.object({
  name: required(80, "Enter the shop name customers see."),
  legalName: text(120),
  tagline: text(200),
  logoUrl: imageUrl,
  logoDarkUrl: imageUrl,
  phone,
  phoneCountry: z
    .string()
    .trim()
    .toUpperCase()
    .refine((c) => isSupportedCountry(c), "Choose the country phone numbers start on."),
  email,
  address,
  openingHours,
  companyNumber,
  vatNumber,
  registeredOffice: text(240),
  mapUrl: webUrl("Enter a link such as https://maps.google.com/…"),
}) satisfies z.ZodType<StoreSettings>;

const MONEY_RE = /^\d{1,7}(\.\d{1,2})?$/;
const money = (max: number, label: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/[£,\s]/g, ""))
    .refine((v) => v !== "", `Enter ${label}.`)
    .refine((v) => v === "" || MONEY_RE.test(v), "Enter an amount such as 5.99.")
    .transform((v) => Math.round(Number(v) * 100) / 100)
    .refine((n) => n <= max, `Enter an amount up to £${max.toLocaleString("en-GB")}.`);

const days = z
  .string()
  .trim()
  .refine((v) => /^\d{1,2}$/.test(v), "Enter a whole number of days.")
  .transform(Number)
  .refine((n) => n <= 60, "Enter up to 60 days.");

export const deliveryFormSchema = z
  .object({
    fee: money(1000, "the delivery charge (0 for free delivery)"),
    freeFrom: money(1_000_000, "the free-delivery threshold"),
    cutoff: z
      .string()
      .trim()
      .refine((v) => CUTOFF_RE.test(v), "Enter a time such as 16:00.")
      .transform((v) => v.padStart(5, "0")),
    transitMin: days,
    transitMax: days,
  })
  .superRefine((v, ctx) => {
    if (v.transitMin > v.transitMax)
      ctx.addIssue({ code: "custom", path: ["transitMax"], message: "The longest time can't be shorter than the quickest." });
  })
  .transform(
    (v): { delivery: DeliverySettings; tax: TaxSettings } => ({
      delivery: { fee: v.fee, freeFrom: v.freeFrom, cutoff: v.cutoff, transitDays: [v.transitMin, v.transitMax] },
      // Fixed at the UK standard rate: every price on the shop is calculated with VAT_RATE (money.ts withVat), so
      // checkout, receipts and invoices must use the same rate. Not editable in Settings.
      tax: { vatRate: VAT_RATE },
    }),
  );

export const notificationFormSchema = z.object({ ordersEmail: email, messagesEmail: email }) satisfies z.ZodType<NotificationSettings>;

export const seoFormSchema = z.object({
  seo: z.object({
    siteTitle: text(70),
    titleTemplate: text(80).refine((v) => !v || v.includes("%s"), "Include %s where the page name goes, e.g. %s | Your Shop."),
    description: text(320),
  }),
  social: z.object({
    facebook: webUrl("Enter your Facebook page link, e.g. https://www.facebook.com/yourshop.", /(^|\.)(facebook\.com|fb\.com|fb\.me)$/i),
    instagram: webUrl("Enter your Instagram profile link, e.g. https://www.instagram.com/yourshop.", /(^|\.)instagram\.com$/i),
    x: webUrl("Enter your X profile link, e.g. https://x.com/yourshop.", /(^|\.)(x\.com|twitter\.com)$/i),
    youtube: webUrl("Enter your YouTube channel link, e.g. https://www.youtube.com/@yourshop.", /(^|\.)(youtube\.com|youtu\.be)$/i),
    linkedin: webUrl("Enter your LinkedIn page link, e.g. https://www.linkedin.com/company/yourshop.", /(^|\.)linkedin\.com$/i),
  }),
}) satisfies z.ZodType<{ seo: SeoSettings; social: SocialSettings }>;

/** zod issues → { "address.postcode": "…" } (first message per field). */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}
