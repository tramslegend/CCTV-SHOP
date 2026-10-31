// Printable packing slip and VAT invoice (standalone HTML pages for the back office). Server-only.
import { escapeHtml as e } from "@/lib/email";
import { formatGBP } from "@/lib/cctvmaster/money";
import { addressLines, type StoredAddress } from "./format";
import { discountLabel, incVat, orderFigures, round2 } from "./pricing";
import type { OrderItemRow, OrderRow } from "./service";
import type { StoreDetails } from "./settings";

const ukDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${e(title)}</title>
<style>
  *{box-sizing:border-box} body{margin:0;background:#f4f4f5;font:14px/1.5 Arial,Helvetica,sans-serif;color:#18181b}
  .sheet{max-width:800px;margin:24px auto;background:#fff;padding:40px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  h1{font-size:24px;margin:0 0 4px} h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#71717a;margin:0 0 6px}
  .row{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap} .muted{color:#71717a} .mono{font-family:ui-monospace,Menlo,monospace}
  table{width:100%;border-collapse:collapse;margin-top:24px} th{text-align:left;font-size:12px;color:#71717a;border-bottom:2px solid #18181b;padding:6px 8px}
  td{border-bottom:1px solid #e4e4e7;padding:8px;vertical-align:top} .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .totals{margin-left:auto;margin-top:16px;width:320px} .totals td{border:0;padding:3px 8px} .totals tr.grand td{border-top:2px solid #18181b;font-weight:bold;font-size:16px}
  .box{border:1px solid #e4e4e7;border-radius:6px;padding:12px 14px;min-width:220px;flex:1}
  .check{width:22px;height:22px;border:1.5px solid #18181b;border-radius:3px;display:inline-block}
  .toolbar{max-width:800px;margin:16px auto 0;display:flex;gap:8px;justify-content:flex-end}
  .toolbar button{font:inherit;padding:8px 14px;border-radius:6px;border:1px solid #d4d4d8;background:#fff;cursor:pointer}
  .toolbar button.primary{background:#18181b;color:#fff;border-color:#18181b}
  @media print{body{background:#fff}.sheet{box-shadow:none;margin:0;max-width:none;padding:0}.toolbar{display:none}@page{margin:16mm}}
</style></head>
<body>
<div class="toolbar"><button type="button" onclick="history.length>1?history.back():window.close()">Close</button><button type="button" class="primary" onclick="window.print()">Print</button></div>
<div class="sheet">${body}</div>
</body></html>`;
}

const addressHtml = (a: StoredAddress | null | undefined) => addressLines(a).map(e).join("<br>");

/** "020 … · hello@…" with whichever contact details are set. */
const contactLine = (store: StoreDetails) => [store.phone, store.email].filter(Boolean).map(e).join(" · ");

const storeHeader = (store: StoreDetails) => `<div>
  <p style="font-size:18px;font-weight:bold;margin:0">${e(store.name)}</p>
  <p class="muted" style="margin:2px 0 0">${[store.address && e(store.address), contactLine(store)].filter(Boolean).join("<br>")}</p>
</div>`;

export function packingSlipHtml(order: OrderRow, items: OrderItemRow[], store: StoreDetails) {
  const ship = order.shippingAddress as StoredAddress;
  const units = items.reduce((n, i) => n + i.qty, 0);
  const body = `
<div class="row">
  ${storeHeader(store)}
  <div style="text-align:right"><h1>Packing slip</h1><p class="mono" style="margin:0;font-size:16px">${e(order.number)}</p>
  <p class="muted" style="margin:2px 0 0">Ordered ${e(ukDate.format(order.createdAt))}</p></div>
</div>
<div class="row" style="margin-top:28px">
  <div class="box"><h2>Deliver to</h2>${addressHtml(ship)}${order.phone ? `<br>${e(order.phone)}` : ""}</div>
  <div class="box"><h2>Delivery</h2>${e(order.deliveryMethod ?? "")}${order.carrier ? `<br>${e(order.carrier)}` : ""}${order.trackingNumber ? `<br><span class="mono">${e(order.trackingNumber)}</span>` : ""}</div>
</div>
<table>
  <thead><tr><th style="width:40px">Packed</th><th>Item</th><th>SKU</th><th class="num">Qty</th></tr></thead>
  <tbody>${items
    .map((i) => `<tr><td><span class="check"></span></td><td>${e(i.name)}</td><td class="mono">${e(i.sku ?? "")}</td><td class="num" style="font-size:16px;font-weight:bold">${i.qty}</td></tr>`)
    .join("")}</tbody>
</table>
<p style="margin-top:16px;text-align:right"><strong>${units}</strong> ${units === 1 ? "item" : "items"} in total</p>
${order.customerNote ? `<div class="box" style="margin-top:16px"><h2>Customer note</h2>${e(order.customerNote)}</div>` : ""}
<p class="muted" style="margin-top:32px;font-size:12px">Thank you for your order.${contactLine(store) ? ` Questions or returns: ${contactLine(store)}` : ""}</p>`;
  return page(`Packing slip ${order.number}`, body);
}

export function invoiceHtml(order: OrderRow, items: OrderItemRow[], store: StoreDetails) {
  const f = orderFigures(order, items);
  const rate = f.vatRate;
  const ship = order.shippingAddress as StoredAddress;
  const billing = (order.billingAddress as StoredAddress | null) ?? ship;
  const issued = order.paidAt ?? order.createdAt;
  const rows = items.map((i) => {
    const gross = round2(incVat(i.unitPrice, rate) * i.qty);
    const net = round2(i.unitPrice * i.qty);
    return `<tr><td>${e(i.name)}<br><span class="muted mono" style="font-size:12px">${e(i.sku ?? "")}</span></td><td class="num">${i.qty}</td>
<td class="num">${formatGBP(i.unitPrice)}</td><td class="num">${f.vatPercent}%</td><td class="num">${formatGBP(net)}</td><td class="num">${formatGBP(round2(gross - net))}</td><td class="num">${formatGBP(gross)}</td></tr>`;
  });
  if (f.deliveryIncVat > 0) {
    rows.push(`<tr><td>Delivery: ${e(order.deliveryMethod ?? "")}</td><td class="num">1</td><td class="num">${formatGBP(f.deliveryExVat)}</td><td class="num">${f.vatPercent}%</td>
<td class="num">${formatGBP(f.deliveryExVat)}</td><td class="num">${formatGBP(f.deliveryVat)}</td><td class="num">${formatGBP(f.deliveryIncVat)}</td></tr>`);
  }
  // The discount as its own line, net and VAT split at the order's rate, so net + VAT = total exactly.
  if (f.discount > 0) {
    rows.push(`<tr><td>${e(discountLabel(f.discountCode))}</td><td class="num">1</td><td class="num">−${formatGBP(f.discountExVat)}</td><td class="num">${f.vatPercent}%</td>
<td class="num">−${formatGBP(f.discountExVat)}</td><td class="num">−${formatGBP(f.discountVat)}</td><td class="num">−${formatGBP(f.discount)}</td></tr>`);
  }
  const body = `
<div class="row">
  ${storeHeader(store)}
  <div style="text-align:right"><h1>VAT invoice</h1>
  <p style="margin:0">Invoice no. <span class="mono">${e(order.number)}</span></p>
  <p class="muted" style="margin:2px 0 0">Invoice / tax point date: ${e(ukDate.format(issued))}</p>
  ${store.vatNumber ? `<p style="margin:2px 0 0">VAT reg. no. <span class="mono">${e(store.vatNumber)}</span></p>` : `<p style="margin:2px 0 0;color:#b45309">VAT number not set (add it in Settings)</p>`}
  ${store.companyNumber ? `<p class="muted" style="margin:2px 0 0">Company no. ${e(store.companyNumber)}</p>` : ""}</div>
</div>
<div class="row" style="margin-top:28px">
  <div class="box"><h2>Invoice to</h2>${addressHtml(billing)}<br>${e(order.email)}</div>
  <div class="box"><h2>Delivered to</h2>${addressHtml(ship)}</div>
</div>
<table>
  <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit (ex VAT)</th><th class="num">VAT rate</th><th class="num">Net</th><th class="num">VAT</th><th class="num">Total</th></tr></thead>
  <tbody>${rows.join("")}</tbody>
</table>
<table class="totals">
  <tr><td>Total net</td><td class="num">${formatGBP(f.netTotal)}</td></tr>
  <tr><td>Total VAT at ${f.vatPercent}%</td><td class="num">${formatGBP(f.vat)}</td></tr>
  <tr class="grand"><td>Total</td><td class="num">${formatGBP(f.total)}</td></tr>
  ${order.paidAt ? `<tr><td class="muted">Paid ${e(ukDate.format(order.paidAt))}${order.paymentProvider === "stripe" ? " by card" : ""}</td><td class="num muted">${formatGBP(f.total)}</td></tr>` : ""}
  ${order.refundedAmount > 0 ? `<tr><td style="color:#6d28d9">Refunded</td><td class="num" style="color:#6d28d9">−${formatGBP(order.refundedAmount)}</td></tr>` : ""}
</table>
<p class="muted" style="margin-top:32px;font-size:12px">${[store.legalName, store.address].filter(Boolean).map(e).join(" · ")}. All amounts in GBP.</p>`;
  return page(`VAT invoice ${order.number}`, body);
}
