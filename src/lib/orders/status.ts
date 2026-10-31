// Order statuses, event types and carriers: labels shared by the shop, the account pages and the back office.
export const ORDER_STATUSES = ["pending_payment", "paid", "processing", "dispatched", "delivered", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** What a customer sees: a paid order is "Confirmed" until it is being packed. */
export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  ...STATUS_LABEL,
  paid: "Confirmed",
};

/** Badge colours (Tailwind) used on both the shop and admin side. */
export const STATUS_TONE: Record<OrderStatus, string> = {
  pending_payment: "border-zinc-200 bg-zinc-50 text-zinc-700",
  paid: "border-amber-200 bg-amber-50 text-amber-800",
  processing: "border-amber-200 bg-amber-50 text-amber-800",
  dispatched: "border-sky-200 bg-sky-50 text-sky-800",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  refunded: "border-violet-200 bg-violet-50 text-violet-800",
};

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);

/** Order timeline entry types (order_events.type). */
export const EVENT = {
  placed: "placed",
  paymentStarted: "payment_started",
  paid: "paid",
  paymentIssue: "payment_issue",
  processing: "processing",
  dispatched: "dispatched",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "refunded",
  note: "note",
  email: "email",
  stock: "stock",
  customer: "customer",
  discount: "discount",
} as const;

/** Event types a customer is notified about in their account. */
export const CUSTOMER_EVENTS: readonly string[] = [EVENT.paid, EVENT.processing, EVENT.dispatched, EVENT.delivered, EVENT.cancelled, EVENT.refunded];

export const CARRIERS = [
  { id: "royal-mail", name: "Royal Mail", url: (n: string) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}` },
  { id: "parcelforce", name: "Parcelforce", url: (n: string) => `https://www.parcelforce.com/track-trace?trackNumber=${n}` },
  { id: "dpd", name: "DPD", url: (n: string) => `https://track.dpd.co.uk/parcels/${n}` },
  { id: "evri", name: "Evri", url: (n: string) => `https://www.evri.com/track/parcel/${n}` },
  { id: "dhl", name: "DHL", url: (n: string) => `https://www.dhl.com/gb-en/home/tracking/tracking-express.html?tracking-id=${n}` },
  { id: "ups", name: "UPS", url: (n: string) => `https://www.ups.com/track?tracknum=${n}` },
  { id: "fedex", name: "FedEx", url: (n: string) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  { id: "other", name: "Other courier", url: null },
] as const;

/** Tracking page for a carrier name + tracking number, when the carrier is known. */
export function trackingUrl(carrier: string | null | undefined, trackingNumber: string | null | undefined) {
  if (!carrier || !trackingNumber) return null;
  const match = CARRIERS.find((c) => c.name === carrier || c.id === carrier);
  return match?.url ? match.url(encodeURIComponent(trackingNumber)) : null;
}

export const DELIVERY_METHOD = "UK delivery · Royal Mail Tracked 48";
