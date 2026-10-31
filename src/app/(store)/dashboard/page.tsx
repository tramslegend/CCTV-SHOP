import { DashboardOverview } from "@/components/sites/cctvmaster/account/dashboard-views";
import { countUnclaimedGuestOrders, listCustomerOrders, requireCustomer } from "@/lib/orders/customer";
import { toDashboardAccount } from "@/lib/orders/dashboard";
import { toReceipt } from "@/lib/orders/receipt";

export default async function DashboardPage() {
  const user = await requireCustomer("/dashboard");
  const [orders, unclaimed] = await Promise.all([listCustomerOrders(user), countUnclaimedGuestOrders(user)]);
  return (
    <DashboardOverview
      account={toDashboardAccount(user)}
      recent={orders.slice(0, 3).map((o) => toReceipt(o, o.items))}
      orderCount={orders.length}
      unclaimed={unclaimed}
    />
  );
}
