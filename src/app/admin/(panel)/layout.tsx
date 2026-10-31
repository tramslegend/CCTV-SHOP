import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

// Back-office chrome. Each page still calls requireAdmin(area) itself: layouts and pages render independently.
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireAdmin("dashboard");
  const [store, newMessages, ordersToFulfil] = await Promise.all([
    db.settings.findOne({ _id: "store" }),
    db.enquiries.countDocuments({ status: "new" }),
    db.orders.countDocuments({ status: { $in: ["paid", "processing"] } }),
  ]);
  const storeName = (store?.value as { name?: string } | undefined)?.name || "Shop";
  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role }}
      storeName={storeName}
      badges={{ "/admin/messages": newMessages, "/admin/orders": ordersToFulfil }}
    >
      {children}
    </AdminShell>
  );
}
