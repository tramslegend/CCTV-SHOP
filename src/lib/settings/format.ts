// Display helpers for shop settings, shared by the storefront, emails and the back office. Client-safe.
import { formatGBP } from "@/lib/cctvmaster/money";
import type { DeliverySettings, SeoSettings, StoreAddress, StoreSettings } from "./schema";

const UK = /^(uk|united kingdom|great britain|gb|england|scotland|wales|northern ireland)$/i;

/** Address lines for a multi-line block: street lines, town (and county), postcode, and the country outside the UK. */
export function addressLines(a: StoreAddress): string[] {
  const town = [a.city, a.county].filter(Boolean).join(", ");
  return [a.line1, a.line2, town, a.postcode, a.country && !UK.test(a.country) ? a.country : ""].filter(Boolean);
}

/** One-line address, e.g. "1 High St, Unit 2, London W5 1AA". Empty when no address is set. */
export function addressLine(a: StoreAddress): string {
  const parts = [a.line1, a.line2, a.city, a.county].filter(Boolean);
  if (a.postcode) {
    if (parts.length) parts[parts.length - 1] = `${parts[parts.length - 1]} ${a.postcode}`;
    else parts.push(a.postcode);
  }
  if (a.country && !UK.test(a.country) && parts.length) parts.push(a.country);
  return parts.join(", ");
}

/** `tel:` link for a phone number as typed ("020 7946 0958" → "tel:02079460958"); empty when there are no digits. */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return /\d{3,}/.test(digits) ? `tel:${digits}` : "";
}

/** UK national number in international format ("020 7946 0958" → "+44 20 7946 0958"); other numbers unchanged. */
export function internationalPhone(phone: string): string {
  const p = phone.trim();
  return /^0\d/.test(p) ? `+44 ${p.slice(1)}` : p;
}

/** The shop's map link: the one set in Settings, otherwise a Google Maps search for the address (empty if neither). */
export function mapHref(store: Pick<StoreSettings, "mapUrl" | "address">): string {
  if (store.mapUrl) return store.mapUrl;
  const line = addressLine(store.address);
  return line ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(line)}` : "";
}

/** "16:00" → "4pm", "16:30" → "4:30pm", "12:00" → "12pm". */
export function cutoffLabel(cutoff: string): string {
  const [h, m] = cutoff.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return cutoff;
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

/** [1, 3] → "1–3 working days"; [2, 2] → "2 working days"; [1, 1] → "1 working day". */
export function transitLabel([min, max]: [number, number]): string {
  const range = min === max ? `${min}` : `${min}–${max}`;
  return `${range} working day${max === 1 ? "" : "s"}`;
}

/** Whole pounds without pence ("£100"), otherwise two decimals ("£6.50"). */
export function formatMoneyShort(amount: number): string {
  return Number.isInteger(amount) ? `£${amount.toLocaleString("en-GB")}` : formatGBP(amount);
}

/** 0.2 → 20, 0.175 → 17.5. */
export const vatPercent = (rate: number) => Math.round(rate * 10000) / 100;

/** Plain-English delivery prices for copy: fee and free-delivery threshold, both inc VAT. */
export function deliveryFacts(d: DeliverySettings) {
  const alwaysFree = d.fee === 0 || d.freeFrom === 0;
  return {
    alwaysFree,
    fee: formatGBP(d.fee),
    freeFrom: formatGBP(d.freeFrom),
    freeFromShort: formatMoneyShort(d.freeFrom),
    cutoff: cutoffLabel(d.cutoff),
    transit: transitLabel(d.transitDays),
  };
}

/** Homepage <title>: the SEO site title, or the shop name. */
export const siteTitle = (seo: SeoSettings, store: Pick<StoreSettings, "name">) => seo.siteTitle || store.name;

/** Pattern for other pages' titles: the SEO template, or "%s | <shop name>". */
export const titleTemplate = (seo: SeoSettings, store: Pick<StoreSettings, "name">) =>
  seo.titleTemplate.includes("%s") ? seo.titleTemplate : `%s | ${store.name}`;

/** "Page | Shop" for pages that set an absolute title. */
export const pageTitle = (title: string, seo: SeoSettings, store: Pick<StoreSettings, "name">) =>
  titleTemplate(seo, store).replace("%s", title);

/** Public contact facts the storefront's client components need (passed down from the server as props/context). */
export interface ShopInfo {
  name: string;
  logoUrl: string;
  phone: string;
  phoneHref: string;
  /** Country the phone fields start on (Settings → Store details). */
  phoneCountry: string;
  email: string;
  city: string;
}

export const toShopInfo = (store: StoreSettings): ShopInfo => ({
  name: store.name,
  logoUrl: store.logoUrl,
  phone: store.phone,
  phoneHref: telHref(store.phone),
  phoneCountry: store.phoneCountry,
  email: store.email,
  city: store.address.city,
});
