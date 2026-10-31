// How checkout works, as set in Admin → Checkout (settings key "checkout"). Client-safe: the checkout page, the admin
// forms and the server's checks all use these types and helpers.
//
// Delivery options: the first is the shop's standard delivery. Its price and free-delivery threshold are stored in the
// "delivery" settings key (as before), because the delivery messages across the shop read them from there; the other
// options are stored here in full.
import { z } from "zod";
import type { PricingSettings } from "@/lib/orders/pricing";

export type DeliveryKind = "delivery" | "collect";

export interface DeliveryOption {
  /** Stable id sent by the checkout, e.g. "standard" or "next-day". */
  id: string;
  /** Shown to customers and stored on the order, e.g. "Royal Mail Tracked 48". */
  name: string;
  kind: DeliveryKind;
  /** Inc VAT. */
  price: number;
  /** Items total (inc VAT) from which it's free; null = never free. Standard delivery always has a number. */
  freeFrom: number | null;
  /** e.g. "2–3 working days" or "Ready the next working day". */
  estimate: string;
  /** Postcode areas, districts or ranges it doesn't serve, e.g. ["BT", "IV1", "PA20-49"] (delivery only). */
  excludedAreas: string[];
  enabled: boolean;
}

export type PhoneRule = "required" | "optional" | "hidden";

export interface CheckoutSettings {
  ordering: { enabled: boolean; pausedMessage: string };
  delivery: DeliveryOption[];
  form: {
    guestCheckout: boolean;
    phone: PhoneRule;
    company: boolean;
    notes: boolean;
    requireTerms: boolean;
    /** Items total (inc VAT, after any discount on the items) an order must reach; 0 = no minimum. */
    minimumOrder: number;
  };
  messages: { notice: string; thankYou: string; emailNote: string };
}

export const STANDARD_DELIVERY_ID = "standard";
export const STANDARD_DELIVERY_NAME = "UK delivery · Royal Mail Tracked 48";

/** The behaviour before Admin → Checkout existed: one standard delivery, guest checkout, phone required. */
export const DEFAULT_CHECKOUT: CheckoutSettings = {
  ordering: { enabled: true, pausedMessage: "" },
  delivery: [
    { id: STANDARD_DELIVERY_ID, name: STANDARD_DELIVERY_NAME, kind: "delivery", price: 0, freeFrom: 0, estimate: "", excludedAreas: [], enabled: true },
  ],
  form: { guestCheckout: true, phone: "required", company: true, notes: false, requireTerms: false, minimumOrder: 0 },
  messages: { notice: "", thankYou: "", emailNote: "" },
};

export const PHONE_RULES: readonly PhoneRule[] = ["required", "optional", "hidden"];

// ---------- postcode areas ----------

const AREA_RE = /^[A-Z]{1,2}$/;
const DISTRICT_RE = /^[A-Z]{1,2}\d{1,2}[A-Z]?$/;
const RANGE_RE = /^([A-Z]{1,2})(\d{1,2})-(?:[A-Z]{1,2})?(\d{1,2})$/;

/** "pa 20 - pa49" → "PA20-PA49"-style entry, uppercase without spaces. */
const normaliseArea = (entry: string) => entry.toUpperCase().replace(/\s+/g, "");

/** Splits typed areas ("BT, IV1\nPA20-49") into entries, and lists the ones that aren't a postcode area. */
export function parseAreas(text: string): { areas: string[]; invalid: string[] } {
  const areas: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/[,;\n]/)) {
    const entry = normaliseArea(raw);
    if (!entry) continue;
    const range = RANGE_RE.exec(entry);
    const valid = AREA_RE.test(entry) || DISTRICT_RE.test(entry) || (range !== null && Number(range[2]) <= Number(range[3]));
    if (!valid) invalid.push(raw.trim());
    else if (!areas.includes(entry)) areas.push(entry);
  }
  return { areas, invalid };
}

/** Whether a UK postcode falls in any of the areas ("BT" area, "IV1" district or "PA20-49" range of districts). */
export function postcodeInAreas(postcode: string, areas: string[]): boolean {
  const compact = postcode.toUpperCase().replace(/\s+/g, "");
  if (compact.length < 5) return false;
  const outward = compact.slice(0, -3);
  const m = /^([A-Z]{1,2})(\d{1,2})/.exec(outward);
  if (!m) return false;
  const [, area, digits] = m;
  return areas.some((entry) => {
    if (AREA_RE.test(entry)) return entry === area;
    if (DISTRICT_RE.test(entry)) return entry === outward;
    const range = RANGE_RE.exec(entry);
    return !!range && range[1] === area && Number(digits) >= Number(range[2]) && Number(digits) <= Number(range[3]);
  });
}

/** A starting list of remote UK areas couriers often charge extra for or don't serve (editable). */
export const REMOTE_UK_AREAS = "HS, IV, KW, ZE, PA20-49, PA60-78, PH17-26, PH30-44, PH49-50, AB31-38, AB41-56, KA27-28, FK17-21, BT, IM, GY, JE, TR21-25, PO30-41";

// ---------- choosing and pricing an option ----------

/** Options a customer can pick: enabled, and (for delivery) serving the postcode when one is known. */
export function availableOptions(options: DeliveryOption[], postcode: string): DeliveryOption[] {
  return options.filter((o) => o.enabled && (o.kind === "collect" || !postcode.trim() || !postcodeInAreas(postcode, o.excludedAreas)));
}

/** Basket and checkout arithmetic for one option: its price, free from its threshold (never when it has none). */
export const pricingFor = (base: PricingSettings, option: Pick<DeliveryOption, "price" | "freeFrom">): PricingSettings => ({
  ...base,
  deliveryFee: option.price,
  freeDeliveryFrom: option.freeFrom ?? Number.POSITIVE_INFINITY,
});

/** The option an order's stored delivery method came from (matched by its name), while it still exists. */
export const optionNamed = (options: DeliveryOption[], name: string | null | undefined) => (name ? options.find((o) => o.name === name) : undefined);

/** The part of the settings the shop's checkout page needs (sent to the browser). */
export interface PublicCheckout {
  ordering: CheckoutSettings["ordering"];
  options: DeliveryOption[];
  form: CheckoutSettings["form"];
  notice: string;
  /** Collection address shown for click & collect options. */
  collectFrom: string;
}

export const toPublicCheckout = (s: CheckoutSettings, collectFrom: string): PublicCheckout => ({
  ordering: s.ordering,
  options: s.delivery.filter((o) => o.enabled),
  form: s.form,
  notice: s.messages.notice,
  collectFrom,
});

// ---------- lenient parsing of the stored value ----------

const text = (max: number) =>
  z
    .string()
    .transform((v) => v.trim().slice(0, max))
    .catch("");
const money = (max: number) => z.number().finite().min(0).max(max);

const storedOption = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().trim().min(1).max(80),
  kind: z.enum(["delivery", "collect"]).catch("delivery"),
  price: money(1000).catch(0),
  freeFrom: money(1_000_000).nullable().catch(null),
  estimate: text(80),
  excludedAreas: z
    .array(z.string())
    .catch([])
    .transform((list) => parseAreas(list.join(",")).areas),
  enabled: z.boolean().catch(true),
});

const storedCheckout = z.object({
  ordering: z.object({ enabled: z.boolean().catch(true), pausedMessage: text(500) }).catch(DEFAULT_CHECKOUT.ordering),
  delivery: z
    .array(z.unknown())
    .catch([])
    .transform((list) => list.flatMap((o) => (storedOption.safeParse(o).success ? [storedOption.parse(o)] : []))),
  form: z
    .object({
      guestCheckout: z.boolean().catch(true),
      phone: z.enum(["required", "optional", "hidden"]).catch("required"),
      company: z.boolean().catch(true),
      notes: z.boolean().catch(false),
      requireTerms: z.boolean().catch(false),
      minimumOrder: money(100_000).catch(0),
    })
    .catch(DEFAULT_CHECKOUT.form),
  messages: z.object({ notice: text(500), thankYou: text(1000), emailNote: text(1000) }).catch(DEFAULT_CHECKOUT.messages),
});

/**
 * Checkout settings from the stored "checkout" value and the standard delivery's price and threshold (settings key
 * "delivery"). Bad or missing data falls back to the defaults; standard delivery always comes first and is always on.
 */
export function parseCheckout(raw: unknown, standard: { fee: number; freeFrom: number }): CheckoutSettings {
  const parsed = storedCheckout.safeParse(raw ?? {});
  const value = parsed.success ? parsed.data : { ...DEFAULT_CHECKOUT, delivery: [] };
  const storedStandard = value.delivery.find((o) => o.id === STANDARD_DELIVERY_ID);
  const standardOption: DeliveryOption = {
    ...(storedStandard ?? DEFAULT_CHECKOUT.delivery[0]),
    id: STANDARD_DELIVERY_ID,
    kind: "delivery",
    enabled: true,
    price: standard.fee,
    freeFrom: standard.freeFrom,
  };
  const ids = new Set([STANDARD_DELIVERY_ID]);
  const others = value.delivery.filter((o) => (ids.has(o.id) ? false : (ids.add(o.id), true)));
  return { ...value, delivery: [standardOption, ...others] };
}
