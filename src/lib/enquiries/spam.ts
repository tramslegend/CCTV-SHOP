// Basic spam protection for the storefront enquiry forms. Server-only.
// 1. Honeypot: a hidden field people never see (checked in actions.ts).
// 2. Timing: each form fetches a signed "form started" token when it appears; submissions sent less than
//    MIN_FILL_MS after that are rejected, as are forged or very old tokens.
// 3. Rate limit: at most RATE_LIMIT enquiries per IP address in RATE_WINDOW_MINUTES, counted in the database so it
//    holds across server instances. Only a salted hash of the address is stored.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/db";
import type { EnquirySource } from "./types";

export const MIN_FILL_MS = 2_000;
const MAX_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;
export const RATE_LIMIT = 6;
export const RATE_WINDOW_MINUTES = 10;

const globalForSpam = globalThis as unknown as { enquirySecret?: string };

function secret() {
  const base = process.env.BETTER_AUTH_SECRET;
  if (base) return createHmac("sha256", base).update("enquiry-form-token").digest("hex");
  // No configured secret (unusual): a per-process one still blocks forged tokens.
  globalForSpam.enquirySecret ??= randomBytes(32).toString("hex");
  return globalForSpam.enquirySecret;
}

const sign = (issuedAt: number) => createHmac("sha256", secret()).update(`enquiry:${issuedAt}`).digest("base64url");

export function issueFormToken(now = Date.now()) {
  return `${now}.${sign(now)}`;
}

export type TokenCheck = "ok" | "missing" | "invalid" | "too-fast" | "expired";

export function checkFormToken(token: unknown, now = Date.now()): TokenCheck {
  if (typeof token !== "string" || !token) return "missing";
  const [ts, sig] = token.split(".");
  const issuedAt = Number(ts);
  if (!Number.isSafeInteger(issuedAt) || !sig) return "invalid";
  const expected = Buffer.from(sign(issuedAt));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  const age = now - issuedAt;
  if (age < MIN_FILL_MS) return "too-fast";
  if (age > MAX_TOKEN_AGE_MS) return "expired";
  return "ok";
}

/** Request details recorded with the enquiry: the page it came from, a hash of the IP address, the browser. */
export async function requestSource(): Promise<Required<Pick<EnquirySource, "ipHash">> & EnquirySource> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  const ipHash = createHash("sha256").update(`${secret()}:${ip}`).digest("hex").slice(0, 24);
  let page: string | undefined;
  const referer = h.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      page = `${url.pathname}${url.search}`.slice(0, 300);
    } catch {
      page = undefined;
    }
  }
  const userAgent = h.get("user-agent")?.slice(0, 300) || undefined;
  return { ipHash, page, userAgent };
}

/** True when this IP address has already sent RATE_LIMIT enquiries in the current window. */
export async function isRateLimited(ipHash: string) {
  const n = await db.enquiries.countDocuments({
    createdAt: { $gt: new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000) },
    "details.source.ipHash": ipHash,
  });
  return n >= RATE_LIMIT;
}
