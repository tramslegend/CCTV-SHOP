"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { canAccess } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "./nav";

interface ShellUser {
  name: string;
  email: string;
  role: string;
}

/** Counts shown next to sidebar links, keyed by href (e.g. new messages, orders to fulfil). */
export type NavBadges = Record<string, number>;

function NavLinks({ role, badges, onNavigate }: { role: string; badges: NavBadges; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav className="flex flex-col gap-5 px-3 py-4 text-sm">
      {ADMIN_NAV.map((group, i) => {
        const items = group.items.filter((item) => canAccess(role, item.area));
        if (!items.length) return null;
        return (
          <div key={group.heading ?? i} className="flex flex-col gap-0.5">
            {group.heading && (
              <p className="text-muted-foreground px-2 pb-1 text-[11px] font-semibold tracking-wider uppercase">{group.heading}</p>
            )}
            {items.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 font-medium transition-colors",
                  isActive(href) ? "bg-primary text-white" : "text-foreground/80 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {!!badges[href] && (
                  <span
                    className={cn(
                      "min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold tabular-nums",
                      isActive(href) ? "bg-white text-foreground" : "bg-emerald-600 text-white",
                    )}
                  >
                    <span className="sr-only">(</span>
                    {badges[href] > 99 ? "99+" : badges[href]}
                    <span className="sr-only"> waiting)</span>
                  </span>
                )}
              </Link>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  user,
  storeName,
  badges = {},
  children,
}: {
  user: ShellUser;
  storeName: string;
  badges?: NavBadges;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const signOut = async () => {
    await authClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  };
  const brand = (
    <Link href="/admin" className="flex items-center gap-2 px-5 py-4 font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs text-white">{storeName.slice(0, 1)}</span>
      <span className="truncate">{storeName}</span>
      <span className="text-muted-foreground text-xs font-normal">Admin</span>
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-canvas text-foreground">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-white lg:flex">
        {brand}
        <div className="flex-1 overflow-y-auto">
          <NavLinks role={user.role} badges={badges} />
        </div>
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          {brand}
          <NavLinks role={user.role} badges={badges} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white/95 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <div className="flex-1" />
          <Link href="/" target="_blank" className="text-muted-foreground hidden items-center gap-1.5 text-sm hover:text-foreground sm:flex">
            View shop <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-3 border-l pl-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-muted-foreground text-xs capitalize">{user.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut /> Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
