import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { OrderActions } from "@/components/admin/orders/order-actions";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db, escapeRegex, stripId } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { findCodeByText } from "@/lib/discounts/service";
import { formatGBP } from "@/lib/cctvmaster/money";
import { addressLines, type StoredAddress } from "@/lib/orders/format";
import { discountLabel, incVat, orderFigures, round2 } from "@/lib/orders/pricing";
import { getOrderById } from "@/lib/orders/service";
import { trackingUrl } from "@/lib/orders/status";

export const metadata = { title: "Order" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

const EVENT_LABEL: Record<string, string> = {
  placed: "Placed",
  payment_started: "Payment",
  paid: "Paid",
  payment_issue: "Check payment",
  processing: "Processing",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refund",
  note: "Note",
  email: "Email",
  stock: "Stock",
  customer: "Customer",
  discount: "Discount",
};

function Address({ title, address }: { title: string; address: StoredAddress | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</p>
      {address ? (
        <p className="mt-1 text-sm leading-6">
          {addressLines(address).map((l, i) => (
            // Two address lines can read the same, so the key includes the position.
            <span key={`${i}-${l}`} className="block">
              {l}
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-1 text-sm">Same as delivery</p>
      )}
    </div>
  );
}

/** Whole-value, case-insensitive match (the old `lower(x) = lower(y)`). */
const sameText = (text: string) => new RegExp(`^${escapeRegex(text)}$`, "i");

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin("orders");
  const id = Number((await params).id);
  const order = await getOrderById(id);
  if (!order) notFound();

  const [items, eventRows, accountDoc, tracked] = await Promise.all([
    db.orderItems
      .find({ orderId: id })
      .sort({ _id: 1 })
      .toArray()
      .then((rows) => rows.map(stripId)),
    db.orderEvents.find({ orderId: id }).sort({ createdAt: -1, _id: -1 }).toArray(),
    db.users.findOne(order.userId ? { _id: order.userId } : { email: sameText(order.email.toLowerCase()) }, {
      projection: { _id: 1, email: 1, role: 1 },
    }),
    // Items of this order whose product tracks stock.
    db.orderItems
      .aggregate<{ n: number }>([
        { $match: { orderId: id } },
        { $lookup: { from: db.products.collectionName, localField: "productId", foreignField: "_id", as: "product" } },
        { $match: { "product.trackStock": true } },
        { $count: "n" },
      ])
      .toArray()
      .then(([r]) => r?.n ?? 0),
  ]);
  // Who wrote each timeline entry (back-office users are shown by name).
  const actorIds = [...new Set(eventRows.map((e) => e.actorId).filter((a): a is string => typeof a === "string"))];
  const actors = actorIds.length
    ? await db.users.find({ _id: { $in: actorIds } }, { projection: { _id: 1, name: 1, email: 1, role: 1 } }).toArray()
    : [];
  const actorById = new Map(actors.map((a) => [a._id, a]));
  const events = eventRows.map((e) => {
    const actor = e.actorId ? actorById.get(e.actorId) : undefined;
    return { event: stripId(e), actorName: actor?.name ?? null, actorEmail: actor?.email ?? null, actorRole: actor?.role ?? null };
  });
  // An account has a role ("customer" when none was stored, like the old column default).
  const account = accountDoc ? { id: accountDoc._id, email: accountDoc.email, role: accountDoc.role ?? "customer" } : undefined;
  const previousOrders = await db.orders.countDocuments({
    paidAt: { $ne: null },
    _id: { $ne: id },
    ...(account
      ? { $or: [{ userId: account.id }, { userId: null, email: sameText(account.email.toLowerCase()) }] }
      : { userId: null, email: sameText(order.email.toLowerCase()) }),
  });

  const f = orderFigures(order, items);
  const rate = f.vatRate;
  const ship = order.shippingAddress as StoredAddress;
  const billing = order.billingAddress as StoredAddress | null;
  const remaining = round2(order.total - order.refundedAmount);
  const track = trackingUrl(order.carrier, order.trackingNumber);
  const customerHref =
    account && account.role === "customer" ? `/admin/customers/${account.id}` : !account ? `/admin/customers/guest/${encodeURIComponent(order.email.toLowerCase())}` : null;
  const stripeUrl =
    order.paymentProvider === "stripe" && order.paymentRef?.startsWith("pi_")
      ? `https://dashboard.stripe.com/${process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ? "test/" : ""}payments/${order.paymentRef}`
      : null;
  const issues = events.filter((e) => e.event.type === "payment_issue");
  const codeId = order.discountCode ? (await findCodeByText(order.discountCode))?.id : undefined;

  return (
    <>
      <Link href="/admin/orders" className="text-muted-foreground mb-3 inline-flex items-center gap-1 text-sm hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Orders
      </Link>
      <PageHeader
        title={`Order ${order.number}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            Placed {when.format(order.createdAt)}
            {order.paymentProvider === "test" && <span className="text-amber-700">· Local test payment (no money taken)</span>}
          </span>
        }
      />

      {issues.length > 0 && (
        <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {issues.map((e) => (
            <p key={e.event.id}>{e.event.message}</p>
          ))}
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="pt-4">
          <OrderActions
            orderId={order.id}
            status={order.status}
            paid={!!order.paidAt}
            provider={order.paymentProvider}
            remaining={remaining}
            carrier={order.carrier}
            trackingNumber={order.trackingNumber}
            hasTrackedStock={tracked > 0}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit (inc. VAT)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="max-w-md whitespace-normal">
                        {i.productId ? (
                          <Link href={`/admin/products/${i.productId}`} className="font-medium hover:underline">
                            {i.name}
                          </Link>
                        ) : (
                          <span className="font-medium">{i.name}</span>
                        )}
                        <p className="text-muted-foreground text-xs">
                          SKU {i.sku ?? "—"} · {formatGBP(i.unitPrice)} ex VAT
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{i.qty}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatGBP(incVat(i.unitPrice, rate))}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatGBP(incVat(i.unitPrice, rate) * i.qty)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <dl className="mt-4 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Items ex VAT</dt>
                <dd className="text-right tabular-nums">{formatGBP(f.itemsExVat)}</dd>
                <dt className="text-muted-foreground">Delivery ex VAT</dt>
                <dd className="text-right tabular-nums">{formatGBP(f.deliveryExVat)}</dd>
                {f.discount > 0 && (
                  <>
                    <dt className="text-muted-foreground">
                      {discountLabel(f.discountCode)} ex VAT
                      <span className="block text-xs">{formatGBP(f.discount)} inc. VAT</span>
                    </dt>
                    <dd className="text-right text-emerald-700 tabular-nums">−{formatGBP(f.discountExVat)}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">VAT ({f.vatPercent}%)</dt>
                <dd className="text-right tabular-nums">{formatGBP(f.vat)}</dd>
                <dt className="border-t pt-1 font-semibold">Total</dt>
                <dd className="border-t pt-1 text-right font-semibold tabular-nums">{formatGBP(f.total)}</dd>
                {order.refundedAmount > 0 && (
                  <>
                    <dt className="text-violet-700">Refunded</dt>
                    <dd className="text-right text-violet-700 tabular-nums">−{formatGBP(order.refundedAmount)}</dd>
                    <dt className="font-medium">Net received</dt>
                    <dd className="text-right font-medium tabular-nums">{formatGBP(remaining)}</dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3">
                {events.map(({ event, actorName, actorEmail, actorRole }) => (
                  <li key={event.id} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 text-sm">
                    <span className="text-muted-foreground text-xs tabular-nums">{when.format(event.createdAt)}</span>
                    <div className="min-w-0">
                      <span className="mr-2 inline-flex rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground/80">
                        {EVENT_LABEL[event.type] ?? event.type}
                      </span>
                      <span className={event.type === "note" ? "whitespace-pre-wrap" : undefined}>{event.message}</span>
                      {actorRole && actorRole !== "customer" && (
                        <span className="text-muted-foreground block text-xs">by {actorName || actorEmail}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <div>
                <p className="font-medium">{ship.name}</p>
                <a href={`mailto:${order.email}`} className="block break-all text-emerald-700 hover:underline">
                  {order.email}
                </a>
                {order.phone && (
                  <a href={`tel:${order.phone}`} className="block hover:underline">
                    {order.phone}
                  </a>
                )}
                <p className="text-muted-foreground mt-1 text-xs">
                  {account ? (account.role === "customer" ? "Has an account" : "Shop owner account") : "Guest checkout"}
                  {previousOrders > 0 ? ` · ${previousOrders} other paid order${previousOrders === 1 ? "" : "s"}` : " · first order"}
                </p>
                {customerHref && (
                  <Link href={customerHref} className="mt-1 inline-block text-xs font-medium text-emerald-700 hover:underline">
                    View customer
                  </Link>
                )}
              </div>
              <Address title="Delivery address" address={ship} />
              <Address title="Billing address" address={billing} />
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Delivery</p>
                <p className="mt-1">{order.deliveryMethod}</p>
              </div>
              {order.customerNote && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Customer note</p>
                  <p className="mt-1 whitespace-pre-wrap">{order.customerNote}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>
                {order.paymentProvider === "stripe" ? "Stripe" : order.paymentProvider === "test" ? "Local test payment" : "—"}
                {order.paidAt ? ` · paid ${when.format(order.paidAt)}` : " · not paid"}
              </p>
              {order.discountCode && (
                <p>
                  Discount code{" "}
                  {codeId ? (
                    <Link href={`/admin/marketing/${codeId}`} className="font-mono font-medium text-emerald-700 hover:underline">
                      {order.discountCode}
                    </Link>
                  ) : (
                    <span className="font-mono font-medium">{order.discountCode}</span>
                  )}{" "}
                  · −{formatGBP(order.discount)} inc. VAT
                </p>
              )}
              {order.paymentRef && (
                <p className="text-muted-foreground font-mono text-xs break-all">
                  {stripeUrl ? (
                    <a href={stripeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                      {order.paymentRef} <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ) : (
                    order.paymentRef
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fulfilment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              {order.trackingNumber ? (
                <>
                  <p>{order.carrier}</p>
                  <p className="font-mono text-xs">
                    {track ? (
                      <a href={track} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
                        {order.trackingNumber} <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    ) : (
                      order.trackingNumber
                    )}
                  </p>
                  {order.dispatchedAt && <p className="text-muted-foreground text-xs">Dispatched {when.format(order.dispatchedAt)}</p>}
                  {order.deliveredAt && <p className="text-muted-foreground text-xs">Delivered {when.format(order.deliveredAt)}</p>}
                </>
              ) : (
                <p className="text-muted-foreground">Not dispatched yet.</p>
              )}
              {order.internalNote && (
                <div className="mt-3 rounded-md bg-amber-50 p-2 text-xs whitespace-pre-wrap text-amber-950">
                  <span className="font-semibold">Latest note: </span>
                  {order.internalNote}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
