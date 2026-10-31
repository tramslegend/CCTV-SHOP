// Customer and shop emails for orders and accounts. Server-only. Every user-supplied value is escaped.
import type { OrderItemRow, OrderRow } from "@/db/schema";
import { emailLayout, escapeHtml, notifyAddress, sendEmail, type EmailResult } from "@/lib/email";
import { getCheckoutSettings } from "@/lib/checkout/server";
import { optionNamed } from "@/lib/checkout/settings";
import { formatGBP } from "@/lib/cctvmaster/money";
import { addressLines, formatDate, type StoredAddress } from "./format";
import { discountLabel, incVat, orderFigures } from "./pricing";
import { getStoreDetails, siteUrl, type StoreDetails } from "./settings";
import { DELIVERY_METHOD, trackingUrl } from "./status";
import { orderToken } from "./token";

type Order = OrderRow;
type Item = OrderItemRow;

const e = escapeHtml;
const brand = "#047857";

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${e(href)}" style="display:inline-block;background:${brand};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px">${e(label)}</a></p>`;

const muted = (html: string) => `<p style="color:#71717a;font-size:13px;margin:16px 0 0">${html}</p>`;

/** Link that opens the receipt without signing in (signed with the server secret). */
export const receiptUrl = (order: Pick<Order, "number">) =>
  `${siteUrl()}/checkout/success?order=${encodeURIComponent(order.number)}&token=${orderToken(order.number)}`;

function itemsTable(order: Order, items: Item[]) {
  const rate = order.vatRate ?? 0.2;
  const f = orderFigures(order, items);
  const rows = items
    .map((i) => {
      const unit = incVat(i.unitPrice, rate);
      return `<tr>
<td style="padding:8px 0;border-bottom:1px solid #f4f4f5">${e(i.name)}${i.sku ? `<br><span style="color:#71717a;font-size:12px">SKU ${e(i.sku)}</span>` : ""}</td>
<td style="padding:8px;border-bottom:1px solid #f4f4f5;text-align:center;white-space:nowrap">${i.qty} × ${formatGBP(unit)}</td>
<td style="padding:8px 0;border-bottom:1px solid #f4f4f5;text-align:right;white-space:nowrap">${formatGBP(unit * i.qty)}</td>
</tr>`;
    })
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td colspan="2" style="padding:4px 0;${bold ? "font-weight:bold" : "color:#52525b"}">${label}</td><td style="padding:4px 0;text-align:right;${bold ? "font-weight:bold" : ""}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0">
<tr><th align="left" style="padding-bottom:6px;border-bottom:1px solid #e4e4e7">Item</th><th style="padding-bottom:6px;border-bottom:1px solid #e4e4e7">Qty</th><th align="right" style="padding-bottom:6px;border-bottom:1px solid #e4e4e7">Price</th></tr>
${rows}
${line(`Items (inc. VAT)`, formatGBP(f.itemsIncVat))}
${line("Delivery (inc. VAT)", f.deliveryIncVat > 0 ? formatGBP(f.deliveryIncVat) : "Free")}
${f.discount > 0 ? line(e(discountLabel(f.discountCode)), `−${formatGBP(f.discount)}`) : ""}
${line(`Total`, formatGBP(f.total), true)}
${line(`Includes VAT at ${f.vatPercent}%`, formatGBP(f.vat))}
</table>`;
}

const addressBlock = (title: string, a: StoredAddress | null | undefined) =>
  `<p style="margin:0 0 4px;font-weight:bold">${e(title)}</p><p style="margin:0 0 16px;color:#3f3f46">${addressLines(a).map(e).join("<br>")}</p>`;

const textItems = (order: Order, items: Item[]) => {
  const rate = order.vatRate ?? 0.2;
  const f = orderFigures(order, items);
  return [
    ...items.map((i) => `- ${i.name} — ${i.qty} × ${formatGBP(incVat(i.unitPrice, rate))}`),
    "",
    `Delivery: ${f.deliveryIncVat > 0 ? formatGBP(f.deliveryIncVat) : "Free"}`,
    ...(f.discount > 0 ? [`${discountLabel(f.discountCode)}: −${formatGBP(f.discount)}`] : []),
    `Total: ${formatGBP(f.total)} (includes VAT ${formatGBP(f.vat)})`,
  ].join("\n");
};

const footer = (store: StoreDetails) =>
  muted(
    [
      e(store.name),
      store.address && e(store.address),
      store.phone && e(store.phone),
      store.email && `<a href="mailto:${e(store.email)}" style="color:${brand}">${e(store.email)}</a>`,
    ]
      .filter(Boolean)
      .join(" · "),
  );

/** Customer receipt, sent once payment is confirmed (and on "resend confirmation"). */
export async function sendOrderConfirmation(order: Order, items: Item[]): Promise<EmailResult> {
  const [store, checkout] = await Promise.all([getStoreDetails(), getCheckoutSettings()]);
  const ship = order.shippingAddress as StoredAddress;
  const first = (ship.name ?? "").split(/\s+/)[0] || "there";
  const billing = order.billingAddress as StoredAddress | null;
  const collect = optionNamed(checkout.delivery, order.deliveryMethod)?.kind === "collect";
  const note = checkout.messages.emailNote;
  const body = `
<h1 style="font-size:22px;margin:0 0 8px">Thanks for your order, ${e(first)}</h1>
<p style="margin:0 0 4px">Order <strong>${e(order.number)}</strong> · placed ${e(formatDate(order.createdAt, true))}</p>
<p style="margin:0">We’ve received your payment and are getting it ready. ${collect ? "We’ll email you as soon as it’s ready to collect." : "We’ll email the tracking number once it’s on its way."}</p>
${itemsTable(order, items)}
${addressBlock(collect ? "Your address" : "Delivering to", ship)}
${billing ? addressBlock("Billing address", billing) : ""}
<p style="margin:0 0 4px;font-weight:bold">${collect ? "Collection" : "Delivery"}</p><p style="margin:0 0 16px;color:#3f3f46">${e(order.deliveryMethod ?? DELIVERY_METHOD)}${collect && store.address ? `<br>Collect from: ${e(store.address)}` : ""}</p>
${note ? `<p style="margin:0 0 16px;white-space:pre-line">${e(note)}</p>` : ""}
${button(receiptUrl(order), "View your order")}
${footer(store)}`;
  return sendEmail({
    to: order.email,
    subject: `Order ${order.number} confirmed`,
    html: emailLayout({ title: `Order ${order.number} confirmed`, preheader: `We've got your order ${order.number}.`, body }),
    text: `Thanks for your order ${order.number}.\n\n${textItems(order, items)}\n\n${collect ? `Collect from:\n${store.address}` : `Delivering to:\n${addressLines(ship).join("\n")}`}${note ? `\n\n${note}` : ""}\n\nView your order: ${receiptUrl(order)}`,
    replyTo: store.email || undefined,
  });
}

/** New paid order alert for the shop (Settings → Notifications, else SHOP_NOTIFY_EMAIL). */
export async function sendShopOrderAlert(order: Order, items: Item[]): Promise<EmailResult | null> {
  const to = await notifyAddress("orders");
  if (!to) return null;
  const ship = order.shippingAddress as StoredAddress;
  const adminUrl = `${siteUrl()}/admin/orders/${order.id}`;
  const body = `
<h1 style="font-size:20px;margin:0 0 8px">New order ${e(order.number)} — ${formatGBP(order.total)}</h1>
<p style="margin:0">${e(ship.name ?? "")} · <a href="mailto:${e(order.email)}">${e(order.email)}</a>${order.phone ? ` · ${e(order.phone)}` : ""}</p>
${itemsTable(order, items)}
${addressBlock("Ship to", ship)}
${order.customerNote ? `<p style="margin:0 0 4px;font-weight:bold">Customer note</p><p style="margin:0 0 16px">${e(order.customerNote)}</p>` : ""}
${button(adminUrl, "Open in admin")}`;
  return sendEmail({
    to,
    subject: `New order ${order.number} (${formatGBP(order.total)})`,
    html: emailLayout({ title: `New order ${order.number}`, body }),
    text: `New order ${order.number} from ${ship.name ?? ""} <${order.email}>\n\n${textItems(order, items)}\n\nShip to:\n${addressLines(ship).join("\n")}\n\n${adminUrl}`,
    replyTo: order.email,
  });
}

export async function sendDispatchEmail(order: Order, items: Item[]): Promise<EmailResult> {
  const store = await getStoreDetails();
  const ship = order.shippingAddress as StoredAddress;
  const url = trackingUrl(order.carrier, order.trackingNumber);
  const first = (ship.name ?? "").split(/\s+/)[0] || "there";
  const body = `
<h1 style="font-size:22px;margin:0 0 8px">Your order is on its way</h1>
<p style="margin:0 0 12px">Hi ${e(first)}, order <strong>${e(order.number)}</strong> has left us${order.carrier ? ` with <strong>${e(order.carrier)}</strong>` : ""}.</p>
${order.trackingNumber ? `<p style="margin:0">Tracking number: <strong style="font-family:monospace">${e(order.trackingNumber)}</strong></p>` : ""}
${url ? button(url, "Track your parcel") : ""}
${itemsTable(order, items)}
${addressBlock("Delivering to", ship)}
${muted(`<a href="${e(receiptUrl(order))}" style="color:${brand}">View your order</a>`)}
${footer(store)}`;
  return sendEmail({
    to: order.email,
    subject: `Order ${order.number} has been dispatched`,
    html: emailLayout({ title: `Order ${order.number} dispatched`, preheader: "Your parcel is on its way.", body }),
    text: `Order ${order.number} has been dispatched${order.carrier ? ` with ${order.carrier}` : ""}.\n${order.trackingNumber ? `Tracking number: ${order.trackingNumber}\n` : ""}${url ? `Track it: ${url}\n` : ""}\n${textItems(order, items)}`,
    replyTo: store.email || undefined,
  });
}

export async function sendCancelledEmail(order: Order, refunded: number): Promise<EmailResult> {
  const store = await getStoreDetails();
  const body = `
<h1 style="font-size:22px;margin:0 0 8px">Order ${e(order.number)} has been cancelled</h1>
<p style="margin:0 0 12px">${refunded > 0 ? `We’ve refunded <strong>${formatGBP(refunded)}</strong> to your original payment method. Refunds usually show within 5–10 working days.` : "No payment was taken for this order."}</p>
<p style="margin:0">If you didn’t expect this, reply to this email${store.phone ? ` or call us on ${e(store.phone)}` : ""}.</p>
${footer(store)}`;
  return sendEmail({
    to: order.email,
    subject: `Order ${order.number} cancelled`,
    html: emailLayout({ title: `Order ${order.number} cancelled`, body }),
    text: `Order ${order.number} has been cancelled.${refunded > 0 ? ` We've refunded ${formatGBP(refunded)} to your original payment method.` : ""}`,
    replyTo: store.email || undefined,
  });
}

export async function sendRefundEmail(order: Order, amount: number): Promise<EmailResult> {
  const store = await getStoreDetails();
  const full = order.refundedAmount >= order.total;
  const body = `
<h1 style="font-size:22px;margin:0 0 8px">Refund on order ${e(order.number)}</h1>
<p style="margin:0 0 12px">We’ve refunded <strong>${formatGBP(amount)}</strong>${full ? " (the full order)" : ""} to your original payment method. It usually shows within 5–10 working days.</p>
${muted(`<a href="${e(receiptUrl(order))}" style="color:${brand}">View your order</a>`)}
${footer(store)}`;
  return sendEmail({
    to: order.email,
    subject: `Refund of ${formatGBP(amount)} on order ${order.number}`,
    html: emailLayout({ title: `Refund on order ${order.number}`, body }),
    text: `We've refunded ${formatGBP(amount)} on order ${order.number} to your original payment method.`,
    replyTo: store.email || undefined,
  });
}

// ---------- account emails (Better Auth) ----------

export async function sendPasswordResetEmail(user: { name: string; email: string }, url: string): Promise<EmailResult> {
  const store = await getStoreDetails();
  const first = user.name.split(/\s+/)[0] || "there";
  const body = `
<h1 style="font-size:22px;margin:0 0 8px">Reset your password</h1>
<p style="margin:0">Hi ${e(first)}, we got a request to reset the password for your ${e(store.name)} account. The link works for one hour.</p>
${button(url, "Choose a new password")}
${muted("If you didn’t ask for this, you can ignore this email: your password won’t change.")}
${footer(store)}`;
  return sendEmail({
    to: user.email,
    subject: "Reset your password",
    html: emailLayout({ title: "Reset your password", body }),
    text: `Reset your ${store.name} password (link valid for one hour): ${url}\n\nIf you didn't ask for this, ignore this email.`,
  });
}

export async function sendVerifyEmail(user: { name: string; email: string }, url: string): Promise<EmailResult> {
  const store = await getStoreDetails();
  const first = user.name.split(/\s+/)[0] || "there";
  const body = `
<h1 style="font-size:22px;margin:0 0 8px">Confirm your email</h1>
<p style="margin:0">Hi ${e(first)}, please confirm this is your email address. Once it’s confirmed, any orders you placed with it before you had an account appear in your account too.</p>
${button(url, "Confirm my email")}
${muted("The link works for 24 hours. If you didn’t create an account, you can ignore this email.")}
${footer(store)}`;
  return sendEmail({
    to: user.email,
    subject: `Confirm your email for ${store.name}`,
    html: emailLayout({ title: "Confirm your email", body }),
    text: `Confirm your email address for ${store.name}: ${url}`,
  });
}
