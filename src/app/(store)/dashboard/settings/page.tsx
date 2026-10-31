import type { Metadata } from "next";
import { SettingsForm } from "@/components/sites/cctvmaster/account/dashboard-views";
import { requireCustomer } from "@/lib/orders/customer";
import { toDashboardAccount } from "@/lib/orders/dashboard";

export const metadata: Metadata = { title: "Account details" };

export default async function SettingsPage() {
  const user = await requireCustomer("/dashboard/settings");
  return <SettingsForm key={user.updatedAt.toString()} account={toDashboardAccount(user)} />;
}
