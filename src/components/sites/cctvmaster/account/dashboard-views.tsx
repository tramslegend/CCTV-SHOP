"use client";

import {
  ArrowRight,
  Bell,
  BellOff,
  Calculator,
  ChevronRight,
  CircleCheck,
  Heart,
  LoaderCircle,
  MailCheck,
  MapPin,
  Package,
  PackageCheck,
  PackageX,
  Pencil,
  Plus,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Star,
  Trash2,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { deleteAddress, saveAddress, setDefaultAddress, updateProfile } from "@/app/(store)/dashboard/actions";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/local-store";
import { formatGBP, withVat } from "@/lib/cctvmaster/money";
import type { ReceiptOrder } from "@/lib/orders/receipt";
import { cn } from "@/lib/utils";
import { addToCart, cartStore, showToast, toggleWishlist, useCart, useWishlist } from "../shop-state";
import { markNotificationsRead, useReadNotifications } from "./account-store";
import { AddressFields, emptyAddress, validateAddress, type AddressErrors, type AddressMode, type AddressValue } from "./address-fields";
import { PhoneInput } from "../phone-input";
import { PasswordInput } from "./auth-forms";
import { DashHeader, useDashboardSignOut } from "./dashboard-shell";
import { OrderLines, OrderTotals, StatusBadge, deliveryAddressLines, formatDate, orderUnits } from "./order-bits";
import { ProductThumb } from "./product-thumb";
import { emeraldButton, formAlert, outlineButton, panel } from "./styles";
import { basketTotals } from "./totals";
import { PHONE_INVALID, authErrorMessage, firstName, normalisePhone, passwordProblem } from "./validation";

const itemsText = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;

export interface DashboardAccount {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  createdAt: string;
  emailVerified: boolean;
}

export type DashboardOrder = ReceiptOrder & { timeline?: { id: number; type: string; at: string }[] };

export interface DashboardNotification {
  id: string;
  orderNumber: string;
  type: string;
  title: string;
  body: string;
  at: string;
}

export interface DashboardAddress {
  id: number;
  label?: string;
  name: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  phone?: string;
  isDefault: boolean;
}

function EmptyState({
  Icon,
  title,
  body,
  action,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn(panel, "px-6 py-12 text-center")}>
      <div className="bg-muted mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground h-8 w-8" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

const textLink = "text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline underline-offset-2";

function OrderRow({ order }: { order: DashboardOrder }) {
  return (
    <li>
      <Link
        href={`/dashboard/orders/${order.number}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-surface sm:flex-nowrap"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-wide text-foreground tabular-nums">{order.number}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(order.placedAt)} · {itemsText(orderUnits(order))}
          </p>
        </div>
        <div className="flex -space-x-2">
          {order.items.slice(0, 3).map((line) => (
            <ProductThumb
              key={line.id}
              src={line.image}
              alt=""
              sizes="40px"
              className="h-10 w-10 rounded-md border border-border ring-2 ring-white"
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <span className="w-20 text-right text-sm font-semibold text-foreground tabular-nums">{formatGBP(order.figures.total)}</span>
          <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
        </div>
      </Link>
    </li>
  );
}

/** "Confirm your email" prompt: guest orders under the address appear once it's confirmed. */
export function VerifyEmailNotice({ email, unclaimed }: { email: string; unclaimed: number }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const send = async () => {
    setState("sending");
    const { error: failed } = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard/orders?verified=1" });
    if (failed) {
      setError(authErrorMessage(failed, "We couldn’t send the email. Please try again."));
      setState("error");
    } else setState("sent");
  };
  return (
    <div className="mb-6 flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {unclaimed > 0
            ? `${itemsText(unclaimed).replace("item", "earlier order")} placed with ${email}`
            : "Please confirm your email"}
        </p>
        <p className="mt-0.5">
          {unclaimed > 0
            ? "Confirm it’s your email and those orders will show here too."
            : "We sent a confirmation link when you signed up. Confirming lets earlier guest orders show in your account."}
        </p>
        {state === "sent" && <p className="mt-1 font-medium text-brand-800">Sent. Check your inbox for the link.</p>}
        {state === "error" && <p className="mt-1 font-medium text-red-700">{error}</p>}
      </div>
      <button type="button" onClick={send} disabled={state === "sending" || state === "sent"} className={cn(outlineButton, "h-9 px-3")}>
        {state === "sending" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {state === "sent" ? "Link sent" : "Send confirmation link"}
      </button>
    </div>
  );
}

// ---------- /dashboard ----------

export function DashboardOverview({
  account,
  recent,
  orderCount,
  unclaimed,
}: {
  account: DashboardAccount;
  recent: DashboardOrder[];
  orderCount: number;
  unclaimed: number;
}) {
  const hydrated = useHydrated();
  const wishlist = useWishlist();
  const cart = useCart();
  const basket = basketTotals(cart);
  const since = new Date(account.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" });

  const stats = [
    { label: "Orders", value: String(orderCount), href: "/dashboard/orders", Icon: Package },
    { label: "Saved items", value: hydrated ? String(wishlist.length) : "–", href: "/dashboard/wishlist", Icon: Heart },
    {
      label: "In your basket",
      value: !hydrated ? "–" : basket.count ? formatGBP(basket.total) : "Empty",
      note: hydrated && basket.count ? itemsText(basket.count) : undefined,
      href: "/cart",
      Icon: ShoppingCart,
    },
  ];

  const quick: { href: string; title: string; body: string; Icon: LucideIcon }[] = [
    { href: "/dashboard/orders", title: "Track an order", body: "See where each order is up to.", Icon: Truck },
    { href: "/dashboard/wishlist", title: "Saved items", body: "Products you’ve hearted.", Icon: Heart },
    { href: "/dashboard/notifications", title: "Notifications", body: "Order updates in one place.", Icon: Bell },
    { href: "/dashboard/settings", title: "Account details", body: "Name, phone, company and password.", Icon: Settings },
    { href: "/tools/cctv-storage-calculator", title: "Storage calculator", body: "Size the hard drive for a recorder.", Icon: Calculator },
    { href: "/kit-builder", title: "Kit builder", body: "Put together a complete system.", Icon: Wrench },
  ];

  return (
    <>
      <DashHeader
        kicker="My account"
        title={`Hi, ${firstName(account)}`}
        lede={
          <>
            Signed in as <span className="font-medium text-foreground/80">{account.email}</span> · Member since {since}
          </>
        }
      />
      {!account.emailVerified && unclaimed > 0 && <VerifyEmailNotice email={account.email} unclaimed={unclaimed} />}
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, note, href, Icon }) => (
          <Link key={label} href={href} className={cn(panel, "group flex items-start justify-between gap-3 p-5 hover:border-zinc-300")}>
            <div>
              <p className="font-mono text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
              {note && <p className="text-xs text-muted-foreground">{note}</p>}
            </div>
            <Icon className="h-5 w-5 text-brand-700" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <section className={cn(panel, "mt-6")} aria-labelledby="recent-orders">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="recent-orders" className="text-base font-semibold text-foreground">
            Recent orders
          </h2>
          {orderCount > 0 && (
            <Link href="/dashboard/orders" className={textLink}>
              View all
            </Link>
          )}
        </div>
        {recent.length ? (
          <ul className="divide-y divide-border">
            {recent.map((order) => (
              <OrderRow key={order.number} order={order} />
            ))}
          </ul>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No orders yet. When you check out, your orders show up here.</p>
            <Link href="/products" className={cn(emeraldButton, "mt-4")}>
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Start shopping
            </Link>
          </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="quick-links">
        <h2 id="quick-links" className="mb-3 text-base font-semibold text-foreground">
          Quick links
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quick.map(({ href, title, body, Icon }) => (
            <li key={href}>
              <Link href={href} className={cn(panel, "flex h-full items-start gap-3 p-4 transition-colors hover:border-zinc-300")}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{title}</span>
                  <span className="block text-xs text-muted-foreground">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

// ---------- /dashboard/orders ----------

export function OrdersList({
  orders,
  account,
  unclaimed,
  justVerified,
}: {
  orders: DashboardOrder[];
  account: DashboardAccount;
  unclaimed: number;
  justVerified: boolean;
}) {
  return (
    <>
      <DashHeader kicker="My account" title="Your orders" lede="Every order on your account, newest first." />
      {justVerified && account.emailVerified && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm font-medium text-brand-900">
          <CircleCheck className="h-5 w-5 text-brand-700" aria-hidden="true" />
          Thanks, your email is confirmed. Orders placed with it now show here.
        </p>
      )}
      {!account.emailVerified && <VerifyEmailNotice email={account.email} unclaimed={unclaimed} />}
      {orders.length ? (
        <section className={panel} aria-label="Orders">
          <div className="hidden grid-cols-[1fr_auto] border-b border-border px-5 py-3 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase sm:grid">
            <span>Order</span>
            <span>Status · Total</span>
          </div>
          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <OrderRow key={order.number} order={order} />
            ))}
          </ul>
        </section>
      ) : (
        <EmptyState
          Icon={Package}
          title="No orders yet"
          body="When you check out, your orders and their delivery progress show up here."
          action={
            <Link href="/products" className={emeraldButton}>
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Start shopping
            </Link>
          }
        />
      )}
    </>
  );
}

// ---------- /dashboard/orders/[id] ----------

const progress: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "paid", label: "Order placed", Icon: CircleCheck },
  { key: "processing", label: "Being packed", Icon: Package },
  { key: "dispatched", label: "Dispatched", Icon: Truck },
  { key: "delivered", label: "Delivered", Icon: PackageCheck },
];

export function OrderDetail({ order, collectFrom = null }: { order: DashboardOrder; /** Click & collect: where to collect. */ collectFrom?: string | null }) {
  const closed = order.status === "cancelled" || order.status === "refunded";
  const reached = progress.findIndex((p) => p.key === order.status);
  const billing = order.billing;
  const when = (type: string) => order.timeline?.find((e) => e.type === type)?.at;

  const buyAgain = () => {
    cartStore.set((lines) => {
      const next = [...lines];
      for (const line of order.items) {
        if (!line.slug) continue;
        const existing = next.findIndex((l) => l.slug === line.slug);
        if (existing >= 0) next[existing] = { ...next[existing], qty: Math.min(999, next[existing].qty + line.qty) };
        else next.push({ slug: line.slug, name: line.name, sku: line.sku, price: line.unitPrice, image: line.image, qty: line.qty });
      }
      return next;
    });
    showToast({
      title: `Added ${itemsText(orderUnits(order))} from ${order.number} to your basket`,
      action: { label: "View basket", href: "/cart" },
    });
  };

  return (
    <>
      <Link href="/dashboard/orders" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-brand-700">
        ← Your orders
      </Link>
      <DashHeader
        kicker="Order details"
        title={`Order ${order.number}`}
        lede={`Placed ${formatDate(order.placedAt, true)} · ${itemsText(orderUnits(order))}`}
        action={<StatusBadge status={order.status} />}
      />

      <section className={cn(panel, "p-5")} aria-label="Order progress">
        {closed ? (
          <div className="flex items-start gap-3 text-sm text-foreground/80">
            <PackageX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
            <p>
              {order.status === "cancelled" ? "This order was cancelled." : "This order has been refunded."}
              {order.refunded > 0 && ` We refunded ${formatGBP(order.refunded)} to your original payment method.`}
            </p>
          </div>
        ) : (
          <>
            <ol className="grid grid-cols-4 gap-2">
              {progress.map(({ key, label, Icon }, i) => {
                const done = i <= reached;
                const at = key === "paid" ? order.paidAt : when(key);
                return (
                  <li key={key} className="flex flex-col items-center gap-2 text-center">
                    <span
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-full border",
                        done ? "border-brand-700 bg-brand-700 text-white" : "border-border bg-white text-zinc-400",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className={cn("text-xs font-medium", done ? "text-foreground" : "text-zinc-400")}>{label}</span>
                    {done && at && <span className="text-[11px] text-muted-foreground">{formatDate(at)}</span>}
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
              {order.status === "paid" || order.status === "processing" ? (
                "We’re picking and packing this order. The tracking number arrives by email once it leaves us."
              ) : order.status === "dispatched" ? (
                <>
                  This order is on its way{order.carrier ? ` with ${order.carrier}` : ""}.
                  {order.trackingNumber && (
                    <>
                      {" "}
                      Tracking number{" "}
                      {order.trackingUrl ? (
                        <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline underline-offset-2">
                          {order.trackingNumber}
                        </a>
                      ) : (
                        <span className="font-semibold">{order.trackingNumber}</span>
                      )}
                      .
                    </>
                  )}
                </>
              ) : (
                "This order has been delivered."
              )}
            </p>
          </>
        )}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className={cn(panel, "h-fit")} aria-labelledby="order-items">
          <div className="border-b border-border px-5 py-4">
            <h2 id="order-items" className="text-base font-semibold text-foreground">
              Items
            </h2>
          </div>
          <div className="px-5">
            <OrderLines order={order} />
          </div>
          <div className="border-t border-border px-5 py-4">
            <OrderTotals order={order} />
          </div>
        </section>

        <div className="space-y-6">
          <section className={cn(panel, "p-5 text-sm")} aria-labelledby="order-address">
            {collectFrom && (
              <>
                <h2 className="font-semibold text-foreground">Collect from</h2>
                <p className="mt-1 mb-4 leading-6 text-foreground/80">{collectFrom}</p>
              </>
            )}
            <h2 id="order-address" className="font-semibold text-foreground">
              {collectFrom ? "Your address" : "Delivering to"}
            </h2>
            <p className="mt-1 leading-6 text-foreground/80">
              {deliveryAddressLines(order).map((line, i) => (
                // Two address lines can read the same, so the key includes the position.
                <span key={`${i}-${line}`} className="block">
                  {line}
                </span>
              ))}
            </p>
            <h3 className="mt-4 font-semibold text-foreground">Billing address</h3>
            <p className="mt-1 text-foreground/80">
              {billing
                ? [billing.line1, billing.line2, billing.city, billing.county, billing.postcode].filter(Boolean).join(", ")
                : "Same as delivery"}
            </p>
            <h3 className="mt-4 font-semibold text-foreground">Contact</h3>
            <p className="mt-1 break-words text-foreground/80">
              {order.email}
              {order.phone ? ` · ${order.phone}` : ""}
              {order.shipping.company ? ` · ${order.shipping.company}` : ""}
            </p>
            <h3 className="mt-4 font-semibold text-foreground">{collectFrom ? "Collection" : "Delivery"}</h3>
            <p className="mt-1 text-foreground/80">
              {order.deliveryMethod} ({order.figures.deliveryIncVat === 0 ? "free" : formatGBP(order.figures.deliveryIncVat)})
            </p>
          </section>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={buyAgain} className={emeraldButton}>
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Buy again
            </button>
            <Link href="/contact" className={outlineButton}>
              Get help with this order
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------- /dashboard/wishlist ----------

export function WishlistView() {
  const hydrated = useHydrated();
  const items = useWishlist();
  if (!hydrated) return <div className="min-h-[40vh]" aria-busy="true" />;
  return (
    <>
      <DashHeader
        kicker="My account"
        title="Wishlist"
        lede={items.length ? `${itemsText(items.length)} saved for later.` : "Products you save appear here."}
      />
      {items.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, i) => (
            <li key={item.slug} className={cn(panel, "flex flex-col overflow-hidden")}>
              <Link href={`/products/${item.slug}`} className="block border-b border-border">
                <ProductThumb src={item.image} alt={item.name} sizes="(min-width: 1280px) 280px, (min-width: 640px) 45vw, 90vw" className="aspect-[4/3] w-full" eager={i < 3} />
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <Link href={`/products/${item.slug}`} className="line-clamp-2 text-sm font-medium text-foreground hover:text-brand-700">
                  {item.name}
                </Link>
                <p className="mt-2 text-lg font-bold text-[#185096]">
                  {formatGBP(withVat(item.price))}
                  <span className="text-muted-foreground ml-1 text-xs font-medium">inc. VAT</span>
                </p>
                <div className="mt-auto flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => addToCart({ slug: item.slug, name: item.name, price: item.price, image: item.image })}
                    className={cn(emeraldButton, "h-10 flex-1 px-3")}
                  >
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    Add to basket
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(item)}
                    aria-label={`Remove ${item.name} from your wishlist`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          Icon={Heart}
          title="Your wishlist is empty"
          body="Tap the heart on any product to save it here for later."
          action={
            <Link href="/products" className={emeraldButton}>
              Browse products
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
      )}
    </>
  );
}

// ---------- /dashboard/notifications ----------

export function NotificationsView({ notes }: { notes: DashboardNotification[] }) {
  const hydrated = useHydrated();
  const read = useReadNotifications();
  const isUnread = (id: string) => hydrated && !read.includes(id);
  const unread = notes.filter((n) => isUnread(n.id));

  return (
    <>
      <DashHeader
        kicker="My account"
        title="Notifications"
        lede={notes.length ? `${unread.length} unread` : undefined}
        action={
          unread.length > 0 ? (
            <button type="button" onClick={() => markNotificationsRead(unread.map((n) => n.id))} className={outlineButton}>
              Mark all as read
            </button>
          ) : undefined
        }
      />
      {notes.length ? (
        <section className={panel} aria-label="Notifications">
          <ul className="divide-y divide-border">
            {notes.map((n) => {
              const fresh = isUnread(n.id);
              const Icon = n.type === "dispatched" ? Truck : n.type === "delivered" ? PackageCheck : n.type === "cancelled" ? PackageX : Package;
              return (
                <li key={n.id}>
                  <Link
                    href={`/dashboard/orders/${n.orderNumber}`}
                    onClick={() => markNotificationsRead([n.id])}
                    className={cn("flex gap-3 px-5 py-4 transition-colors hover:bg-surface", fresh && "bg-brand-50/40")}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={cn("text-sm text-foreground", fresh ? "font-semibold" : "font-medium")}>{n.title}</span>
                        {fresh && (
                          <span className="h-2 w-2 rounded-full bg-brand-600">
                            <span className="sr-only">Unread</span>
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                      <span className="mt-1 block text-xs text-zinc-400">{formatDate(n.at, true)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <EmptyState
          Icon={BellOff}
          title="No notifications yet"
          body="Order updates appear here once you’ve placed an order."
          action={
            <Link href="/products" className={emeraldButton}>
              Start shopping
            </Link>
          }
        />
      )}
    </>
  );
}

// ---------- /dashboard/addresses ----------

const fieldInput =
  "h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-foreground placeholder:text-zinc-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 aria-[invalid=true]:border-red-600 md:text-sm";
const fieldLabel = "mb-1 block text-sm font-medium text-foreground/80";

export function AddressesView({ addresses }: { addresses: DashboardAddress[] }) {
  const [editing, setEditing] = useState<DashboardAddress | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = (action: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      showToast({ title: result.ok ? (result.message ?? "Saved") : (result.error ?? "Something went wrong") });
      router.refresh();
    });

  return (
    <>
      <DashHeader
        kicker="My account"
        title="Addresses"
        lede="Saved delivery addresses. Your default fills in at checkout."
        action={
          editing === null ? (
            <button type="button" onClick={() => setEditing("new")} className={emeraldButton}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add an address
            </button>
          ) : undefined
        }
      />
      {editing !== null && (
        <AddressForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
      {addresses.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className={cn(panel, "flex flex-col p-5 text-sm")}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  {a.label || "Address"}
                </span>
                {a.isDefault && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-brand-800 uppercase">
                    Default
                  </span>
                )}
              </div>
              <p className="leading-6 text-foreground/80">
                {[a.name, a.company, a.line1, a.line2, a.city, a.county, a.postcode].filter(Boolean).map((line, i) => (
                  <span key={`${i}-${line}`} className="block">
                    {line}
                  </span>
                ))}
              </p>
              {a.phone && <p className="mt-1 text-muted-foreground">{a.phone}</p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <button type="button" onClick={() => setEditing(a)} disabled={pending} className={cn(outlineButton, "h-9 px-3")}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                {!a.isDefault && (
                  <button type="button" onClick={() => run(() => setDefaultAddress(a.id))} disabled={pending} className={cn(outlineButton, "h-9 px-3")}>
                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                    Make default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Remove this address?")) run(() => deleteAddress(a.id));
                  }}
                  disabled={pending}
                  aria-label={`Remove address ${a.line1}`}
                  className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        editing === null && (
          <EmptyState
            Icon={MapPin}
            title="No saved addresses"
            body="Add an address here, or tick “Save this address” at checkout."
            action={
              <button type="button" onClick={() => setEditing("new")} className={emeraldButton}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add an address
              </button>
            }
          />
        )
      )}
    </>
  );
}

function AddressForm({ initial, onDone }: { initial: DashboardAddress | null; onDone: () => void }) {
  const [meta, setMeta] = useState({
    label: initial?.label ?? "",
    name: initial?.name ?? "",
    company: initial?.company ?? "",
    phone: initial?.phone ?? "",
    isDefault: initial?.isDefault ?? false,
  });
  const [value, setValue] = useState<AddressValue>(
    initial
      ? { line1: initial.line1, line2: initial.line2 ?? "", city: initial.city, county: initial.county ?? "", postcode: initial.postcode }
      : emptyAddress,
  );
  const [mode, setMode] = useState<AddressMode>(initial ? "manual" : "find");
  const [errors, setErrors] = useState<AddressErrors & { name?: string; phone?: string }>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found: AddressErrors & { name?: string; phone?: string } = validateAddress(value);
    if (meta.name.trim().length < 2) found.name = "Please enter the recipient’s name.";
    if (meta.phone.trim() && !normalisePhone(meta.phone)) found.phone = PHONE_INVALID;
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      if (found.line1 || found.city || found.postcode) setMode("manual");
      return;
    }
    setBusy(true);
    setFormError("");
    const result = await saveAddress(initial?.id ?? null, {
      label: meta.label || undefined,
      name: meta.name,
      company: meta.company || undefined,
      phone: meta.phone || undefined,
      isDefault: meta.isDefault,
      line1: value.line1,
      line2: value.line2 || undefined,
      city: value.city,
      county: value.county || undefined,
      postcode: value.postcode,
    });
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      if (result.fieldErrors) setErrors(result.fieldErrors);
      return;
    }
    showToast({ title: result.message });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className={cn(panel, "mb-6 space-y-4 p-5 sm:p-6")} aria-label={initial ? "Edit address" : "New address"}>
      <h2 className="text-base font-semibold text-foreground">{initial ? "Edit address" : "New address"}</h2>
      {formError && (
        <p role="alert" className={formAlert}>
          {formError}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="addr-name" className={fieldLabel}>
            Recipient name
          </label>
          <input
            id="addr-name"
            autoComplete="name"
            value={meta.name}
            onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
            className={fieldInput}
            aria-invalid={errors.name ? true : undefined}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="addr-label" className={fieldLabel}>
            Nickname <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="addr-label"
            placeholder="e.g. Office"
            value={meta.label}
            onChange={(e) => setMeta((m) => ({ ...m, label: e.target.value }))}
            className={fieldInput}
          />
        </div>
        <div>
          <label htmlFor="addr-company" className={fieldLabel}>
            Company <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="addr-company"
            autoComplete="organization"
            value={meta.company}
            onChange={(e) => setMeta((m) => ({ ...m, company: e.target.value }))}
            className={fieldInput}
          />
        </div>
        <div>
          <label htmlFor="addr-phone" className={fieldLabel}>
            Phone <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <PhoneInput
            id="addr-phone"
            autoComplete="tel"
            value={meta.phone}
            onChange={(v) => setMeta((m) => ({ ...m, phone: v }))}
            aria-invalid={errors.phone ? true : undefined}
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
        </div>
      </div>
      <AddressFields
        idPrefix="addr"
        value={value}
        onChange={(patch) => {
          setValue((a) => ({ ...a, ...patch }));
          setErrors((er) => {
            const next = { ...er };
            for (const key of Object.keys(patch)) delete next[key as keyof AddressErrors];
            return next;
          });
        }}
        errors={errors}
        mode={mode}
        onModeChange={setMode}
      />
      <label className="flex items-center gap-2 text-sm text-foreground/80">
        <input
          type="checkbox"
          checked={meta.isDefault}
          onChange={(e) => setMeta((m) => ({ ...m, isDefault: e.target.checked }))}
          className="h-4 w-4 rounded border-zinc-300 accent-brand-700"
        />
        Use as my default delivery address
      </label>
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <button type="button" onClick={onDone} className={outlineButton}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className={emeraldButton}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {initial ? "Save changes" : "Save address"}
        </button>
      </div>
    </form>
  );
}

// ---------- /dashboard/settings ----------

type SettingsField = "name" | "phone" | "company";

export function SettingsForm({ account }: { account: DashboardAccount }) {
  const leave = useDashboardSignOut();
  return (
    <>
      <DashHeader kicker="My account" title="Account details" lede="Used to fill in checkout and on your invoices." />
      <AccountDetailsForm account={account} />
      <PasswordForm />
      <section className={cn(panel, "mt-6 flex flex-wrap items-center justify-between gap-4 p-5")} aria-labelledby="signout-title">
        <div>
          <h2 id="signout-title" className="text-base font-semibold text-foreground">
            Sign out
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Your basket and wishlist stay in this browser.</p>
        </div>
        <button type="button" onClick={leave} className={outlineButton}>
          Sign out
        </button>
      </section>
    </>
  );
}

function AccountDetailsForm({ account }: { account: DashboardAccount }) {
  const router = useRouter();
  const [values, setValues] = useState({ name: account.name, phone: account.phone ?? "", company: account.company ?? "" });
  const [errors, setErrors] = useState<Partial<Record<SettingsField, string>>>({});
  const [busy, setBusy] = useState(false);

  const set = (field: SettingsField, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found: Partial<Record<SettingsField, string>> = {};
    if (values.name.trim().length < 2) found.name = "Please enter your name";
    if (values.phone.trim() && !normalisePhone(values.phone)) found.phone = PHONE_INVALID;
    setErrors(found);
    const first = (["name", "phone"] as const).find((f) => found[f]);
    if (first) {
      document.getElementById(`account-${first}`)?.focus();
      return;
    }
    setBusy(true);
    const result = await updateProfile(values);
    setBusy(false);
    if (!result.ok) {
      setErrors((result.fieldErrors ?? {}) as Partial<Record<SettingsField, string>>);
      showToast({ title: result.error });
      return;
    }
    showToast({ title: result.message });
    router.refresh();
  }

  const error = (field: SettingsField) =>
    errors[field] ? (
      <p id={`account-${field}-error`} className="mt-1 text-sm text-red-600">
        {errors[field]}
      </p>
    ) : null;
  const aria = (field: SettingsField) => ({
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `account-${field}-error` : undefined,
  });

  return (
    <form onSubmit={save} noValidate className={cn(panel, "space-y-4 p-5 sm:p-6")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="account-name" className={fieldLabel}>
            Full name
          </label>
          <input id="account-name" autoComplete="name" value={values.name} onChange={(e) => set("name", e.target.value)} className={fieldInput} {...aria("name")} />
          {error("name")}
        </div>
        <div>
          <label htmlFor="account-email" className={fieldLabel}>
            Email
          </label>
          <input id="account-email" type="email" value={account.email} readOnly className={cn(fieldInput, "bg-surface text-muted-foreground")} aria-describedby="account-email-note" />
          <p id="account-email-note" className="mt-1 text-xs text-muted-foreground">
            {account.emailVerified ? "Confirmed." : "Not confirmed yet."} To change it,{" "}
            <Link href="/contact" className="font-semibold text-brand-700 underline underline-offset-2">
              contact us
            </Link>
            .
          </p>
        </div>
        <div>
          <label htmlFor="account-phone" className={fieldLabel}>
            Phone <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <PhoneInput
            id="account-phone"
            autoComplete="tel"
            value={values.phone}
            onChange={(v) => set("phone", v)}
            {...aria("phone")}
          />
          {error("phone")}
        </div>
        <div>
          <label htmlFor="account-company" className={fieldLabel}>
            Company <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="account-company"
            autoComplete="organization"
            placeholder="Printed on your invoice"
            value={values.company}
            onChange={(e) => set("company", e.target.value)}
            className={fieldInput}
            {...aria("company")}
          />
          {error("company")}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">Member since {formatDate(account.createdAt)}</p>
        <button type="submit" disabled={busy} className={emeraldButton}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save changes
        </button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return setError("Enter your current password");
    const problem = passwordProblem(next);
    if (problem) return setError(problem);
    if (next === current) return setError("Choose a password you haven’t used here before");
    setError("");
    setBusy(true);
    const { error: failed } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setBusy(false);
    if (failed) return setError(authErrorMessage(failed, "We couldn’t change your password. Please try again."));
    setCurrent("");
    setNext("");
    showToast({ title: "Password changed", description: "Other devices have been signed out." });
  }

  return (
    <form onSubmit={submit} noValidate className={cn(panel, "mt-6 space-y-4 p-5 sm:p-6")} aria-labelledby="security-title">
      <div>
        <h2 id="security-title" className="text-base font-semibold text-foreground">
          Password
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">At least 10 characters with upper and lower case letters, a number and a symbol.</p>
      </div>
      {error && (
        <p role="alert" className={formAlert}>
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="account-current-password" className={fieldLabel}>
            Current password
          </label>
          <PasswordInput id="account-current-password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label htmlFor="account-new-password" className={fieldLabel}>
            New password
          </label>
          <PasswordInput id="account-new-password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end border-t border-border pt-4">
        <button type="submit" disabled={busy} className={emeraldButton}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Change password
        </button>
      </div>
    </form>
  );
}
