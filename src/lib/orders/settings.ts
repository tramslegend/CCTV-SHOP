// Store settings the order flow depends on, read fresh from the settings table with safe fallbacks. Server-only.
import { db } from "@/db";
import { VAT_RATE } from "@/lib/cctvmaster/money";
import { addressLine } from "@/lib/settings/format";
import { parseSetting } from "@/lib/settings/schema";
import { DEFAULT_PRICING, type PricingSettings } from "./pricing";

const num = (value: unknown, fallback: number, { min = 0, max = Infinity } = {}) => {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

async function readSettings(keys: string[]) {
  const rows = await db.settings.find({ _id: { $in: keys } }).toArray();
  return new Map(rows.map((r) => [r.key, (r.value ?? {}) as Record<string, unknown>]));
}

/**
 * Delivery fee, free-delivery threshold, VAT rate and dispatch cut-off. The VAT rate is the shop-wide UK standard
 * rate (VAT_RATE): product and listing prices are calculated with it, so checkout must use exactly the same rate.
 */
export async function getPricingSettings(): Promise<PricingSettings> {
  const map = await readSettings(["delivery"]);
  const delivery = map.get("delivery") ?? {};
  const cutoff = typeof delivery.cutoff === "string" && /^\d{1,2}:\d{2}$/.test(delivery.cutoff) ? delivery.cutoff : DEFAULT_PRICING.cutoff;
  return {
    deliveryFee: num(delivery.fee, DEFAULT_PRICING.deliveryFee, { max: 1000 }),
    freeDeliveryFrom: num(delivery.freeFrom, DEFAULT_PRICING.freeDeliveryFrom),
    vatRate: VAT_RATE,
    cutoff,
  };
}

export interface StoreDetails {
  name: string;
  legalName: string;
  address: string;
  email: string;
  phone: string;
  vatNumber?: string;
  companyNumber?: string;
}

/**
 * Seller details for emails, packing slips and VAT invoices (settings key "store", edited in /admin/settings).
 * Fields the owner hasn't filled in are empty strings (the name falls back to a neutral "Shop").
 */
export async function getStoreDetails(): Promise<StoreDetails> {
  const store = parseSetting("store", (await readSettings(["store"])).get("store"));
  return {
    name: store.name,
    legalName: store.legalName || store.name,
    address: addressLine(store.address),
    email: store.email,
    phone: store.phone,
    vatNumber: store.vatNumber || undefined,
    companyNumber: store.companyNumber || undefined,
  };
}

/** Public site origin for links in emails and Stripe redirects. */
export const siteUrl = () => (process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
