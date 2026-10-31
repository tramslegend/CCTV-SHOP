// Shop settings stored in the `settings` table (key → jsonb): one typed shape per key, neutral defaults, and a lenient
// parser for reading, so a missing or malformed value never breaks the shop (the field falls back to its default).
// Nothing shop-specific belongs in this file: the owner fills in the real details under /admin/settings.
// Client-safe (no server imports).
import { z } from "zod";
import { DEFAULT_PRICING } from "@/lib/orders/pricing";

export const SETTING_KEYS = ["store", "delivery", "tax", "notifications", "seo", "social"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export interface StoreAddress {
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}

export interface OpeningHoursRow {
  /** e.g. "Mon – Fri". */
  days: string;
  /** e.g. "09:00 – 17:00" or "Closed". */
  hours: string;
}

/** Key "store": brand and contact details (also read by src/lib/orders/settings.ts for invoices and emails). */
export interface StoreSettings {
  name: string;
  legalName: string;
  tagline: string;
  logoUrl: string;
  /** Optional light version of the logo for dark backgrounds (the footer). */
  logoDarkUrl: string;
  phone: string;
  /** Country the customers' phone fields start on, ISO code ("GB", "ES"); they can pick any other. */
  phoneCountry: string;
  email: string;
  address: StoreAddress;
  openingHours: OpeningHoursRow[];
  companyNumber: string;
  vatNumber: string;
  /** Registered office, when it differs from the trading address (shown on the terms page). */
  registeredOffice: string;
  /** Link to the shop on a map; built from the address when empty. */
  mapUrl: string;
}

/** Key "delivery" (read by src/lib/orders/settings.ts for checkout totals). Amounts inc VAT. */
export interface DeliverySettings {
  fee: number;
  freeFrom: number;
  /** Same-day dispatch cut-off, "HH:MM" UK time. */
  cutoff: string;
  /** Working days in transit after dispatch, [min, max]. */
  transitDays: [number, number];
}

/** Key "tax". `vatRate` is a fraction (0.2 = 20%). */
export interface TaxSettings {
  vatRate: number;
}

/** Key "notifications": where new-order and new-message emails go (SHOP_NOTIFY_EMAIL when empty). */
export interface NotificationSettings {
  ordersEmail: string;
  messagesEmail: string;
}

/** Key "seo": homepage title, the "%s | Shop" pattern for other pages, and the default meta description. */
export interface SeoSettings {
  siteTitle: string;
  titleTemplate: string;
  description: string;
}

/** Key "social": profile URLs (empty = not shown). */
export interface SocialSettings {
  facebook: string;
  instagram: string;
  x: string;
  youtube: string;
  linkedin: string;
}

export interface ShopSettings {
  store: StoreSettings;
  delivery: DeliverySettings;
  tax: TaxSettings;
  notifications: NotificationSettings;
  seo: SeoSettings;
  social: SocialSettings;
}

// ---------- neutral defaults ----------

export const DEFAULT_STORE_NAME = "Shop";

export const DEFAULT_ADDRESS: StoreAddress = { line1: "", line2: "", city: "", county: "", postcode: "", country: "United Kingdom" };

export const DEFAULT_SETTINGS: ShopSettings = {
  store: {
    name: DEFAULT_STORE_NAME,
    legalName: "",
    tagline: "",
    logoUrl: "",
    logoDarkUrl: "",
    phone: "",
    phoneCountry: "GB",
    email: "",
    address: DEFAULT_ADDRESS,
    openingHours: [],
    companyNumber: "",
    vatNumber: "",
    registeredOffice: "",
    mapUrl: "",
  },
  delivery: {
    fee: DEFAULT_PRICING.deliveryFee,
    freeFrom: DEFAULT_PRICING.freeDeliveryFrom,
    cutoff: DEFAULT_PRICING.cutoff,
    transitDays: [1, 3],
  },
  tax: { vatRate: DEFAULT_PRICING.vatRate },
  notifications: { ordersEmail: "", messagesEmail: "" },
  seo: { siteTitle: "", titleTemplate: "", description: "" },
  social: { facebook: "", instagram: "", x: "", youtube: "", linkedin: "" },
};

// ---------- lenient parsing of stored values ----------

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A stored string, trimmed and capped; anything else becomes `fallback`. */
const text = (max = 500, fallback = "") =>
  z
    .string()
    .transform((s) => s.trim().slice(0, max))
    .catch(fallback);

/** A stored number (or numeric string) within range; anything else becomes `fallback`. */
const amount = (fallback: number, max: number) =>
  z
    .preprocess((v) => (typeof v === "string" && v.trim() ? Number(v) : v), z.number().finite().min(0).max(max))
    .catch(fallback);

const wholeDays = (fallback: number) =>
  z
    .preprocess((v) => (typeof v === "string" && v.trim() ? Number(v) : v), z.number().int().min(0).max(60))
    .catch(fallback);

export const CUTOFF_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const storedAddress = z
  .preprocess(
    // Older values kept the address as one line of text.
    (v) => (typeof v === "string" ? { ...DEFAULT_ADDRESS, line1: v } : v),
    z.object({
      line1: text(120),
      line2: text(120),
      city: text(80),
      county: text(80),
      postcode: text(16),
      country: text(60),
    }),
  )
  .catch(DEFAULT_ADDRESS);

const storedHours = z
  .array(z.object({ days: text(40), hours: text(40) }))
  .catch([])
  .transform((rows) => rows.filter((r) => r.days || r.hours).slice(0, 14));

const D = DEFAULT_SETTINGS;

const storedStore = z
  .preprocess(
    (v) => (isRecord(v) && !v.legalName && typeof v.companyName === "string" ? { ...v, legalName: v.companyName } : v),
    z.object({
      name: text(80).transform((s) => s || DEFAULT_STORE_NAME),
      legalName: text(120),
      tagline: text(200),
      logoUrl: text(2000),
      logoDarkUrl: text(2000),
      phone: text(40),
      // Checked against the countries the phone field knows where it's used (src/lib/phone.ts).
      phoneCountry: z
        .string()
        .transform((s) => s.trim().toUpperCase())
        .pipe(z.string().regex(/^[A-Z]{2}$/))
        .catch(D.store.phoneCountry),
      email: text(254),
      address: storedAddress,
      openingHours: storedHours,
      companyNumber: text(20),
      vatNumber: text(20),
      registeredOffice: text(240),
      mapUrl: text(2000),
    }),
  )
  .catch(D.store);

const storedDelivery = z
  .object({
    fee: amount(D.delivery.fee, 1000),
    freeFrom: amount(D.delivery.freeFrom, 1_000_000),
    cutoff: z
      .string()
      .regex(CUTOFF_RE)
      .transform((s) => s.padStart(5, "0"))
      .catch(D.delivery.cutoff),
    transitDays: z
      .tuple([wholeDays(1), wholeDays(3)])
      .catch(D.delivery.transitDays)
      .transform(([a, b]): [number, number] => (a <= b ? [a, b] : [b, a])),
  })
  .catch(D.delivery);

const storedTax = z.object({ vatRate: amount(D.tax.vatRate, 1) }).catch(D.tax);

const storedNotifications = z.object({ ordersEmail: text(254), messagesEmail: text(254) }).catch(D.notifications);

const storedSeo = z.object({ siteTitle: text(120), titleTemplate: text(120), description: text(400) }).catch(D.seo);

const storedSocial = z
  .object({ facebook: text(500), instagram: text(500), x: text(500), youtube: text(500), linkedin: text(500) })
  .catch(D.social);

const PARSERS: { [K in SettingKey]: z.ZodType<ShopSettings[K]> } = {
  store: storedStore,
  delivery: storedDelivery,
  tax: storedTax,
  notifications: storedNotifications,
  seo: storedSeo,
  social: storedSocial,
};

/** Typed value of a settings key from whatever is stored (undefined, legacy shapes, bad data → defaults). */
export function parseSetting<K extends SettingKey>(key: K, raw: unknown): ShopSettings[K] {
  const parsed = PARSERS[key].safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS[key];
}

/** All six keys from a key → raw value lookup. */
export function parseSettings(get: (key: SettingKey) => unknown): ShopSettings {
  return {
    store: parseSetting("store", get("store")),
    delivery: parseSetting("delivery", get("delivery")),
    tax: parseSetting("tax", get("tax")),
    notifications: parseSetting("notifications", get("notifications")),
    seo: parseSetting("seo", get("seo")),
    social: parseSetting("social", get("social")),
  };
}
