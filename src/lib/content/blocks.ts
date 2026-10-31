// Content blocks of the editable information pages (stored in pages.blocks), the shop-detail placeholders that can be
// written into any text, and lenient parsing of stored blocks. Client-safe: used by the storefront, the page editor and
// its preview.
import { z } from "zod";
import { addressLine, deliveryFacts, internationalPhone, mapHref, vatPercent } from "@/lib/settings/format";
import type { ShopSettings } from "@/lib/settings/schema";

export const BLOCK_TYPES = ["heading", "text", "faq", "callout", "image", "facts"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const CALLOUT_TONES = ["note", "important", "success"] as const;
export type CalloutTone = (typeof CALLOUT_TONES)[number];

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

export interface FactItem {
  id: string;
  label: string;
  value: string;
  note: string;
}

export type PageBlock =
  | { id: string; type: "heading"; text: string; level: 2 | 3 }
  | { id: string; type: "text"; markdown: string }
  | { id: string; type: "faq"; items: FaqItem[] }
  | { id: string; type: "callout"; tone: CalloutTone; title: string; body: string; linkLabel: string; linkHref: string }
  | { id: string; type: "image"; url: string; alt: string; caption: string }
  | { id: string; type: "facts"; items: FactItem[] };

export type BlockOf<T extends BlockType> = Extract<PageBlock, { type: T }>;

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Heading",
  text: "Text",
  faq: "Questions & answers",
  callout: "Notice",
  image: "Image",
  facts: "Key facts",
};

export const BLOCK_HINTS: Record<BlockType, string> = {
  heading: "A section title. Main headings appear in bold; sub-headings are smaller.",
  text: "Paragraphs and lists, written in markdown.",
  faq: "Question and answer pairs.",
  callout: "A highlighted box with an optional button.",
  image: "A picture from the media library, with alt text and an optional caption.",
  facts: "Short figures in boxes, e.g. “Free delivery · £100 or more”.",
};

export const TONE_LABELS: Record<CalloutTone, string> = { note: "Neutral", important: "Important (amber)", success: "Positive (green)" };

let seq = 0;
/** Client/storage id for a new block or list item. */
export const newId = (prefix = "b") => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function newBlock(type: BlockType): PageBlock {
  const id = newId();
  switch (type) {
    case "heading":
      return { id, type, text: "", level: 2 };
    case "text":
      return { id, type, markdown: "" };
    case "faq":
      return { id, type, items: [{ id: newId("q"), q: "", a: "" }] };
    case "callout":
      return { id, type, tone: "note", title: "", body: "", linkLabel: "", linkHref: "" };
    case "image":
      return { id, type, url: "", alt: "", caption: "" };
    case "facts":
      return { id, type, items: [{ id: newId("f"), label: "", value: "", note: "" }] };
  }
}

// ---------- lenient parsing of stored blocks ----------

const str = (max: number) => z.string().max(max).catch("");
const storedId = z.string().min(1).max(64).catch(() => newId());

const storedBlock = z.discriminatedUnion("type", [
  z.object({ id: storedId, type: z.literal("heading"), text: str(300), level: z.union([z.literal(2), z.literal(3)]).catch(2) }),
  z.object({ id: storedId, type: z.literal("text"), markdown: str(20_000) }),
  z.object({
    id: storedId,
    type: z.literal("faq"),
    items: z.array(z.object({ id: storedId, q: str(500), a: str(4000) })).catch([]),
  }),
  z.object({
    id: storedId,
    type: z.literal("callout"),
    tone: z.enum(CALLOUT_TONES).catch("note"),
    title: str(200),
    body: str(4000),
    linkLabel: str(80),
    linkHref: str(500),
  }),
  z.object({ id: storedId, type: z.literal("image"), url: str(2000), alt: str(300), caption: str(500) }),
  z.object({
    id: storedId,
    type: z.literal("facts"),
    items: z.array(z.object({ id: storedId, label: str(120), value: str(120), note: str(300) })).catch([]),
  }),
]);

/** Stored blocks as typed blocks; anything unreadable is dropped rather than breaking the page. */
export function parseBlocks(value: unknown): PageBlock[] {
  if (!Array.isArray(value)) return [];
  const out: PageBlock[] = [];
  for (const raw of value) {
    const parsed = storedBlock.safeParse(raw);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

// ---------- shop-detail placeholders ----------

/** Placeholders that can be typed into page text and are replaced with the current value from Settings. */
export const TOKEN_DEFS = [
  { key: "store.name", label: "Shop name" },
  { key: "store.legalName", label: "Registered company name" },
  { key: "store.phone", label: "Phone" },
  { key: "store.phoneIntl", label: "Phone (international)" },
  { key: "store.email", label: "Email" },
  { key: "store.address", label: "Address (one line)" },
  { key: "store.city", label: "Town / city" },
  { key: "store.mapUrl", label: "Map link" },
  { key: "store.companyNumber", label: "Company number" },
  { key: "store.registeredOffice", label: "Registered office" },
  { key: "delivery.fee", label: "Delivery charge" },
  { key: "delivery.freeFrom", label: "Free delivery from" },
  { key: "delivery.freeFromShort", label: "Free delivery from (short)" },
  { key: "delivery.cutoff", label: "Same-day cut-off" },
  { key: "delivery.transit", label: "Delivery time" },
  { key: "vat.rate", label: "VAT rate" },
] as const;

export type TokenKey = (typeof TOKEN_DEFS)[number]["key"];
export type TokenValues = Record<TokenKey, string>;

/** Current values of every placeholder. */
export function tokenValues({ store, delivery, tax }: Pick<ShopSettings, "store" | "delivery" | "tax">): TokenValues {
  const d = deliveryFacts(delivery);
  return {
    "store.name": store.name,
    "store.legalName": store.legalName || store.name,
    "store.phone": store.phone,
    "store.phoneIntl": internationalPhone(store.phone),
    "store.email": store.email,
    "store.address": addressLine(store.address),
    "store.city": store.address.city,
    "store.mapUrl": mapHref(store),
    "store.companyNumber": store.companyNumber,
    "store.registeredOffice": store.registeredOffice,
    "delivery.fee": d.fee,
    "delivery.freeFrom": d.freeFrom,
    "delivery.freeFromShort": d.freeFromShort,
    "delivery.cutoff": d.cutoff,
    "delivery.transit": d.transit,
    "vat.rate": `${vatPercent(tax.vatRate)}%`,
  };
}

const TOKEN_RE = /\{\{\s*([a-zA-Z]+\.[a-zA-Z]+)\s*\}\}/g;

/** Replaces {{store.phone}}-style placeholders; unknown placeholders are left as typed. */
export function fillTokens(text: string, values: TokenValues): string {
  if (!text.includes("{{")) return text;
  return text.replace(TOKEN_RE, (match, key: string) => (key in values ? values[key as TokenKey] : match));
}

/** A block with every text field's placeholders replaced. */
export function fillBlock(block: PageBlock, v: TokenValues): PageBlock {
  const f = (t: string) => fillTokens(t, v);
  switch (block.type) {
    case "heading":
      return { ...block, text: f(block.text) };
    case "text":
      return { ...block, markdown: f(block.markdown) };
    case "faq":
      return { ...block, items: block.items.map((i) => ({ ...i, q: f(i.q), a: f(i.a) })) };
    case "callout":
      return { ...block, title: f(block.title), body: f(block.body), linkLabel: f(block.linkLabel), linkHref: f(block.linkHref) };
    case "image":
      return { ...block, alt: f(block.alt), caption: f(block.caption) };
    case "facts":
      return { ...block, items: block.items.map((i) => ({ ...i, label: f(i.label), value: f(i.value), note: f(i.note) })) };
  }
}

// ---------- anchors ----------

/** "Who can leave a review?" → "who-can-leave-a-review". */
export function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") || "section"
  );
}

/** Unique anchor ids for a list of heading texts ("faq", "faq-2", …). */
export function uniqueIds(texts: string[]): string[] {
  const seen = new Map<string, number>();
  return texts.map((t) => {
    const base = slugifyHeading(t);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}
