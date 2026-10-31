import type { Metadata } from "next";
import { OrdersList } from "@/components/sites/cctvmaster/account/dashboard-views";
import { countUnclaimedGuestOrders, listCustomerOrders, requireCustomer } from "@/lib/orders/customer";
import { toDashboardAccount } from "@/lib/orders/dashboard";
import { toReceipt } from "@/lib/orders/receipt";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage(props: PageProps<"/dashboard/orders">) {
  const user = await requireCustomer("/dashboard/orders");
  const query = await props.searchParams;
  const [orders, unclaimed] = await Promise.all([listCustomerOrders(user), countUnclaimedGuestOrders(user)]);
  return (
    <OrdersList
      orders={orders.map((o) => toReceipt(o, o.items))}
      account={toDashboardAccount(user)}
      unclaimed={unclaimed}
      justVerified={query.verified === "1"}
    />
  );
}
