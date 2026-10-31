import type { Metadata } from "next";
import { DashboardShell } from "@/components/sites/cctvmaster/account/dashboard-shell";
import { getShopSession, listNotifications } from "@/lib/orders/customer";
import { loadSiteSettings } from "@/lib/settings/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const { store } = await loadSiteSettings();
  return {
    title: { default: "My Account", template: `%s | My Account | ${store.name}` },
    robots: { index: false },
  };
}

// Account chrome for signed-in customers. Every page below still checks the session itself (requireCustomer),
// which also sends signed-out visitors to /login with the right return path.
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await getShopSession();
  if (!session || session.user.banned) return children;
  const notes = await listNotifications(session.user);
  return (
    <DashboardShell account={{ name: session.user.name, email: session.user.email }} notificationIds={notes.map((n) => n.id)}>
      {children}
    </DashboardShell>
  );
}
