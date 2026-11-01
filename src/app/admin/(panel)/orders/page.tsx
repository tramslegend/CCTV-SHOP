import Link from "next/link";
import { Download } from "lucide-react";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/session";
import { formatGBP } from "@/lib/cctvmaster/money";
import { ORDER_TABS, PAGE_SIZE, filterQuery, listAdminOrders, parseOrderFilters } from "@/lib/orders/admin-queries";
import type { StoredAddress } from "@/lib/orders/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Orders" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin("orders");
  const filters = parseOrderFilters(await searchParams);
  const { rows, summary, counts } = await listAdminOrders(filters);
  const pages = Math.max(1, Math.ceil(summary.n / PAGE_SIZE));
  const href = (patch: Partial<typeof filters>) => {
    const qs = filterQuery({ ...filters, page: 1, ...patch });
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };
  const exportQs = filterQuery({ ...filters, page: 1 });

  return (
    <>
      <PageHeader
        title="Orders"
        description="Paid orders to pick, pack and dispatch. Unpaid checkouts are kept under Unpaid."
        actions={
          <a href={`/admin/orders/export${exportQs ? `?${exportQs}` : ""}`} className={buttonVariants({ variant: "outline" })} download>
            <Download /> Export CSV
          </a>
        }
      />

      <nav aria-label="Order status" className="mb-4 flex flex-wrap gap-1.5">
        {ORDER_TABS.map((t) => {
          const active = filters.tab === t.id;
          return (
            <Link
              key={t.id}
              href={href({ tab: t.id })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                active ? "border-primary bg-primary text-white" : "bg-white text-foreground/80 hover:bg-surface",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/20" : "bg-muted text-muted-foreground")}>
                {counts[t.id]}
              </span>
            </Link>
          );
        })}
      </nav>

      <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/orders">
        {filters.tab !== "all" && <input type="hidden" name="status" value={filters.tab} />}
        <div className="flex flex-col gap-1">
          <label htmlFor="orders-q" className="text-muted-foreground text-xs font-medium">
            Search
          </label>
          <Input id="orders-q" name="q" defaultValue={filters.q} placeholder="Order number, email, name, postcode or code" className="w-72" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="orders-from" className="text-muted-foreground text-xs font-medium">
            From
          </label>
          <Input id="orders-from" name="from" type="date" defaultValue={filters.from} className="w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="orders-to" className="text-muted-foreground text-xs font-medium">
            To
          </label>
          <Input id="orders-to" name="to" type="date" defaultValue={filters.to} className="w-40" />
        </div>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Filter
        </button>
        {(filters.q || filters.from || filters.to) && (
          <Link href={href({ q: "", from: "", to: "" })} className={buttonVariants({ variant: "ghost" })}>
            Clear
          </Link>
        )}
      </form>

      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Orders:</span> <span className="font-semibold tabular-nums">{summary.n.toLocaleString("en-GB")}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Total value:</span> <span className="font-semibold tabular-nums">{formatGBP(summary.total)}</span>
        </p>
        {summary.refunded > 0 && (
          <p>
            <span className="text-muted-foreground">Refunded:</span>{" "}
            <span className="font-semibold text-violet-700 tabular-nums">{formatGBP(summary.refunded)}</span>
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Ship to</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                  No orders match.
                </TableCell>
              </TableRow>
            )}
            {rows.map((o) => {
              const ship = o.shippingAddress as StoredAddress;
              return (
                <TableRow key={o.id} className="relative">
                  <TableCell>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium tabular-nums after:absolute after:inset-0 hover:underline">
                      {o.number}
                    </Link>
                    <p className="text-muted-foreground text-xs tabular-nums">{when.format(o.createdAt)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{ship.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {o.email}
                      {!o.userId && " · guest"}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {ship.city}
                    <span className="text-muted-foreground"> {ship.postcode}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{o.units}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatGBP(o.total)}
                    {o.refundedAmount > 0 && <p className="text-xs text-violet-700">−{formatGBP(o.refundedAmount)}</p>}
                    {o.discountCode && <p className="text-muted-foreground font-mono text-[11px]">{o.discountCode}</p>}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={o.status} />
                    {o.paymentProvider === "test" && <p className="mt-1 text-[11px] text-amber-700">Test payment</p>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          Page {filters.page} of {pages}
        </p>
        <div className="flex gap-2">
          {filters.page > 1 && (
            <Link href={href({ page: filters.page - 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Previous
            </Link>
          )}
          {filters.page < pages && (
            <Link href={href({ page: filters.page + 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Next
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
