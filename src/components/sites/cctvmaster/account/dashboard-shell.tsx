"use client";

import { Bell, Heart, LayoutDashboard, LogOut, MapPin, Package, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/local-store";
import { cn } from "@/lib/utils";
import { showToast } from "../shop-state";
import { useReadNotifications } from "./account-store";
import { CONTAINER, eyebrow } from "./styles";

const nav: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", Icon: Package },
  { href: "/dashboard/wishlist", label: "Wishlist", Icon: Heart },
  { href: "/dashboard/notifications", label: "Notifications", Icon: Bell },
  { href: "/dashboard/addresses", label: "Addresses", Icon: MapPin },
  { href: "/dashboard/settings", label: "Account details", Icon: Settings },
];

const DashboardContext = createContext<{ leave: () => void }>({ leave: () => {} });

/** Sign out from inside the dashboard (goes home rather than back to /login). */
export const useDashboardSignOut = () => useContext(DashboardContext).leave;

/**
 * Account chrome. The signed-in check happens on the server (each dashboard page calls requireCustomer), so this
 * only renders for a signed-in user. Notification ids come from the server; read state is kept per browser.
 */
export function DashboardShell({
  account,
  notificationIds,
  children,
}: {
  account: { name: string; email: string };
  notificationIds: string[];
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  const read = useReadNotifications();
  const pathname = usePathname();
  const router = useRouter();

  const leave = async () => {
    await authClient.signOut();
    showToast({ title: "You’ve signed out" });
    router.push("/");
    router.refresh();
  };

  const unread = hydrated ? notificationIds.filter((id) => !read.includes(id)).length : 0;
  const initials = account.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <DashboardContext.Provider value={{ leave }}>
      <div className="bg-zinc-50">
        <div className={cn(CONTAINER, "py-8 lg:py-10")}>
          <div className="text-muted-foreground mb-6 flex items-center gap-2 text-sm">
            <Link className="hover:text-foreground" href="/">
              Home
            </Link>
            <span>/</span>
            <span className="text-foreground">My account</span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
            <aside className="min-w-0 space-y-3 lg:sticky lg:top-32 lg:h-fit">
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-800">
                  {initials || "CM"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-950">{account.name}</p>
                  <p className="truncate text-xs text-zinc-500">{account.email}</p>
                </div>
              </div>
              <nav
                aria-label="Account"
                className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:rounded-xl lg:border lg:border-zinc-200 lg:bg-white lg:p-2"
              >
                {nav.map(({ href, label, Icon }) => {
                  const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex shrink-0 items-center gap-2.5 rounded-full border px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:rounded-md lg:border-0 lg:px-3",
                        active
                          ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1">{label}</span>
                      {href === "/dashboard/notifications" && unread > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-700 px-1.5 text-[10px] font-bold text-white">
                          {unread}
                          <span className="sr-only"> unread</span>
                        </span>
                      )}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={leave}
                  className="flex shrink-0 items-center gap-2.5 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium whitespace-nowrap text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-red-700 lg:mt-1 lg:rounded-md lg:border-0 lg:border-t lg:px-3"
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Sign out
                </button>
              </nav>
            </aside>
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}

/** Heading block used at the top of every account page. */
export function DashHeader({
  kicker,
  title,
  lede,
  action,
}: {
  kicker: string;
  title: string;
  lede?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className={eyebrow}>
          <span aria-hidden="true" className="h-px w-6 bg-emerald-700" />
          {kicker}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-3xl">{title}</h1>
        {lede && <p className="mt-1.5 text-sm text-zinc-500">{lede}</p>}
      </div>
      {action}
    </div>
  );
}
