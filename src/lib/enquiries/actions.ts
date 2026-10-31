"use server";

// Server actions behind the storefront enquiry forms (contact / quote, trade application, parts enquiry).
// Each one: spam checks → zod validation → rate limit → save to `enquiries` → email the shop and the customer.
import { after } from "next/server";
import { CONTACT_SUBJECTS } from "@/components/sites/cctvmaster/content/store-facts";
import { CI, db, insert } from "@/db";
import type { EnquiryRow } from "@/db/schema";
import { getSettingFromDb } from "@/lib/settings/server";
import { type EnquiryEmailData, sendCustomerAcknowledgement, sendShopNotification, siteUrl } from "./emails";
import { HONEYPOT_FIELD } from "./rules";
import { checkFormToken, isRateLimited, issueFormToken, RATE_WINDOW_MINUTES, requestSource } from "./spam";
import type { EnquiryResult, EnquirySource } from "./types";
import { contactSchema, fieldErrors, partsSchema, tradeSchema, type ContactPayload, type PartsPayload, type TradePayload } from "./validation";

/** Anti-spam fields every form sends along with its values. */
export interface SpamFields {
  token: string;
  [HONEYPOT_FIELD]: string;
}

const CHECK_FIELDS = "Please check the highlighted fields.";
/** The shop's phone and email from Settings, for "call us on …" in error messages (empty when unavailable). */
async function shopContact(): Promise<{ phone: string; email: string }> {
  try {
    const store = await getSettingFromDb("store");
    return { phone: store.phone, email: store.email };
  } catch {
    return { phone: "", email: "" };
  }
}

const reachUs = ({ phone, email }: { phone: string; email: string }) =>
  [phone && `call us on ${phone}`, email && `email ${email}`].filter(Boolean).join(" or ");

const saveFailed = async () => {
  const ways = reachUs(await shopContact());
  return `Sorry — we couldn't send that just now. Please try again in a minute${ways ? `, or ${ways}` : ""}.`;
};

const blockedMessage = async () => {
  const ways = reachUs(await shopContact());
  return `Sorry — we couldn't send that.${ways ? ` Please ${ways}.` : ""}`;
};

/** Signed "form started" token. Forms fetch one when they appear; submissions need it to be at least 2s old. */
export async function getEnquiryToken(): Promise<string> {
  return issueFormToken();
}

type Screen = { ok: true } | { ok: false; error: string; retry?: "token" };

/** Honeypot and timing checks; run before anything else. */
async function screen(input: Partial<SpamFields> | null | undefined, form: string): Promise<Screen> {
  const trap = input?.[HONEYPOT_FIELD];
  if (typeof trap === "string" && trap.trim()) {
    console.warn(`[enquiries] ${form}: rejected, honeypot filled`);
    return { ok: false, error: await blockedMessage() };
  }
  const check = checkFormToken(input?.token);
  if (check === "too-fast") {
    console.warn(`[enquiries] ${form}: rejected, sent too soon after the form appeared`);
    return { ok: false, error: "That was quicker than we expected. Please wait a couple of seconds and press send again." };
  }
  if (check === "missing" || check === "expired") {
    return { ok: false, error: "This form needed refreshing. Please wait a couple of seconds and press send again.", retry: "token" };
  }
  if (check === "invalid") {
    console.warn(`[enquiries] ${form}: rejected, invalid form token`);
    return { ok: false, error: await blockedMessage(), retry: "token" };
  }
  return { ok: true };
}

const rateLimited = async () => {
  const { phone } = await shopContact();
  return `You've sent several messages in the last few minutes. Please wait ${RATE_WINDOW_MINUTES} minutes and try again${phone ? `, or call us on ${phone}` : ""}.`;
};

/** A new enquiry: type, name and email are required, the rest default (status "new", empty fields null). */
type NewEnquiry = Pick<EnquiryRow, "type" | "name" | "email"> & Partial<Omit<EnquiryRow, "type" | "name" | "email">>;

/** Rate limit, insert and (after the response) the two emails. */
async function save(
  form: string,
  values: Omit<NewEnquiry, "details"> & { details: Record<string, unknown> },
  facts: EnquiryEmailData["facts"],
  source: EnquirySource & { ipHash: string },
): Promise<EnquiryResult> {
  if (await isRateLimited(source.ipHash)) {
    console.warn(`[enquiries] ${form}: rejected, rate limited`);
    return { ok: false, error: await rateLimited() };
  }
  const [row] = await insert("enquiries", { ...values, details: { ...values.details, source } });

  const email: EnquiryEmailData = {
    id: row.id,
    type: values.type,
    name: values.name,
    email: values.email,
    phone: values.phone,
    company: values.company,
    subject: values.subject ?? "Message",
    message: values.message,
    facts,
  };
  after(async () => {
    const [shop, customer] = await Promise.all([sendShopNotification(email), sendCustomerAcknowledgement(email)]);
    if (!shop.ok) console.error(`[enquiries] #${row.id}: shop notification failed: ${shop.error}`);
    if (!customer.ok) console.error(`[enquiries] #${row.id}: customer acknowledgement failed: ${customer.error}`);
  });
  return { ok: true };
}

async function guarded<F extends string>(form: string, run: () => Promise<EnquiryResult<F>>): Promise<EnquiryResult<F>> {
  try {
    return await run();
  } catch (err) {
    console.error(`[enquiries] ${form}: could not save`, err);
    return { ok: false, error: await saveFailed() };
  }
}

export type ContactField = keyof ContactPayload;

/** /contact form. With a product (from /contact?product=<slug>) it is saved as a quote request. */
export async function submitContactEnquiry(input: ContactPayload & SpamFields): Promise<EnquiryResult<ContactField>> {
  const blocked = await screen(input, "contact");
  if (!blocked.ok) return blocked;
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;

  return guarded("contact", async () => {
    const product = d.product
      ? await db.products.findOne({ slug: d.product, status: "active" }, { projection: { slug: 1, name: 1, sku: 1 } })
      : null;
    const topic = CONTACT_SUBJECTS.find((t) => t.value === d.subject)?.label ?? "Message";
    const source = await requestSource();
    const facts = product
      ? [
          { label: "Product", value: `${product.name}${product.sku ? ` (SKU ${product.sku})` : ""}` },
          { label: "Product page", value: `${siteUrl()}/products/${product.slug}` },
        ]
      : [{ label: "Topic", value: topic }];
    return save(
      "contact",
      {
        type: product ? "quote" : "contact",
        name: d.name,
        email: d.email,
        phone: d.phone,
        subject: product ? `Quote request: ${product.name}` : topic,
        message: d.message,
        productSlug: product?.slug ?? null,
        details: { topic: d.subject, ...(product && { productName: product.name, sku: product.sku }) },
      },
      facts,
      source,
    );
  });
}

export type TradeField = keyof TradePayload;

/** /trade account application. */
export async function submitTradeEnquiry(input: TradePayload & SpamFields): Promise<EnquiryResult<TradeField>> {
  const blocked = await screen(input, "trade");
  if (!blocked.ok) return blocked;
  const parsed = tradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;

  return guarded("trade", async () => {
    const source = await requestSource();
    const vat = d.vat.replace(/\s+/g, "").toUpperCase();
    return save(
      "trade",
      {
        type: "trade",
        name: d.name,
        email: d.email,
        phone: d.phone,
        company: d.company,
        subject: `Trade account application: ${d.company}`,
        message: d.notes || null,
        details: {
          businessType: d.type,
          monthlySpend: d.spend || null,
          vatNumber: vat || null,
          businessUse: true,
        },
      },
      [
        { label: "Business type", value: d.type },
        { label: "Monthly spend", value: d.spend || "Prefer not to say" },
        ...(vat ? [{ label: "VAT number", value: vat }] : []),
      ],
      source,
    );
  });
}

export type PartsField = keyof PartsPayload;

/** "Buy this through our sales team" dialog on /parts (back-ordered parts). */
export async function submitPartsEnquiry(input: PartsPayload & SpamFields): Promise<EnquiryResult<PartsField>> {
  const blocked = await screen(input, "parts");
  if (!blocked.ok) return blocked;
  const parsed = partsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;

  return guarded("parts", async () => {
    // The dialog knows the SKU and name; link the enquiry to the catalogue product when it can be found.
    // Exact SKU match (the case-insensitive lookup only lets the query use the SKU index); the one with the same
    // name first.
    const matches = (
      await db.products.find({ sku: d.sku }, { collation: CI, projection: { slug: 1, name: 1, sku: 1 } }).toArray()
    ).filter((p) => p.sku === d.sku);
    const product = matches.find((p) => p.name === d.productName) ?? matches[0];
    const productName = product?.name ?? d.productName;
    const source = await requestSource();
    const message =
      d.message ||
      `Hi, could you sort out ${d.qty} of ${productName} for me? Please let me know the price and how long it'll take.`;
    return save(
      "parts",
      {
        type: "parts",
        name: d.name,
        email: d.email,
        phone: d.phone,
        company: d.company || null,
        subject: `Parts enquiry: ${d.qty} × ${productName}`,
        message,
        productSlug: product?.slug ?? null,
        details: { quantity: d.qty, sku: d.sku, productName },
      },
      [
        { label: "Product", value: productName },
        { label: "SKU", value: d.sku },
        { label: "Quantity", value: String(d.qty) },
      ],
      source,
    );
  });
}
