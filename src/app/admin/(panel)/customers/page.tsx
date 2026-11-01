import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/session";
import { formatGBP } from "@/lib/cctvmaster/money";
import { PAGE_SIZE, listCustomers } from "@/lib/orders/admin-queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Customers" };

const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });
const TYPES = [
  { id: "all", label: "Everyone" },
  { id: "registered", label: "With an account" },
  { id: "guest", label: "Guest checkout" },
] as const;

const customerHref = (row: { userId: string | null; email: string }) =>
  row.userId ? `/admin/customers/${row.userId}` : `/admin/customers/guest/${encodeURIComponent(row.email.toLowerCase())}`;

export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin("customers");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const type = TYPES.find((t) => t.id === sp.type)?.id ?? "all";
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));
  const { rows, total } = await listCustomers({ q, type, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (patch: { type?: string; page?: number }) => {
    const params = new URLSearchParams();
    const t = patch.type ?? type;
    if (q) params.set("q", q);
    if (t !== "all") params.set("type", t);
    if ((patch.page ?? 1) > 1) params.set("page", String(patch.page));
    const qs = params.toString();
    return `/admin/customers${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description="Shop accounts and guest checkouts, with what they’ve ordered. Spend is paid orders less refunds."
      />
      <nav aria-label="Customer type" className="mb-4 flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <Link
            key={t.id}
            href={href({ type: t.id })}
            aria-current={type === t.id ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              type === t.id ? "border-primary bg-primary text-white" : "bg-white text-foreground/80 hover:bg-surface",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/customers">
        {type !== "all" && <input type="hidden" name="type" value={type} />}
        <Input name="q" defaultValue={q} placeholder="Search by name or email" className="max-w-xs" aria-label="Search customers" />
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Search
        </button>
      </form>
      <div className="rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead>Last order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                  No customers match.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.userId ?? `guest:${r.email}`} className="relative">
                <TableCell>
                  <Link href={customerHref(r)} className="font-medium after:absolute after:inset-0 hover:underline">
                    {r.name || r.email}
                  </Link>
                  <p className="text-muted-foreground text-xs">{r.email}</p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {r.userId ? (
                      <Badge variant="secondary">Since {r.joined ? day.format(r.joined) : "—"}</Badge>
                    ) : (
                      <Badge variant="outline">Guest</Badge>
                    )}
                    {r.banned && <Badge variant="destructive">Blocked</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.orders}</TableCell>
                <TableCell className="text-right tabular-nums">{formatGBP(r.spent)}</TableCell>
                <TableCell className="tabular-nums">{r.lastOrder ? day.format(r.lastOrder) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {total.toLocaleString("en-GB")} customers · page {page} of {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={href({ page: page - 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Previous
            </Link>
          )}
          {page < pages && (
            <Link href={href({ page: page + 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Next
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
