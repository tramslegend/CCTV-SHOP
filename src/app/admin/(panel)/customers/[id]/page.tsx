import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BlockControl } from "@/components/admin/customers/block-control";
import { AddressList, CustomerOrdersTable, CustomerStats, addressesFromOrders } from "@/components/admin/customers/customer-detail";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, stripId } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { customerOrders } from "@/lib/orders/admin-queries";

export const metadata = { title: "Customer" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

export default async function AdminCustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requireAdmin("customers");
  const { id } = await params;
  const doc = await db.users.findOne({ _id: decodeURIComponent(id) });
  if (!doc) notFound();
  // Auth documents keep the id in `_id`; fields Better Auth didn't write read as empty (the role as "customer", like
  // the old column default).
  const user = {
    id: doc._id,
    name: doc.name,
    email: doc.email,
    emailVerified: doc.emailVerified,
    role: doc.role ?? "customer",
    banned: doc.banned ?? null,
    banReason: doc.banReason ?? null,
    phone: doc.phone ?? null,
    company: doc.company ?? null,
    createdAt: doc.createdAt,
  };

  const [orders, saved, lastSeen] = await Promise.all([
    customerOrders({ userId: user.id, email: user.email }),
    db.addresses
      .find({ userId: user.id })
      .sort({ isDefault: -1, updatedAt: -1 })
      .toArray()
      .then((rows) => rows.map(stripId)),
    db.sessions
      .findOne({ userId: user.id }, { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } })
      .then((s) => ({ at: s?.updatedAt ?? null })),
  ]);
  const paidOrders = orders.filter((o) => o.paidAt);
  const isCustomer = user.role === "customer";

  return (
    <>
      <Link href="/admin/customers" className="text-muted-foreground mb-3 inline-flex items-center gap-1 text-sm hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Customers
      </Link>
      <PageHeader
        title={user.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <a href={`mailto:${user.email}`} className="hover:underline">
              {user.email}
            </a>
            {user.emailVerified ? <Badge variant="secondary">Email confirmed</Badge> : <Badge variant="outline">Email not confirmed</Badge>}
            {user.banned && <Badge variant="destructive">Blocked</Badge>}
            {!isCustomer && <Badge>Shop owner</Badge>}
          </span>
        }
      />
      <CustomerStats orders={paidOrders} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <CustomerOrdersTable orders={orders.filter((o) => o.paidAt || o.status === "pending_payment")} />
        </div>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Joined</dt>
                <dd>{when.format(user.createdAt)}</dd>
                <dt className="text-muted-foreground">Last active</dt>
                <dd>{lastSeen?.at ? when.format(new Date(lastSeen.at)) : "—"}</dd>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{user.phone || "—"}</dd>
                <dt className="text-muted-foreground">Company</dt>
                <dd>{user.company || "—"}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{user.banned ? `Blocked${user.banReason ? ` (${user.banReason})` : ""}` : "Active"}</dd>
              </dl>
              {isCustomer ? (
                <BlockControl userId={user.id} banned={!!user.banned} />
              ) : (
                <p className="text-muted-foreground text-xs">This is the shop owner’s account, so it can’t be blocked here.</p>
              )}
            </CardContent>
          </Card>
          <AddressList
            title="Saved addresses"
            empty="No saved addresses."
            addresses={saved.map((a) => ({
              key: String(a.id),
              name: a.name,
              company: a.company ?? undefined,
              line1: a.line1,
              line2: a.line2 ?? undefined,
              city: a.city,
              county: a.county ?? undefined,
              postcode: a.postcode,
              phone: a.phone ?? undefined,
              note: [a.label, a.isDefault ? "Default" : null].filter(Boolean).join(" · ") || undefined,
            }))}
          />
          <AddressList title="Delivered to" empty="No deliveries yet." addresses={addressesFromOrders(paidOrders)} />
        </div>
      </div>
    </>
  );
}
