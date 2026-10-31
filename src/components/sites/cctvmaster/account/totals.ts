import { DEFAULT_PRICING, type PricingSettings, priceLines } from "@/lib/orders/pricing";
import type { CartLine } from "../shop-state";

/**
 * Basket figures as the source's order summary shows them (items ex VAT, delivery inc. VAT, VAT on items).
 * Same arithmetic as the server's checkout (src/lib/orders/pricing.ts), using the store's delivery/VAT settings.
 */
export function basketTotals(lines: CartLine[], settings: PricingSettings = DEFAULT_PRICING) {
  const t = priceLines(
    lines.map((l) => ({ unitPrice: l.price, qty: l.qty })),
    settings,
  );
  return {
    count: t.units,
    itemsExVat: t.itemsExVat,
    /** Items inc. VAT. */
    subtotal: t.itemsIncVat,
    /** VAT on the items (delivery is shown inc. VAT). */
    vat: t.itemsVat,
    delivery: t.deliveryIncVat,
    total: t.total,
    toFreeDelivery: t.toFreeDelivery,
    freeDeliveryProgress: Math.min(100, (t.itemsIncVat / settings.freeDeliveryFrom) * 100),
    freeDeliveryFrom: settings.freeDeliveryFrom,
    deliveryFee: settings.deliveryFee,
    vatPercent: Math.round(settings.vatRate * 1000) / 10,
  };
}

export const itemsLabel = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;
