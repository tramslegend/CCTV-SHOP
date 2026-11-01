"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import { ChevronRightIcon, HouseIcon, LifeBuoyIcon, ShoppingCartIcon, StoreIcon, UserIcon, XIcon } from "./icons";
import { cartCount, showToast, useCart } from "./shop-state";

const tab =
  "relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-[color,background-color,transform,opacity] duration-200 focus-visible:ring-primary rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
const idleTab = "text-muted-foreground hover:text-foreground active:scale-95";
const tabIcon = "relative flex h-10 w-10 items-center justify-center rounded-xl transition-[color,background-color,transform,opacity] duration-200";
const glyph = "h-5 w-5 transition-[color,background-color,transform,opacity] duration-200";

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 px-4 py-2 flex-1";

const sheetLinks = [
  { label: "Cart", href: "/cart", Icon: ShoppingCartIcon },
  { label: "Shop", href: "/products", Icon: StoreIcon },
  { label: "Support", href: "/contact", Icon: LifeBuoyIcon },
];

const shopPaths = ["/products", "/categories", "/kits", "/brands", "/collections", "/product-index", "/parts"];

function TabLink({
  href,
  label,
  ariaLabel,
  active,
  Icon,
  badge,
}: {
  href: string;
  label: string;
  ariaLabel: string;
  active: boolean;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: number;
}) {
  return (
    <Link
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={cn(tab, active ? "text-foreground" : idleTab)}
      href={href}
    >
      <div className={cn(tabIcon, active && "bg-primary/10")}>
        <Icon className={cn(glyph, active && "scale-110")} />
        {!!badge && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </div>
      <span className={cn("text-[11px] leading-none font-medium transition-colors", active && "text-foreground")}>{label}</span>
    </Link>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const account = session?.user ?? null;
  const count = cartCount(useCart());
  const inShop = shopPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-50 border-t border-border/80 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        <TabLink href="/" label="Home" ariaLabel="Go to home" active={pathname === "/"} Icon={HouseIcon} />
        <TabLink href="/products" label="Shop" ariaLabel="Shop all products" active={inShop} Icon={StoreIcon} />
        <TabLink href="/contact" label="Support" ariaLabel="Get support" active={pathname === "/contact"} Icon={LifeBuoyIcon} />
        <Dialog.Root>
          <Dialog.Trigger aria-label="Open account menu" className={cn(tab, idleTab)}>
            <div className="relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-200 ring-1 ring-gray-200">
                <UserIcon className="h-5 w-5" />
              </div>
            </div>
            <span className="text-[11px] leading-none font-medium transition-colors">Account</span>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-500 data-[ending-style]:opacity-0 data-[ending-style]:duration-300 data-[starting-style]:opacity-0" />
            <Dialog.Popup className="bg-background fixed inset-x-0 bottom-0 z-50 flex h-auto max-h-[85vh] flex-col gap-4 rounded-t-3xl border-t shadow-lg outline-none transition-transform duration-500 ease-in-out data-[ending-style]:translate-y-full data-[ending-style]:duration-300 data-[starting-style]:translate-y-full">
              <div className="flex flex-col gap-1.5 p-4 pb-4">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-foreground font-semibold text-lg">Account</Dialog.Title>
                  <Dialog.Close
                    aria-label="Close menu"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-8 w-8 rounded-full"
                  >
                    <XIcon className="h-4 w-4" />
                  </Dialog.Close>
                </div>
              </div>
              <div className="mb-4 rounded-xl bg-surface p-4">
                <p className="font-semibold text-foreground">{account ? `Hi, ${account.name.split(" ")[0]}` : "Welcome"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {account ? account.email : "Sign in to track your orders, keep your basket and check out faster."}
                </p>
                <div className="mt-3 flex gap-2">
                  {account ? (
                    <>
                      <Dialog.Close
                        nativeButton={false}
                        render={<Link href="/dashboard" />}
                        className={cn(buttonBase, "bg-primary text-primary-foreground shadow hover:bg-primary/90")}
                      >
                        My account
                      </Dialog.Close>
                      <Dialog.Close
                        onClick={async () => {
                          await authClient.signOut();
                          showToast({ title: "You’ve signed out" });
                          router.push("/");
                          router.refresh();
                        }}
                        className={cn(buttonBase, "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground")}
                      >
                        Sign out
                      </Dialog.Close>
                    </>
                  ) : (
                    <>
                      <Dialog.Close
                        nativeButton={false}
                        render={<Link href="/login" />}
                        className={cn(buttonBase, "bg-primary text-primary-foreground shadow hover:bg-primary/90")}
                      >
                        Sign in
                      </Dialog.Close>
                      <Dialog.Close
                        nativeButton={false}
                        render={<Link href="/signup" />}
                        className={cn(buttonBase, "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground")}
                      >
                        Create account
                      </Dialog.Close>
                    </>
                  )}
                </div>
              </div>
              <div className="max-h-[45vh] space-y-1 overflow-y-auto">
                {sheetLinks.map(({ label, href, Icon }) => (
                  <Dialog.Close
                    key={label}
                    nativeButton={false}
                    render={<Link href={href} />}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors text-foreground/80 hover:bg-muted active:bg-border"
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-left font-medium">{label}</span>
                    {label === "Cart" && count > 0 && <span className="text-sm text-muted-foreground">{count}</span>}
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  </Dialog.Close>
                ))}
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </nav>
  );
}
