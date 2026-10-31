// Emails sent for enquiries: the shop notification, the customer acknowledgement and replies from the inbox.
// Server-only. Every piece of customer text goes through escapeHtml().
import { emailLayout, escapeHtml, notifyAddress, sendEmail, type EmailResult } from "@/lib/email";
import { telHref } from "@/lib/settings/format";
import { DEFAULT_STORE_NAME } from "@/lib/settings/schema";
import { getSettingFromDb } from "@/lib/settings/server";
import type { EnquiryType } from "./types";

export interface EnquiryEmailData {
  id: number;
  type: EnquiryType;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  subject: string;
  message?: string | null;
  /** Extra labelled lines shown in the emails (product, quantity, trade details…). */
  facts: { label: string; value: string }[];
}

export const siteUrl = () => (process.env.SITE_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");

/** The shop's name, phone and email from Settings (neutral defaults if they can't be read). */
async function shopDetails() {
  try {
    const store = await getSettingFromDb("store");
    return { name: store.name, phone: store.phone, email: store.email };
  } catch {
    return { name: DEFAULT_STORE_NAME, phone: "", email: "" };
  }
}

export async function storeName() {
  return (await shopDetails()).name;
}

/**
 * Inbox that receives new-message notifications and customers' replies: Settings → Notifications, else
 * SHOP_NOTIFY_EMAIL, else the shop's public email. Undefined when none is set.
 */
export async function shopInbox(): Promise<string | undefined> {
  return (await notifyAddress("messages")) ?? ((await shopDetails()).email || undefined);
}

const p = (html: string) => `<p style="margin:0 0 14px">${html}</p>`;
const multiline = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br>");

function factsTable(rows: { label: string; value: string }[]) {
  if (!rows.length) return "";
  const cells = rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#71717a;vertical-align:top;white-space:nowrap">${escapeHtml(r.label)}</td>` +
        `<td style="padding:6px 0;vertical-align:top">${multiline(r.value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 18px;font-size:14px">${cells}</table>`;
}

const quote = (value: string) =>
  `<div style="margin:0 0 18px;padding:12px 16px;border-left:3px solid #047857;background:#f4f4f5;font-size:14px">${multiline(value)}</div>`;

const factsText = (rows: { label: string; value: string }[]) => rows.map((r) => `${r.label}: ${r.value}`).join("\n");

function contactRows(e: EnquiryEmailData) {
  return [
    { label: "Name", value: e.name },
    ...(e.company ? [{ label: "Company", value: e.company }] : []),
    { label: "Email", value: e.email },
    ...(e.phone ? [{ label: "Phone", value: e.phone }] : []),
    ...e.facts,
  ];
}

/** Tells the shop about a new enquiry. Reply-to is the customer, so answering the email reaches them. */
export async function sendShopNotification(e: EnquiryEmailData): Promise<EmailResult> {
  const [shop, inbox] = await Promise.all([storeName(), shopInbox()]);
  if (!inbox) return { ok: false, error: "No address for new-message emails (set one in Settings → Notifications)." };
  const adminUrl = `${siteUrl()}/admin/messages/${e.id}`;
  const rows = contactRows(e);
  // Quote, trade and parts subjects already say what they are ("Parts enquiry: 2 × …"): "New parts enquiry: 2 × …".
  const title = e.type === "contact" ? `New message: ${e.subject}` : `New ${e.subject.charAt(0).toLowerCase()}${e.subject.slice(1)}`;
  const body = [
    `<h1 style="margin:0 0 6px;font-size:20px">${escapeHtml(title)}</h1>`,
    p(`<span style="color:#71717a">From ${escapeHtml(e.name)} via the ${escapeHtml(shop)} website. Reply to this email to answer them directly.</span>`),
    factsTable(rows),
    e.message ? quote(e.message) : "",
    p(
      `<a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:bold">Open in Messages</a>`,
    ),
  ].join("");
  return sendEmail({
    to: inbox,
    subject: title,
    replyTo: e.email,
    html: emailLayout({ title, preheader: `${e.name}: ${(e.message ?? e.subject).slice(0, 90)}`, body }),
    text: `${title}\n\n${factsText(rows)}${e.message ? `\n\n${e.message}` : ""}\n\nOpen in Messages: ${adminUrl}`,
  });
}

const NEXT_STEP: Record<EnquiryType, string> = {
  contact: "Someone from our team will reply as soon as they can — usually within an hour on weekdays.",
  quote: "We'll check price and availability and come back to you with a quote — usually within an hour on weekdays.",
  trade: "A real person reads every application and replies within one working day.",
  parts: "Our sales team will come back to you with a price and a delivery date.",
};

/** Short "we've got it" email to the customer, with a copy of what they sent. */
export async function sendCustomerAcknowledgement(e: EnquiryEmailData) {
  const [{ name: shop, phone }, inbox] = await Promise.all([shopDetails(), shopInbox()]);
  const phoneHref = telHref(phone);
  const first = e.name.trim().split(/\s+/)[0] || e.name;
  const subject = e.type === "trade" ? `We've received your trade account application` : `We've received your message`;
  const rows = [{ label: "Subject", value: e.subject }, ...e.facts];
  const body = [
    `<h1 style="margin:0 0 14px;font-size:20px">Thanks, ${escapeHtml(first)}</h1>`,
    p(`We've received your ${e.type === "trade" ? "application" : "message"}. ${escapeHtml(NEXT_STEP[e.type])}`),
    p(
      (phoneHref
        ? `If it's urgent, call us on <a href="${escapeHtml(phoneHref)}" style="color:#047857;font-weight:bold">${escapeHtml(phone)}</a>. `
        : "") + `You can also reply to this email.`,
    ),
    `<p style="margin:18px 0 8px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:.08em">What you sent</p>`,
    factsTable(rows),
    e.message ? quote(e.message) : "",
    p(`<span style="color:#71717a">— The ${escapeHtml(shop)} team</span>`),
  ].join("");
  return sendEmail({
    to: e.email,
    subject: `${subject} — ${shop}`,
    replyTo: inbox,
    html: emailLayout({ title: subject, preheader: NEXT_STEP[e.type], body }),
    text: `Thanks, ${first}\n\nWe've received your ${e.type === "trade" ? "application" : "message"}. ${NEXT_STEP[e.type]}\n${phone ? `If it's urgent, call us on ${phone}. ` : ""}You can also reply to this email.\n\nWhat you sent\n${factsText(rows)}${e.message ? `\n\n${e.message}` : ""}\n\n— The ${shop} team`,
  });
}

/** Reply written in the admin inbox. Replies to it reach the shop inbox. */
export async function sendEnquiryReply({
  to,
  name,
  subject,
  text,
  original,
  sender,
}: {
  to: string;
  name: string;
  subject: string;
  text: string;
  original?: string | null;
  sender: string;
}) {
  const [{ name: shop, phone }, inbox] = await Promise.all([shopDetails(), shopInbox()]);
  const signature = [shop, phone].filter(Boolean).join(" · ");
  const first = name.trim().split(/\s+/)[0] || name;
  const body = [
    p(`Hi ${escapeHtml(first)},`),
    `<div style="margin:0 0 18px">${multiline(text)}</div>`,
    p(`${escapeHtml(sender)}<br><span style="color:#71717a">${escapeHtml(signature)}</span>`),
    original
      ? `<p style="margin:24px 0 8px;font-size:13px;color:#71717a">Your message:</p>${quote(original)}`
      : "",
  ].join("");
  return sendEmail({
    to,
    subject,
    replyTo: inbox,
    html: emailLayout({ title: subject, preheader: text.slice(0, 90), body }),
    text: `Hi ${first},\n\n${text}\n\n${sender}\n${signature}${original ? `\n\n> ${original.replace(/\n/g, "\n> ")}` : ""}`,
  });
}
