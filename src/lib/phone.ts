// International phone numbers (libphonenumber-js), shared by the browser forms and the server actions.
// Numbers are stored in international form ("+44 7400 123456", "+34 612 34 56 78"). The phone field always sends the
// country code; a number typed without one (older saved numbers, the server's checks) is read as a number in the
// shop's phone country (Admin → Settings → Store details → "Phone numbers start on"), DEFAULT_PHONE_COUNTRY until set.
import { isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export const DEFAULT_PHONE_COUNTRY: CountryCode = "GB";

export const PHONE_INVALID = "Enter a valid phone number: pick the country, then type the number.";

/** The country code if it's one the phone field knows ("ES"), otherwise DEFAULT_PHONE_COUNTRY. */
export const phoneCountry = (code: string | null | undefined): CountryCode => {
  const c = code?.trim().toUpperCase() ?? "";
  return isSupportedCountry(c) ? c : DEFAULT_PHONE_COUNTRY;
};

/** A valid phone number in international form, or null. A number without a country code is read as `home`'s. */
export function normalisePhone(raw: string, home: CountryCode = DEFAULT_PHONE_COUNTRY): string | null {
  const parsed = parsePhoneNumberFromString(raw.trim(), home);
  return parsed?.isValid() ? parsed.formatInternational() : null;
}

/**
 * The value for the phone field: E.164 ("+447400123456"), or undefined when empty. Values the field emitted (possibly
 * incomplete, "+4474") pass through; saved numbers in national or international form are converted.
 */
export function toE164(value: string | null | undefined, home: CountryCode = DEFAULT_PHONE_COUNTRY): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  if (v.startsWith("+")) return `+${v.replace(/\D/g, "")}`;
  return parsePhoneNumberFromString(v, home)?.number ?? undefined;
}
