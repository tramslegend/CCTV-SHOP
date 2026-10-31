// Checkout, address and account input rules (zod), shared by the browser forms and the server actions.
// The server always re-validates: never trust what the browser sends.
import { z } from "zod";
import { normalisePhone, PHONE_INVALID } from "@/lib/phone";

export { normalisePhone } from "@/lib/phone";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** UK postcode (e.g. SW1A 1AA, M1 1AE). */
export const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** Upper-cases and inserts the space before the inward code. */
export function formatPostcode(value: string) {
  const compact = value.toUpperCase().replace(/\s/g, "");
  return compact.length > 4 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v.replace(/\s+/g, " ") : undefined));

/** A phone number from any country when one is given, stored in international form ("+44 7700 900123"). */
const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const phone = normalisePhone(v);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: PHONE_INVALID });
      return z.NEVER;
    }
    return phone;
  });

export const emailField = z
  .string()
  .trim()
  .min(1, "Please enter your email.")
  .max(254)
  .regex(EMAIL_RE, "That email address doesn’t look right.")
  .transform((v) => v.toLowerCase());

export const addressSchema = z.object({
  line1: z.string().trim().min(1, "Address line 1 is required.").max(120),
  line2: optionalText(120),
  city: z.string().trim().min(1, "City is required.").max(80),
  county: optionalText(80),
  postcode: z
    .string()
    .trim()
    .min(1, "Postcode is required.")
    .regex(UK_POSTCODE_RE, "Enter a valid UK postcode (e.g. SW1A 1AA).")
    .transform(formatPostcode),
});
export type AddressInput = z.input<typeof addressSchema>;
export type Address = z.output<typeof addressSchema>;

export const cartLineSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  qty: z.number().int().min(1).max(999),
});
export const cartSchema = z.array(cartLineSchema).min(1, "Your basket is empty.").max(100, "That basket is too large.");
export type CartInput = z.input<typeof cartSchema>;

export const checkoutSchema = z.object({
  cart: cartSchema,
  contact: z.object({
    name: z.string().trim().min(2, "Please enter your full name.").max(120),
    email: emailField,
    /** Whether it's required is a checkout setting, checked in placeOrder. */
    phone: optionalPhone,
    company: optionalText(120),
  }),
  /** Id of the delivery option chosen (Admin → Checkout); standard delivery when missing. */
  deliveryOption: z.string().trim().max(40).optional(),
  /** Ticked "I agree to the terms of sale" (required when the checkout setting says so). */
  acceptTerms: z.boolean().default(false),
  shipping: addressSchema,
  billing: addressSchema.nullable(),
  marketingOptOut: z.boolean().default(false),
  /** Signed-in customers: keep this delivery address in the address book. */
  saveAddress: z.boolean().default(false),
  note: optionalText(500),
  /** Discount code as typed. Only the code is accepted: the server works out what it's worth. */
  discountCode: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v.toUpperCase().replace(/\s+/g, "") : undefined)),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

/** Address-book entry (dashboard). */
export const savedAddressSchema = addressSchema.extend({
  label: optionalText(40),
  name: z.string().trim().min(2, "Please enter the recipient’s name.").max(120),
  company: optionalText(120),
  phone: optionalPhone,
  isDefault: z.boolean().default(false),
});
export type SavedAddressInput = z.input<typeof savedAddressSchema>;

/** First error message per field path ("contact.email", "shipping.postcode"…). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
