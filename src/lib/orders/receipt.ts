// Serializable view of an order for receipts and account pages (no internal notes or payment refs).
import type { OrderItemRow, OrderRow } from "@/db/schema";
import type { StoredAddress } from "./format";
import { incVat, orderFigures, type OrderFigures } from "./pricing";
import { DELIVERY_METHOD, trackingUrl, type OrderStatus } from "./status";

type Order = OrderRow;
type Item = OrderItemRow;

export interface ReceiptItem {
  id: number;
  slug?: string;
  name: string;
  sku?: string;
  image?: string;
  /** Unit price ex VAT (for "buy again"). */
  unitPrice: number;
  unitIncVat: number;
  qty: number;
}

export interface ReceiptOrder {
  number: string;
  status: OrderStatus;
  placedAt: string;
  paidAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  email: string;
  phone?: string;
  shipping: StoredAddress;
  billing: StoredAddress | null;
  deliveryMethod: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  refunded: number;
  items: ReceiptItem[];
  figures: OrderFigures;
}

export function toReceipt(order: Order, items: Item[]): ReceiptOrder {
  const rate = order.vatRate ?? 0.2;
  return {
    number: order.number,
    status: order.status,
    placedAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    dispatchedAt: order.dispatchedAt?.toISOString(),
    deliveredAt: order.deliveredAt?.toISOString(),
    email: order.email,
    phone: order.phone ?? undefined,
    shipping: order.shippingAddress as StoredAddress,
    billing: (order.billingAddress as StoredAddress | null) ?? null,
    deliveryMethod: order.deliveryMethod ?? DELIVERY_METHOD,
    carrier: order.carrier ?? undefined,
    trackingNumber: order.trackingNumber ?? undefined,
    trackingUrl: trackingUrl(order.carrier, order.trackingNumber) ?? undefined,
    refunded: order.refundedAmount,
    items: items.map((i) => ({
      id: i.id,
      slug: i.slug ?? undefined,
      name: i.name,
      sku: i.sku ?? undefined,
      image: i.imageUrl ?? undefined,
      unitPrice: i.unitPrice,
      unitIncVat: incVat(i.unitPrice, rate),
      qty: i.qty,
    })),
    figures: orderFigures(order, items),
  };
}
