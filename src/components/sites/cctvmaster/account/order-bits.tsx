import Link from "next/link";
import { formatGBP } from "@/lib/cctvmaster/money";
import { addressLines } from "@/lib/orders/format";
import { discountLabel } from "@/lib/orders/pricing";
import type { ReceiptOrder } from "@/lib/orders/receipt";
import { CUSTOMER_STATUS_LABEL, STATUS_TONE, type OrderStatus } from "@/lib/orders/status";
import { cn } from "@/lib/utils";
import { ProductThumb } from "./product-thumb";

export { formatDate } from "@/lib/orders/format";

export const orderUnits = (order: Pick<ReceiptOrder, "items">) => order.items.reduce((n, l) => n + l.qty, 0);

export const deliveryAddressLines = (order: Pick<ReceiptOrder, "shipping">) => addressLines(order.shipping);

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.14em] uppercase",
        STATUS_TONE[status],
      )}
    >
      {CUSTOMER_STATUS_LABEL[status]}
    </span>
  );
}

/** Item rows of an order, linking back to each product. */
export function OrderLines({ order }: { order: Pick<ReceiptOrder, "items"> }) {
  return (
    <ul className="divide-y divide-border">
      {order.items.map((line) => (
        <li key={line.id} className="flex items-center gap-4 py-4">
          <ProductThumb
            src={line.image}
            alt={line.name}
            sizes="56px"
            className="h-14 w-14 rounded border border-border bg-white"
          />
          <div className="min-w-0 flex-1">
            {line.slug ? (
              <Link href={`/products/${line.slug}`} className="line-clamp-2 text-sm font-medium text-foreground hover:text-brand-700">
                {line.name}
              </Link>
            ) : (
              <p className="line-clamp-2 text-sm font-medium text-foreground">{line.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {line.sku ? `Model ${line.sku} · ` : ""}Qty {line.qty} × {formatGBP(line.unitIncVat)}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{formatGBP(line.unitIncVat * line.qty)}</p>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ order }: { order: Pick<ReceiptOrder, "figures" | "refunded"> }) {
  const f = order.figures;
  const charged = f.deliveryIncVat > 0;
  const units = `${f.units} ${f.units === 1 ? "item" : "items"}`;
  // With a discount code the figures are shown inc. VAT (the discount is an inc-VAT amount), so the rows add up.
  const rows: { label: string; value: string; tone?: string }[] =
    f.discount > 0
      ? [
          { label: `Items (inc. VAT) · ${units}`, value: formatGBP(f.itemsIncVat) },
          { label: charged ? "Delivery (inc. VAT)" : "Delivery", value: charged ? formatGBP(f.deliveryIncVat) : "Free" },
          { label: discountLabel(f.discountCode), value: `−${formatGBP(f.discount)}`, tone: "text-brand-700" },
        ]
      : [
          { label: `Subtotal (ex VAT) · ${units}`, value: formatGBP(f.itemsExVat) },
          { label: charged ? "Delivery (inc. VAT)" : "Delivery", value: charged ? formatGBP(f.deliveryIncVat) : "Free" },
          { label: charged ? `VAT on items (${f.vatPercent}%)` : `VAT (${f.vatPercent}%)`, value: formatGBP(f.itemsVat) },
        ];
  return (
    <dl className="space-y-2 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className={cn("tabular-nums", r.tone ?? "text-foreground")}>{r.value}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <dt className="text-sm font-semibold text-foreground">Total</dt>
        <dd className="text-base font-semibold text-foreground tabular-nums">{formatGBP(f.total)}</dd>
      </div>
      {f.discount > 0 && (
        <p className="-mt-1 text-right text-xs text-muted-foreground tabular-nums">
          Includes VAT ({f.vatPercent}%) of {formatGBP(f.vat)}
        </p>
      )}
      {order.refunded > 0 && (
        <div className="flex items-baseline justify-between text-violet-800">
          <dt>Refunded</dt>
          <dd className="tabular-nums">−{formatGBP(order.refunded)}</dd>
        </div>
      )}
    </dl>
  );
}
