import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscountCodeActions } from "@/components/admin/marketing/discount-code-actions";
import { DiscountStatusBadge, usesText } from "@/components/admin/marketing/discount-bits";
import { DiscountForm } from "@/components/admin/marketing/discount-form";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/session";
import { formatGBP } from "@/lib/cctvmaster/money";
import { codeStatus, ukDateInput } from "@/lib/discounts/rules";
import { blockingOrders, getCodeWithStats, ordersWithCode } from "@/lib/discounts/service";
import type { DiscountFormValues } from "@/lib/discounts/validation";
import type { StoredAddress } from "@/lib/orders/format";

export const metadata = { title: "Discount code" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });
const plain = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export default async function DiscountCodePage({ params }: PageProps<"/admin/marketing/[id]">) {
  await requireAdmin("marketing");
  const id = Number((await params).id);
  const code = await getCodeWithStats(id);
  if (!code) notFound();
  const [orders, holding] = await Promise.all([ordersWithCode(code.code), blockingOrders(code.code)]);
  const used = code.uses > 0 || code.stats.orders > 0 || holding > 0;
  const status = codeStatus(code);

  const initialValues: DiscountFormValues = {
    code: code.code,
    type: code.type,
    value: code.type === "free_delivery" ? "" : code.type === "fixed" ? code.value.toFixed(2) : plain(code.value),
    minSpend: code.minSpend ? code.minSpend.toFixed(2) : "",
    startsOn: ukDateInput(code.startsAt),
    endsOn: ukDateInput(code.endsAt),
    maxUses: code.maxUses !== null ? String(code.maxUses) : "",
    oncePerCustomer: code.oncePerCustomer,
    active: code.active,
  };

  const stats = [
    { label: "Uses", value: usesText(code), hint: "Counted on payment" },
    { label: "Paid orders", value: String(code.stats.orders), hint: code.stats.pending ? `${code.stats.pending} awaiting payment` : undefined },
    { label: "Discount given", value: formatGBP(code.stats.discountGiven), hint: "Inc. VAT" },
    { label: "Order value", value: formatGBP(code.stats.revenue), hint: "Paid, after the discount" },
  ];

  return (
    <>
      <DiscountForm
        // A saved change re-renders the page with fresh values.
        key={JSON.stringify(initialValues)}
        mode="edit"
        id={code.id}
        initialValues={initialValues}
        used={used}
        uses={code.uses}
        header={<DiscountStatusBadge status={status} />}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="code-stats">
            {stats.map((st) => (
              <div key={st.label} className="rounded-xl border bg-white p-4">
                <p className="text-muted-foreground text-xs font-medium">{st.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{st.value}</p>
                {st.hint && <p className="text-muted-foreground text-xs">{st.hint}</p>}
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Orders with this code</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-muted-foreground text-sm">No orders have used this code yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Link href={`/admin/orders/${o.id}`} className="font-medium tabular-nums hover:underline">
                            {o.number}
                          </Link>
                          <p className="text-muted-foreground text-xs tabular-nums">{when.format(o.createdAt)}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{(o.shippingAddress as StoredAddress).name}</p>
                          <p className="text-muted-foreground text-xs">{o.email}</p>
                        </TableCell>
                        <TableCell className="text-right text-brand-700 tabular-nums">−{formatGBP(o.discount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatGBP(o.total)}</TableCell>
                        <TableCell>
                          <OrderStatusBadge status={o.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Switch off or delete</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              {used
                ? "This code has been used, so it can’t be deleted. Deactivate it to stop customers using it; its orders and figures stay."
                : "Never used, so it can be deleted. Deactivating keeps it for later."}
            </p>
            <DiscountCodeActions id={code.id} code={code.code} active={code.active} used={used} size="default" afterDelete="/admin/marketing" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
