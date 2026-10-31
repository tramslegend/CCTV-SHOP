// Validation rules and option lists shared by the storefront enquiry forms (client) and their server actions.
// Plain module: safe to import from client and server code.
import { normalisePhone } from "@/lib/phone";

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** A valid phone number from any country (with its country code, or a UK number without one). */
export const isPhone = (v: string) => normalisePhone(v) !== null;

/** GB VAT number, with or without the GB prefix and spaces (9 or 12 digits). */
export const isVatNumber = (v: string) => /^(GB)?\s?\d{3}\s?\d{4}\s?\d{2}(\s?\d{3})?$/i.test(v.trim());

export const TRADE_BUSINESS_TYPES = [
  "CCTV / security installer",
  "Electrician",
  "Facilities or estates team",
  "Small business",
  "Other",
] as const;

export const TRADE_SPEND = [
  "Under £500 a month",
  "£500 – £2,000 a month",
  "£2,000 – £10,000 a month",
  "Over £10,000 a month",
] as const;

/** Name of the hidden honeypot field. People never see it; form-filling bots tend to fill it in. */
export const HONEYPOT_FIELD = "website";
