"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { HeaderNavItem } from "@/lib/navigation/menu";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";
import { BellIcon, ChevronDownIcon, ShoppingCartIcon, UserIcon } from "./icons";
import { MegaMenuPanel } from "./mega-menu";
import { SearchBox } from "./search-box";
import { cartCount, useCart } from "./shop-state";

const iconButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 w-9 relative overflow-visible";

export function NotificationsLink() {
  const { data: session } = authClient.useSession();
  return (
    <Link
      aria-label={session ? "Notifications" : "Sign in to see notifications"}
      title="Notifications"
      className="relative inline-flex overflow-visible p-1 transition-opacity hover:opacity-80"
      href={session ? "/dashboard/notifications" : "/login?next=%2Fdashboard%2Fnotifications"}
    >
      <BellIcon width="20" height="20" className="h-5 w-5" />
    </Link>
  );
}

export function CartLink() {
  const count = cartCount(useCart());
  return (
    <Link className={iconButton} href="/cart">
      <ShoppingCartIcon className="h-5 w-5" />
      {count > 0 && (
        <span className="bg-primary text-primary-foreground absolute top-0 right-0 flex h-4 min-w-4 translate-x-1 -translate-y-1 items-center justify-center rounded-full text-[10px] font-bold shadow-sm">
          {count > 99 ? "99+" : count}
        </span>
      )}
      <span className="sr-only">Shopping cart ({count} items)</span>
    </Link>
  );
}

function AccountLink() {
  // Better Auth session (fetched in the browser): "Sign In" until it resolves, then the customer's first name.
  const { data: session } = authClient.useSession();
  const name = session ? session.user.name.split(" ")[0] || "Account" : null;
  return (
    <Link
      className="text-foreground flex items-center gap-2 rounded-full py-1.5 pr-4 pl-2 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
      href={name ? "/dashboard" : "/login"}
    >
      <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-full">
        <UserIcon className="h-4 w-4 opacity-60" />
      </div>
      {name ?? "Sign In"}
    </Link>
  );
}

/** Thumbnail next to a category name; an empty tile when there's no picture. */
function NavThumb({ src }: { src: string }) {
  return src ? <Image src={src} alt="" width={24} height={24} className="h-full w-full object-contain" /> : null;
}

/**
 * Sticky header. `brand` (shop name and logo) comes from Settings via SiteShell; `nav` (the category bar and its
 * menus) from /admin/content/navigation.
 */
export function SiteHeader({ brand, nav }: { brand: { name: string; logoUrl: string }; nav: HeaderNavItem[] }) {
  const headerRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [panelTop, setPanelTop] = useState(0);

  const headerBottom = () => headerRef.current?.getBoundingClientRect().bottom ?? 0;
  const toggle = (name: string) => {
    setPanelTop(headerBottom());
    setOpen((current) => (current === name ? null : name));
  };

  // The panel is fixed to the bottom edge of the sticky header and follows it on scroll.
  useEffect(() => {
    if (!open) return;
    const place = () => setPanelTop(headerRef.current?.getBoundingClientRect().bottom ?? 0);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header ref={headerRef} className="fc-header sticky top-0 z-50 w-full border-b shadow-sm">
      <div className="bg-background w-full">
        <div className="mx-auto flex h-16 max-w-450 items-center gap-4 px-4 md:px-6 lg:px-8">
          <Link className="flex shrink-0 items-center" href="/">
            <BrandLogo name={brand.name} logoUrl={brand.logoUrl} width={120} height={40} className="h-9 w-auto" preload />
          </Link>
          <div className="min-w-0 flex-1">
            <Suspense fallback={<div className="h-9 rounded-md border" />}>
              <SearchBox />
            </Suspense>
          </div>
          <div className="lg:hidden">
            <NotificationsLink />
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <NotificationsLink />
            <CartLink />
            <AccountLink />
          </div>
        </div>
      </div>
      {nav.length > 0 && (
      <div className="relative hidden w-full border-t bg-surface lg:block">
        <div className="mx-auto max-w-450">
          <nav className="flex items-center justify-center gap-0 overflow-x-auto px-4 py-1 md:px-6 lg:px-8">
            {nav.map((cat) => {
              const thumb = <NavThumb src={cat.icon} />;
              const menu = cat.menu;
              if (!menu) {
                return (
                  <Link
                    key={cat.slug}
                    className="hover:text-foreground flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap text-foreground/80 dark:text-slate-300"
                    href={cat.href}
                  >
                    <div className="fc-blend h-6 w-6 shrink-0 overflow-hidden rounded">{thumb}</div>
                    <span>{cat.name}</span>
                  </Link>
                );
              }
              const isOpen = open === cat.slug;
              return (
                <div key={cat.slug} className="group/category static">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggle(cat.slug)}
                    className="relative flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap"
                  >
                    <div className="fc-blend pointer-events-none h-6 w-6 shrink-0 overflow-hidden rounded">
                      {thumb}
                    </div>
                    <span
                      className={cn(
                        "pointer-events-none",
                        isOpen ? "text-[#047857]" : "text-foreground/80 dark:text-slate-300",
                      )}
                    >
                      {cat.name}
                    </span>
                    <ChevronDownIcon
                      className={cn(
                        "text-muted-foreground pointer-events-none h-3.5 w-3.5 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(null)}>
                      <MegaMenuPanel category={menu} top={panelTop} />
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
        {open && <div aria-hidden="true" className="fixed inset-0 -z-10 bg-black/20" onClick={() => setOpen(null)} />}
      </div>
      )}
    </header>
  );
}
