// Text helpers for owner-written homepage and navigation copy. Client-safe.
//  - Tokens: {shop}, {freeFrom}, {cutoff}, {year} and {place} are replaced with live values from Settings, so the copy
//    stays right when the shop name or delivery prices change.
//  - Highlights: a phrase of a heading shown in another colour.
//  - Inline links: "See our [returns policy](/returns)." in short notes.
import { cutoffLabel, formatMoneyShort } from "@/lib/settings/format";
import type { DeliverySettings, StoreSettings } from "@/lib/settings/schema";

export const TOKENS = ["shop", "freeFrom", "cutoff", "year", "place"] as const;
export type TokenName = (typeof TOKENS)[number];
export type TokenValues = Record<TokenName, string>;

export const TOKEN_HELP: Record<TokenName, string> = {
  shop: "your shop name",
  freeFrom: "the free-delivery threshold, e.g. £100",
  cutoff: "the same-day dispatch cut-off, e.g. 4pm",
  year: "the current year",
  place: "your town, e.g. Leeds, UK",
};

const TOKEN_RE = /\{(shop|freeFrom|cutoff|year|place)\}/g;

const yearFormat = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "Europe/London" });

/** Token values from the shop's Settings. */
export function tokenValues(store: Pick<StoreSettings, "name" | "address">, delivery: DeliverySettings, now = new Date()): TokenValues {
  const alwaysFree = delivery.fee === 0 || delivery.freeFrom === 0;
  return {
    shop: store.name,
    freeFrom: formatMoneyShort(alwaysFree ? 0 : delivery.freeFrom),
    cutoff: cutoffLabel(delivery.cutoff),
    year: yearFormat.format(now),
    place: store.address.city ? `${store.address.city}, UK` : "UK",
  };
}

/** Replaces the known {tokens}; anything else is left as written. */
export const fillTokens = (text: string, values: TokenValues) => text.replace(TOKEN_RE, (_, key: TokenName) => values[key]);

/** Splits `text` around the first occurrence of `highlight`: [before, highlight, after], or null when it isn't there. */
export function splitHighlight(text: string, highlight: string): [string, string, string] | null {
  const h = highlight.trim();
  if (!h) return null;
  const at = text.indexOf(h);
  if (at < 0) return null;
  return [text.slice(0, at), h, text.slice(at + h.length)];
}

export type InlinePart = { kind: "text"; text: string } | { kind: "link"; text: string; href: string };

const LINK_RE = /\[([^\]\n]{1,120})\]\(([^)\s]{1,500})\)/g;

/** "See our [returns policy](/returns)." → text and link parts. */
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ kind: "text", text: text.slice(last, at) });
    parts.push({ kind: "link", text: m[1], href: m[2] });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

/** Links written inline in a note, for validation. */
export const inlineLinks = (text: string) => [...text.matchAll(LINK_RE)].map((m) => ({ label: m[1], href: m[2] }));

/** Short, stable id for a piece of content (used to remember a dismissed announcement). */
export function contentId(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
