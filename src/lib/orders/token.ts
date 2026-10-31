// Signed order links: lets a guest open their own receipt (success page, email "view order" link) without an
// account. The token is an HMAC of the order number with the server secret, so it can't be guessed. Server-only.
import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error("BETTER_AUTH_SECRET is not set");
  return value;
}

export const orderToken = (orderNumber: string) =>
  createHmac("sha256", secret()).update(`order-receipt:${orderNumber}`).digest("base64url").slice(0, 32);

export function verifyOrderToken(orderNumber: string, token: string | undefined | null) {
  if (!token) return false;
  const expected = Buffer.from(orderToken(orderNumber));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
