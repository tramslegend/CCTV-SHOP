// Transactional email. Production: Resend (RESEND_API_KEY, EMAIL_FROM with a verified domain).
// Development (no key): each email is written to .data/outbox/<time>-<slug>.html so it can be opened in a browser.
// Server-only.
import fs from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { getSettingFromDb } from "@/lib/settings/server";

export interface Email {
  to: string | string[];
  subject: string;
  /** Full HTML body. Escape any user-supplied text with escapeHtml(). */
  html: string;
  /** Plain-text alternative. */
  text: string;
  replyTo?: string;
}

export type EmailResult = { ok: true; id: string } | { ok: false; error: string };

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Server-wide fallback for shop notifications (SHOP_NOTIFY_EMAIL). Prefer notifyAddress(), which honours Settings. */
export const shopNotifyAddress = () => process.env.SHOP_NOTIFY_EMAIL || undefined;

/**
 * Where a shop notification goes: the address set in Settings → Notifications ("orders" for new paid orders,
 * "messages" for new enquiries), otherwise SHOP_NOTIFY_EMAIL. Undefined when neither is set.
 */
export async function notifyAddress(kind: "orders" | "messages"): Promise<string | undefined> {
  try {
    const n = await getSettingFromDb("notifications");
    const configured = kind === "orders" ? n.ordersEmail : n.messagesEmail;
    if (configured) return configured;
  } catch (err) {
    console.error("[email] couldn't read notification settings", err);
  }
  return shopNotifyAddress();
}

/** Sends an email. Never throws: failures are returned so the caller's main action (order, message) still succeeds. */
export async function sendEmail(email: Email): Promise<EmailResult> {
  const from = process.env.EMAIL_FROM || "Shop <no-reply@localhost>";
  try {
    if (resend) {
      const { data, error } = await resend.emails.send({ from, ...email });
      if (error || !data) return { ok: false, error: error?.message ?? "Unknown email error" };
      return { ok: true, id: data.id };
    }
    const dir = path.join(process.cwd(), ".data", "outbox");
    await fs.mkdir(dir, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${email.subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}.html`;
    const header = `<!-- from: ${from} | to: ${[email.to].flat().join(", ")} | reply-to: ${email.replyTo ?? ""} | subject: ${email.subject} -->\n`;
    await fs.writeFile(path.join(dir, name), header + email.html);
    return { ok: true, id: `outbox/${name}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Minimal, email-client-safe layout shared by every message. */
export function emailLayout({ title, preheader, body }: { title: string; preheader?: string; body: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;padding:32px">
<tr><td style="font-size:15px;line-height:1.6">${body}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
