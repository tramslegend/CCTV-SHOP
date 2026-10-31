// Order arithmetic shared by the basket (browser) and checkout (server), so both always agree to the penny.
// Catalogue prices are ex VAT; customers pay inc-VAT unit prices (rounded per unit, as the shop displays them).
// Delivery is configured inc VAT and is free once the items total (inc VAT) reaches the threshold.
// A discount code (rules in src/lib/discounts/rules.ts) is an inc-VAT amount off the items, or the delivery waived;
// its VAT share is split off at the VAT rate, so VAT is charged on the discounted amounts.
import { discountAmounts, type DiscountType, type PricedDiscount } from "@/lib/discounts/rules";
import { DELIVERY_FEE, FREE_DELIVERY_FROM, VAT_RATE } from "@/lib/cctvmaster/money";

export interface PricingSettings {
  /** e.g. 0.2 for 20% UK VAT. */
  vatRate: number;
  /** Delivery charge inc VAT. */
  deliveryFee: number;
  /** Items total (inc VAT) from which delivery is free (Infinity: never free). */
  freeDeliveryFrom: number;
  /** Same-day dispatch cut-off, "HH:MM" UK time. */
  cutoff: string;
}

export const DEFAULT_PRICING: PricingSettings = {
  vatRate: VAT_RATE,
  deliveryFee: DELIVERY_FEE,
  freeDeliveryFrom: FREE_DELIVERY_FROM,
  cutoff: "16:00",
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Inc-VAT unit price, rounded the same way as the storefront's withVat(). */
export const incVat = (exVat: number, rate: number) => Math.round(exVat * (1 + rate) * 100) / 100;

export interface PriceableLine {
  /** Unit price ex VAT. */
  unitPrice: number;
  qty: number;
}

export interface TotalsDiscount {
  code: string;
  type: DiscountType;
  value: number;
  /** Off the items, inc VAT. */
  items: number;
  /** Delivery waived, inc VAT. */
  delivery: number;
}

export interface Totals {
  units: number;
  /** Items before any discount. */
  itemsExVat: number;
  itemsIncVat: number;
  itemsVat: number;
  /** Standard delivery charge (before a free-delivery code). */
  deliveryIncVat: number;
  deliveryExVat: number;
  deliveryVat: number;
  /** Whole discount inc VAT (items part + waived delivery); 0 without a code. Stored as orders.discount. */
  discount: number;
  discountExVat: number;
  discountVat: number;
  /** The applied code, or null. */
  discountCode: TotalsDiscount | null;
  /** VAT on items and delivery, after the discount. */
  vat: number;
  /** Amount charged, inc VAT, after the discount. */
  total: number;
  vatRate: number;
  /** How much more (inc VAT) earns free delivery; 0 once it applies. */
  toFreeDelivery: number;
}

/** Splits an inc-VAT amount into ex VAT and VAT at `rate` (the same split everywhere, so documents add up). */
export function splitVat(incVatAmount: number, rate: number) {
  const exVat = round2(incVatAmount / (1 + rate));
  return { exVat, vat: round2(incVatAmount - exVat) };
}

export function priceLines(
  lines: PriceableLine[],
  settings: PricingSettings = DEFAULT_PRICING,
  discount: PricedDiscount | null = null,
): Totals {
  const rate = settings.vatRate;
  const units = lines.reduce((n, l) => n + l.qty, 0);
  const itemsExVat = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0));
  const itemsIncVat = round2(lines.reduce((sum, l) => sum + incVat(l.unitPrice, rate) * l.qty, 0));
  const itemsVat = round2(itemsIncVat - itemsExVat);
  const free = itemsIncVat === 0 || itemsIncVat >= settings.freeDeliveryFrom;
  const deliveryIncVat = free ? 0 : round2(settings.deliveryFee);
  const deliveryExVat = round2(deliveryIncVat / (1 + rate));
  const deliveryVat = round2(deliveryIncVat - deliveryExVat);
  const off = discount ? discountAmounts(discount, itemsIncVat, deliveryIncVat) : { items: 0, delivery: 0 };
  const discountTotal = round2(off.items + off.delivery);
  const split = splitVat(discountTotal, rate);
  return {
    units,
    itemsExVat,
    itemsIncVat,
    itemsVat,
    deliveryIncVat,
    deliveryExVat,
    deliveryVat,
    discount: discountTotal,
    discountExVat: split.exVat,
    discountVat: split.vat,
    discountCode: discount && discountTotal > 0 ? { ...discount, items: off.items, delivery: off.delivery } : null,
    vat: round2(itemsVat + deliveryVat - split.vat),
    total: round2(itemsIncVat + deliveryIncVat - discountTotal),
    vatRate: rate,
    // A delivery option that's never free (no threshold) has nothing to reach.
    toFreeDelivery: free || !Number.isFinite(settings.freeDeliveryFrom) ? 0 : Math.max(0, round2(settings.freeDeliveryFrom - itemsIncVat)),
  };
}

/**
 * The figures of a stored order (see the orders table), rebuilt for receipts and invoices.
 * Stored: subtotal = items ex VAT and deliveryFee = delivery ex VAT (both before the discount), discount = whole
 * discount inc VAT, vat and total after the discount. So items + delivery − discount (inc VAT) = total, and
 * itemsExVat + deliveryExVat − discountExVat + vat = total.
 */
export function orderFigures(
  order: {
    subtotal: number;
    deliveryFee: number;
    vat: number;
    total: number;
    discount: number;
    discountCode?: string | null;
    vatRate: number | null;
  },
  items: PriceableLine[],
) {
  const rate = order.vatRate ?? VAT_RATE;
  const itemsIncVat = round2(items.reduce((sum, l) => sum + incVat(l.unitPrice, rate) * l.qty, 0));
  const itemsVat = round2(itemsIncVat - order.subtotal);
  const deliveryIncVat = round2(order.total + order.discount - itemsIncVat);
  const discount = splitVat(order.discount, rate);
  return {
    units: items.reduce((n, l) => n + l.qty, 0),
    vatRate: rate,
    vatPercent: Math.round(rate * 1000) / 10,
    itemsExVat: order.subtotal,
    itemsIncVat,
    itemsVat,
    deliveryExVat: order.deliveryFee,
    deliveryIncVat,
    deliveryVat: round2(deliveryIncVat - order.deliveryFee),
    vat: order.vat,
    /** Whole discount inc VAT (0 without a code). */
    discount: order.discount,
    discountExVat: discount.exVat,
    discountVat: discount.vat,
    discountCode: order.discount > 0 ? (order.discountCode ?? null) : null,
    total: order.total,
    netTotal: round2(order.total - order.vat),
  };
}

/** "Discount (SAVE10)" or "Discount". */
export const discountLabel = (code: string | null | undefined) => (code ? `Discount (${code})` : "Discount");

export type OrderFigures = ReturnType<typeof orderFigures>;
