import Link from "next/link";
import { Plus, TicketPercent } from "lucide-react";
import { DiscountCodeActions } from "@/components/admin/marketing/discount-code-actions";
import { DiscountStatusBadge, discountSummary, usesText, validityText } from "@/components/admin/marketing/discount-bits";
import { PageHeader } from "@/components/admin/page-header";
import { AdminToaster } from "@/components/admin/toast";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/session";
import { formatGBP } from "@/lib/cctvmaster/money";
import { codeStatus, DISCOUNT_STATUS_LABEL, DISCOUNT_STATUSES, type DiscountStatus } from "@/lib/discounts/rules";
import { listCodesWithStats } from "@/lib/discounts/service";
import { cn } from "@/lib/utils";

export const metadata = { title: "Discount codes" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
type Filter = "all" | DiscountStatus;

export default async function AdminMarketingPage({ searchParams }: PageProps<"/admin/marketing">) {
  await requireAdmin("marketing");
  const sp = await searchParams;
  const q = one(sp.q).trim().toUpperCase().slice(0, 40);
  const statusParam = one(sp.status);
  const filter: Filter = (DISCOUNT_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as DiscountStatus) : "all";

  const now = new Date();
  const all = (await listCodesWithStats()).map((c) => ({ ...c, status: codeStatus(c, now) }));
  const searched = q ? all.filter((c) => c.code.toUpperCase().includes(q)) : all;
  const rows = filter === "all" ? searched : searched.filter((c) => c.status === filter);
  const counts = Object.fromEntries(DISCOUNT_STATUSES.map((st) => [st, searched.filter((c) => c.status === st).length])) as Record<DiscountStatus, number>;
  const totals = rows.reduce((t, c) => ({ orders: t.orders + c.stats.orders, given: t.given + c.stats.discountGiven }), { orders: 0, given: 0 });

  const href = (patch: { q?: string; status?: Filter }) => {
    const params = new URLSearchParams();
    const nextQ = patch.q ?? q;
    const nextStatus = patch.status ?? filter;
    if (nextQ) params.set("q", nextQ);
    if (nextStatus !== "all") params.set("status", nextStatus);
    const qs = params.toString();
    return `/admin/marketing${qs ? `?${qs}` : ""}`;
  };
  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: searched.length },
    ...DISCOUNT_STATUSES.map((st) => ({ id: st, label: DISCOUNT_STATUS_LABEL[st], count: counts[st] })),
  ];

  return (
    <>
      <AdminToaster />
      <PageHeader
        title="Discount codes"
        description="Codes customers enter at checkout. A use is counted when an order is paid; a used code can be switched off but not deleted."
        actions={
          <Link href="/admin/marketing/new" className={buttonVariants()}>
            <Plus /> New code
          </Link>
        }
      />

      <nav aria-label="Code status" className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const active = filter === t.id;
          return (
            <Link
              key={t.id}
              href={href({ status: t.id })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                active ? "border-primary bg-primary text-white" : "bg-white text-foreground/80 hover:bg-surface",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/20" : "bg-muted text-muted-foreground")}>{t.count}</span>
            </Link>
          );
        })}
      </nav>

      <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/marketing">
        {filter !== "all" && <input type="hidden" name="status" value={filter} />}
        <div className="flex flex-col gap-1">
          <label htmlFor="codes-q" className="text-muted-foreground text-xs font-medium">
            Search
          </label>
          <Input id="codes-q" name="q" defaultValue={q} placeholder="Code" className="w-64 font-mono uppercase" />
        </div>
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
          Search
        </button>
        {q && (
          <Link href={href({ q: "" })} className={buttonVariants({ variant: "ghost" })}>
            Clear
          </Link>
        )}
      </form>

      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Codes:</span> <span className="font-semibold tabular-nums">{rows.length}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Paid orders with a code:</span> <span className="font-semibold tabular-nums">{totals.orders}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Discount given:</span> <span className="font-semibold tabular-nums">{formatGBP(totals.given)}</span>
        </p>
      </div>

      {all.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-white px-6 py-16 text-center">
          <TicketPercent className="text-muted-foreground size-8" aria-hidden="true" />
          <p className="font-medium">No discount codes yet</p>
          <p className="text-muted-foreground text-sm">Create a percentage, fixed-amount or free-delivery code for customers to use at checkout.</p>
          <Link href="/admin/marketing/new" className={buttonVariants({ size: "sm", className: "mt-2" })}>
            <Plus /> New code
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead className="text-right">Uses</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Discount given</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                    No codes match.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => (
                <TableRow key={c.id} data-code={c.code}>
                  <TableCell>
                    <Link href={`/admin/marketing/${c.id}`} className="font-mono font-semibold hover:underline">
                      {c.code}
                    </Link>
                    {c.oncePerCustomer && <p className="text-muted-foreground text-xs">One per customer</p>}
                  </TableCell>
                  <TableCell className="text-sm">{discountSummary(c)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{validityText(c)}</TableCell>
                  <TableCell className="text-right tabular-nums" data-cell="uses">
                    {usesText(c)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums" data-cell="orders">
                    {c.stats.orders}
                    {c.stats.pending > 0 && <p className="text-muted-foreground text-xs">{c.stats.pending} awaiting payment</p>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums" data-cell="given">
                    {formatGBP(c.stats.discountGiven)}
                  </TableCell>
                  <TableCell>
                    <DiscountStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Link href={`/admin/marketing/${c.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                        Edit
                      </Link>
                      <DiscountCodeActions id={c.id} code={c.code} active={c.active} used={c.uses > 0 || c.stats.orders > 0 || c.stats.pending > 0} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
