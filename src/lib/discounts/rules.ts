// Discount code rules shared by checkout (server), the basket summary (browser) and the back office. Client-safe.
//
// How a discount is priced (src/lib/orders/pricing.ts applies it):
// - "percent" and "fixed" come off the items only, never delivery. Percent is of the items total inc. VAT; fixed is
//   pounds inc. VAT and never more than the items total. Quote-only products can't be in a priced basket, so they
//   never get a discount.
// - "free_delivery" waives the delivery charge (inc. VAT); it is refused when delivery is already free.
// - The free-delivery threshold and a code's minimum spend use the items total inc. VAT before any discount.
// - orders.discount stores the whole discount inc. VAT (items part + waived delivery). Its VAT share is split off at
//   the order's VAT rate, so items ex VAT + delivery ex VAT − discount ex VAT + VAT = total, to the penny.

export const DISCOUNT_TYPES = ["percent", "fixed", "free_delivery"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  percent: "Percentage off",
  fixed: "Fixed amount off",
  free_delivery: "Free delivery",
};

/** What checkout needs to price a code (a row of discount_codes, already checked as usable). */
export interface PricedDiscount {
  code: string;
  type: DiscountType;
  /** Percent (0–100] for "percent", pounds inc. VAT for "fixed", 0 for "free_delivery". */
  value: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Pounds off the items and off delivery (both inc. VAT) for a code on a basket. */
export function discountAmounts(d: Pick<PricedDiscount, "type" | "value">, itemsIncVat: number, deliveryIncVat: number) {
  if (!(itemsIncVat > 0)) return { items: 0, delivery: 0 };
  switch (d.type) {
    case "percent":
      return { items: Math.min(itemsIncVat, round2((itemsIncVat * Math.min(100, Math.max(0, d.value))) / 100)), delivery: 0 };
    case "fixed":
      return { items: Math.min(itemsIncVat, round2(Math.max(0, d.value))), delivery: 0 };
    case "free_delivery":
      return { items: 0, delivery: round2(Math.max(0, deliveryIncVat)) };
  }
}

/** "10% off", "£5.00 off", "Free delivery". */
export function describeDiscount(d: Pick<PricedDiscount, "type" | "value">) {
  if (d.type === "percent") return `${formatPercent(d.value)} off`;
  if (d.type === "fixed") return `${gbp(d.value)} off`;
  return "Free delivery";
}

export const formatPercent = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, "")}%`;
const gbp = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------- codes ----------

export const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

/** Upper-case, no spaces: how a code is stored, typed and compared. */
export const normaliseCode = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, "");

/** Unambiguous characters (no 0/O, 1/I/L) for generated codes. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A random code like "SAVE-7K3QF9XM" (prefix optional), using the browser or Node crypto. */
export function generateCode(prefix = "", length = 8) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  const p = normaliseCode(prefix).replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return p ? `${p}-${body}` : body;
}

// ---------- status ----------

export const DISCOUNT_STATUSES = ["active", "scheduled", "expired", "used_up", "inactive"] as const;
export type DiscountStatus = (typeof DISCOUNT_STATUSES)[number];

export const DISCOUNT_STATUS_LABEL: Record<DiscountStatus, string> = {
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
  used_up: "Used up",
  inactive: "Inactive",
};

export interface CodeWindow {
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  uses: number;
}

/** Where a code stands right now. Switched off wins, then expired, used up, not started yet. */
export function codeStatus(c: CodeWindow, now = new Date()): DiscountStatus {
  if (!c.active) return "inactive";
  if (c.endsAt && c.endsAt.getTime() < now.getTime()) return "expired";
  if (c.maxUses !== null && c.uses >= c.maxUses) return "used_up";
  if (c.startsAt && c.startsAt.getTime() > now.getTime()) return "scheduled";
  return "active";
}

// ---------- UK dates ----------

const londonParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Minutes London is ahead of UTC at `instant` (0 in winter, 60 in summer). */
function londonOffsetMinutes(instant: Date) {
  const p = Object.fromEntries(londonParts.formatToParts(instant).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/** The instant a UK calendar day ("yyyy-mm-dd") starts, or ends (last millisecond) with `end`. */
export function ukDayBoundary(date: string, end = false) {
  const [y, m, d] = date.split("-").map(Number);
  const midnightUtc = Date.UTC(y, m - 1, d + (end ? 1 : 0));
  // Two passes settle the offset around the clock changes (always at 01:00 UTC, never near midnight).
  let t = midnightUtc - londonOffsetMinutes(new Date(midnightUtc)) * 60000;
  t = midnightUtc - londonOffsetMinutes(new Date(t)) * 60000;
  return new Date(end ? t - 1 : t);
}

/** UK calendar day of an instant, "yyyy-mm-dd" (for date inputs). */
export function ukDateInput(instant: Date | null | undefined) {
  if (!instant) return "";
  const p = Object.fromEntries(londonParts.formatToParts(instant).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

const ukLong = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
const ukShort = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

export const ukDateLong = (d: Date) => ukLong.format(d);
export const ukDateShort = (d: Date) => ukShort.format(d);

// ---------- checking a code against a basket ----------

export interface CodeCheckInput {
  /** Items total inc. VAT, before any discount. */
  itemsIncVat: number;
  /** Delivery charge inc. VAT, before any discount. */
  deliveryIncVat: number;
  /** Paid orders this customer email has already placed with the code (only checked for one-per-customer codes). */
  usesByEmail: number;
  now?: Date;
}

export interface CheckableCode extends CodeWindow, PricedDiscount {
  minSpend: number | null;
  oncePerCustomer: boolean;
}

export type CodeCheck = { ok: true; discount: PricedDiscount } | { ok: false; message: string };

export const UNKNOWN_CODE = "We don’t recognise that code. Check it and try again.";

/** Whether a code can be used on this basket, with the friendly reason when it can't. */
export function checkCode(c: CheckableCode | null | undefined, input: CodeCheckInput): CodeCheck {
  if (!c) return { ok: false, message: UNKNOWN_CODE };
  const now = input.now ?? new Date();
  switch (codeStatus(c, now)) {
    case "inactive":
      return { ok: false, message: "This code isn’t available any more." };
    case "expired":
      return { ok: false, message: "This code has expired." };
    case "used_up":
      return { ok: false, message: "This code has been used up." };
    case "scheduled":
      return { ok: false, message: `This code can be used from ${ukDateLong(c.startsAt ?? now)}.` };
    case "active":
      break;
  }
  if (!(input.itemsIncVat > 0)) return { ok: false, message: "Add something to your basket to use this code." };
  if (c.minSpend !== null && c.minSpend > 0 && input.itemsIncVat < c.minSpend) {
    return { ok: false, message: `Spend ${gbp(round2(c.minSpend - input.itemsIncVat))} more to use this code.` };
  }
  if (c.oncePerCustomer && input.usesByEmail > 0) return { ok: false, message: "You’ve already used this code." };
  if (c.type === "free_delivery" && !(input.deliveryIncVat > 0)) {
    return { ok: false, message: "Your order already has free delivery, so this code isn’t needed." };
  }
  return { ok: true, discount: { code: c.code, type: c.type, value: c.value } };
}
