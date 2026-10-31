// Display helpers for stored orders (client-safe).
export { formatGBP } from "@/lib/cctvmaster/money";

/** Stored address (orders.shipping_address / billing_address, addresses rows). */
export interface StoredAddress {
  name?: string;
  company?: string;
  line1?: string;
  line2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  phone?: string;
  country?: string;
}

export const addressLines = (a: StoredAddress | null | undefined) =>
  a ? [a.name, a.company, a.line1, a.line2, a.city, a.county, a.postcode].filter((p): p is string => !!p && !!p.trim()) : [];

export const addressOneLine = (a: StoredAddress | null | undefined) => addressLines(a).join(", ");

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export const formatDate = (value: Date | string, withTime = false) =>
  (withTime ? dateTimeFmt : dateFmt).format(typeof value === "string" ? new Date(value) : value);

export const itemsText = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;
