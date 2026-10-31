import { logActivity, requireAdmin } from "@/lib/admin/session";
import { exportAdminOrders, parseOrderFilters } from "@/lib/orders/admin-queries";
import { VAT_RATE } from "@/lib/cctvmaster/money";
import type { StoredAddress } from "@/lib/orders/format";
import { splitVat } from "@/lib/orders/pricing";
import { STATUS_LABEL } from "@/lib/orders/status";

// CSV of every order matching the list's filters (status tab, search, dates).
// Money columns: items ex VAT + delivery ex VAT − discount ex VAT + VAT = total.

const londonDateTime = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});
const stamp = (d: Date | null) => (d ? londonDateTime.format(d).replace(",", "") : "");

/** RFC 4180 quoting, plus a leading apostrophe on values a spreadsheet would run as a formula. */
function cell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  let text = typeof value === "number" ? value.toFixed(2) : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  const { user } = await requireAdmin("orders");
  const filters = parseOrderFilters(Object.fromEntries(new URL(request.url).searchParams));
  const orders = await exportAdminOrders(filters);

  const header = [
    "Order",
    "Placed",
    "Status",
    "Paid",
    "Name",
    "Email",
    "Phone",
    "Company",
    "Address line 1",
    "Address line 2",
    "Town/city",
    "County",
    "Postcode",
    "Items",
    "Units",
    "Items ex VAT",
    "Delivery ex VAT",
    "Discount code",
    "Discount ex VAT",
    "Discount inc VAT",
    "VAT",
    "Total",
    "Refunded",
    "Payment",
    "Payment ref",
    "Carrier",
    "Tracking",
    "Dispatched",
  ];
  const lines = orders.map((o) => {
    const a = o.shippingAddress as StoredAddress;
    return [
      o.number,
      stamp(o.createdAt),
      STATUS_LABEL[o.status],
      stamp(o.paidAt),
      a.name,
      o.email,
      o.phone,
      a.company,
      a.line1,
      a.line2,
      a.city,
      a.county,
      a.postcode,
      o.items.map((i) => `${i.qty}x ${i.sku ?? i.name}`).join("; "),
      String(o.items.reduce((n, i) => n + i.qty, 0)),
      o.subtotal,
      o.deliveryFee,
      o.discountCode,
      o.discount > 0 ? splitVat(o.discount, o.vatRate ?? VAT_RATE).exVat : 0,
      o.discount,
      o.vat,
      o.total,
      o.refundedAmount,
      o.paymentProvider,
      o.paymentRef,
      o.carrier,
      o.trackingNumber,
      stamp(o.dispatchedAt),
    ]
      .map(cell)
      .join(",");
  });
  const csv = `﻿${[header.join(","), ...lines].join("\r\n")}\r\n`;

  await logActivity(user, "order.export", "order", null, { count: orders.length, filters: { ...filters, page: undefined } });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${filters.tab}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
