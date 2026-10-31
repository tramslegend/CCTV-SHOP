import Link from "next/link";
import type { ReactNode } from "react";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrderRow } from "@/db/schema";
import { formatGBP } from "@/lib/cctvmaster/money";
import { addressLines, type StoredAddress } from "@/lib/orders/format";
import { round2 } from "@/lib/orders/pricing";

type Order = OrderRow;

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

export function CustomerStats({ orders }: { orders: Order[] }) {
  const paid = orders.filter((o) => o.paidAt);
  const spent = round2(paid.reduce((sum, o) => sum + o.total - o.refundedAmount, 0));
  const stats = [
    { label: "Paid orders", value: String(paid.length) },
    { label: "Spent (less refunds)", value: formatGBP(spent) },
    { label: "Average order", value: paid.length ? formatGBP(round2(paid.reduce((n, o) => n + o.total, 0) / paid.length)) : "—" },
    { label: "Last order", value: paid[0] ? when.format(paid[0].createdAt) : "—" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs font-medium">{s.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CustomerOrdersTable({ orders }: { orders: Order[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead>Ship to</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  No orders yet.
                </TableCell>
              </TableRow>
            )}
            {orders.map((o) => {
              const ship = o.shippingAddress as StoredAddress;
              return (
                <TableRow key={o.id} className="relative">
                  <TableCell>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium tabular-nums after:absolute after:inset-0 hover:underline">
                      {o.number}
                    </Link>
                    {!o.userId && <p className="text-muted-foreground text-xs">as a guest</p>}
                  </TableCell>
                  <TableCell className="tabular-nums">{when.format(o.createdAt)}</TableCell>
                  <TableCell className="text-sm">
                    {ship.city} <span className="text-muted-foreground">{ship.postcode}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatGBP(o.total)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={o.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function AddressList({ title, addresses, empty }: { title: string; addresses: (StoredAddress & { key: string; note?: ReactNode })[]; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {addresses.length === 0 && <p className="text-muted-foreground">{empty}</p>}
        {addresses.map((a) => (
          <div key={a.key}>
            <p className="leading-6">
              {addressLines(a).map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </p>
            {a.phone && <p className="text-muted-foreground">{a.phone}</p>}
            {a.note && <p className="text-muted-foreground text-xs">{a.note}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Distinct delivery addresses used on a set of orders, most recent first. */
export function addressesFromOrders(orders: Order[]) {
  const seen = new Set<string>();
  const out: (StoredAddress & { key: string; note: string })[] = [];
  for (const o of orders) {
    const a = o.shippingAddress as StoredAddress;
    const key = `${(a.line1 ?? "").toLowerCase()}|${(a.postcode ?? "").replace(/\s/g, "").toUpperCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...a, key, note: `Used on ${o.number}` });
  }
  return out;
}
