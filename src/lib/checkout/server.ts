// Reads the checkout settings fresh from the database (Admin → Checkout takes effect on the next request). Server-only.
import { db } from "@/db";
import { parseSetting } from "@/lib/settings/schema";
import { type CheckoutSettings, parseCheckout } from "./settings";

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  const rows = await db.settings.find({ _id: { $in: ["checkout", "delivery"] } }).toArray();
  const raw = new Map(rows.map((r) => [r.key, r.value]));
  const delivery = parseSetting("delivery", raw.get("delivery"));
  return parseCheckout(raw.get("checkout"), { fee: delivery.fee, freeFrom: delivery.freeFrom });
}

/** Raw stored values, for saving (unknown keys already stored are kept). */
export async function readRawCheckout() {
  const rows = await db.settings.find({ _id: { $in: ["checkout", "delivery"] } }).toArray();
  return new Map(rows.map((r) => [r.key, r.value]));
}
