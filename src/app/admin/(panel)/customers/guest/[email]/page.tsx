import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AddressList, CustomerOrdersTable, CustomerStats, addressesFromOrders } from "@/components/admin/customers/customer-detail";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { db, escapeRegex } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import type { StoredAddress } from "@/lib/orders/format";
import { customerOrders } from "@/lib/orders/admin-queries";

export const metadata = { title: "Guest customer" };

// A guest is everyone who checked out with an email that has no account.
export default async function AdminGuestCustomerPage({ params }: PageProps<"/admin/customers/guest/[email]">) {
  await requireAdmin("customers");
  const email = decodeURIComponent((await params).email).trim().toLowerCase();
  if (!email.includes("@")) notFound();

  // Same email in any case (the old `lower(email) = …`).
  const account = await db.users.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") }, { projection: { _id: 1 } });
  if (account) redirect(`/admin/customers/${account._id}`);

  const orders = await customerOrders({ email });
  const paid = orders.filter((o) => o.paidAt);
  if (!paid.length) notFound();
  const latest = paid[0].shippingAddress as StoredAddress;

  return (
    <>
      <Link href="/admin/customers?type=guest" className="text-muted-foreground mb-3 inline-flex items-center gap-1 text-sm hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Customers
      </Link>
      <PageHeader
        title={latest.name || email}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <a href={`mailto:${email}`} className="hover:underline">
              {email}
            </a>
            {paid[0].phone && <span>· {paid[0].phone}</span>}
            <Badge variant="outline">Guest checkout · no account</Badge>
          </span>
        }
      />
      <CustomerStats orders={paid} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <CustomerOrdersTable orders={paid} />
        </div>
        <AddressList title="Delivered to" empty="No deliveries yet." addresses={addressesFromOrders(paid)} />
      </div>
    </>
  );
}
