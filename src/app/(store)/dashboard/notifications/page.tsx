import type { Metadata } from "next";
import { NotificationsView } from "@/components/sites/cctvmaster/account/dashboard-views";
import { listNotifications, requireCustomer } from "@/lib/orders/customer";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireCustomer("/dashboard/notifications");
  return <NotificationsView notes={await listNotifications(user)} />;
}
