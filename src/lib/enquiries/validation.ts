// Server-side validation for the storefront enquiry forms. Same rules and messages as the forms' own checks
// (contact-form.tsx, trade-form.tsx, enquire-dialog.tsx), plus length limits.
import { z } from "zod";
import { CONTACT_SUBJECTS } from "@/components/sites/cctvmaster/content/store-facts";
import { normalisePhone, PHONE_INVALID } from "@/lib/phone";
import { isEmail, isPhone, isVatNumber, TRADE_BUSINESS_TYPES, TRADE_SPEND } from "./rules";

const text = (message: string) => z.string({ error: message }).trim();

const name = text("Please enter your name.")
  .min(2, "Please enter your name.")
  .max(120, "Please keep your name under 120 characters.");
const email = text("Please enter your email address.")
  .min(1, "Please enter your email address.")
  .max(254, "Please enter a shorter email address.")
  .refine(isEmail, "Please enter a valid email address.");
const phone = text("Please enter a phone number.")
  .min(1, "Please enter a phone number.")
  .max(40, PHONE_INVALID)
  .refine(isPhone, PHONE_INVALID)
  .transform((v) => normalisePhone(v) ?? v);
const optionalText = (max: number, message: string) => z.string().trim().max(max, message).optional().default("");

const subjectValues = CONTACT_SUBJECTS.map((s) => s.value) as [string, ...string[]];

export const contactSchema = z.object({
  name,
  email,
  phone,
  subject: z.enum(subjectValues, { error: "Please choose a subject." }),
  message: text("Please tell us a little more (at least 10 characters).")
    .min(10, "Please tell us a little more (at least 10 characters).")
    .max(5000, "Please keep your message under 5,000 characters."),
  /** Product slug when the form was opened from a product page (/contact?product=<slug>). */
  product: z.string().trim().max(300).optional(),
});

export const tradeSchema = z.object({
  company: text("Please enter your business name.")
    .min(2, "Please enter your business name.")
    .max(160, "Please keep the business name under 160 characters."),
  name,
  email,
  phone,
  type: z.enum(TRADE_BUSINESS_TYPES, { error: "Please tell us what kind of business you are." }),
  spend: z
    .union([z.enum(TRADE_SPEND), z.literal("")], { error: "Please choose an option from the list." })
    .optional()
    .default(""),
  vat: optionalText(30, "VAT numbers look like GB123456789 — or leave this blank.").refine(
    (v) => !v || isVatNumber(v),
    "VAT numbers look like GB123456789 — or leave this blank.",
  ),
  notes: optionalText(2000, "Please keep this under 2,000 characters."),
  terms: z.literal(true, { error: "Please confirm you buy for business use." }),
});

export const partsSchema = z.object({
  qty: z.coerce
    .number({ error: "Please enter how many you need." })
    .int("Please enter a whole number.")
    .min(1, "Please enter how many you need.")
    .max(9999, "For more than 9,999, please call us."),
  name,
  company: optionalText(160, "Please keep the company name under 160 characters."),
  phone,
  email,
  message: optionalText(5000, "Please keep your message under 5,000 characters."),
  sku: z.string().trim().min(1).max(200),
  productName: z.string().trim().min(1).max(300),
});

/** What each form sends, before validation. */
export interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  product?: string;
}

export interface TradePayload {
  company: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  spend: string;
  vat: string;
  notes: string;
  terms: boolean;
}

export interface PartsPayload {
  qty: number;
  name: string;
  company: string;
  phone: string;
  email: string;
  message: string;
  sku: string;
  productName: string;
}

/** First message per field, keyed by field name. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
