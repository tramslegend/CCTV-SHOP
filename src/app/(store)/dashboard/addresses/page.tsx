import type { Metadata } from "next";
import { AddressesView } from "@/components/sites/cctvmaster/account/dashboard-views";
import { listAddresses, requireCustomer } from "@/lib/orders/customer";
import { toDashboardAddress } from "@/lib/orders/dashboard";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireCustomer("/dashboard/addresses");
  const addresses = await listAddresses(user.id);
  return <AddressesView addresses={addresses.map(toDashboardAddress)} />;
}
