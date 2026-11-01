import { Ban, CircleCheck, MessageSquare, Package, Phone } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { withVat } from "@/lib/cctvmaster/money";
import type { CategoryRef, Product } from "@/lib/cctvmaster/types";
import type { DeliverySettings } from "@/lib/settings/schema";
import { cn } from "@/lib/utils";
import { InCartNotice, PurchasePanel } from "./cart-controls";
import type { KitPicker, KitSaving } from "./kit-logic";
import { KitPickers } from "./kit-pickers";
import { ProductPrice } from "./product-price";
import { TrustTiles } from "./trust-tiles";

export type Availability = "in-stock" | "backorder" | "contact" | "discontinued";

export function availabilityOf(p: Product): Availability {
  if (p.isDiscontinued) return "discontinued";
  if (p.isContactSales || p.isCallForPrice) return "contact";
  if (p.availability === "BackOrder" || p.kit?.stockState === "backorder" || p.inStock === false) return "backorder";
  return "in-stock";
}

/** Hard drives can only be checked out alongside a recorder on the source. */
export const needsRecorder = (p: Product) =>
  !p.kit && p.categoryPath?.[0]?.slug === "storage" && /\b(hdd|hard (drive|disk)s?)\b/i.test(p.name);

const badgeBase =
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

function CategoryPills({ path }: { path: CategoryRef[] }) {
  if (!path.length) return null;
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1 sm:mb-3">
      {path.map((c, i) => {
        const last = i === path.length - 1;
        return (
          <span key={c.slug ?? c.name} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground text-xs">›</span>}
            <Link
              href={c.href ?? `/categories/${c.slug}`}
              className={cn(
                badgeBase,
                last
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 border-transparent"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {c.name}
            </Link>
          </span>
        );
      })}
    </div>
  );
}

function StatusBox({ tone, icon, title, text }: { tone: "emerald" | "blue" | "amber" | "gray"; icon: ReactNode; title: string; text?: ReactNode }) {
  const tones = {
    emerald: { box: "from-emerald-50 to-green-100/50", dot: "bg-emerald-100", text: "text-emerald-700" },
    blue: { box: "from-blue-50 to-indigo-100/50", dot: "bg-blue-100", text: "text-blue-700" },
    amber: { box: "from-amber-50 to-orange-100/50", dot: "bg-amber-100", text: "text-amber-800" },
    gray: { box: "from-surface to-muted/60", dot: "bg-border", text: "text-foreground/80" },
  }[tone];
  return (
    <div className={cn("animate-in fade-in zoom-in-95 flex items-center gap-3 rounded-xl bg-gradient-to-r px-4 py-3 duration-500", tones.box)}>
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", tones.dot)}>{icon}</div>
      {text ? (
        <div>
          <p className={cn("font-semibold", tones.text)}>{title}</p>
          <p className={cn("text-sm", tones.text)}>{text}</p>
        </div>
      ) : (
        <p className={cn("font-semibold", tones.text)}>{title}</p>
      )}
    </div>
  );
}

const outlineSmall =
  "inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

/** Right-hand column: category pills, title, price, availability, kit pickers and the basket controls. */
export function BuyBox({
  product,
  saving,
  pickers,
  delivery,
}: {
  product: Product;
  saving?: KitSaving;
  pickers: KitPicker[];
  /** Delivery settings for the trust tiles. */
  delivery: DeliverySettings;
}) {
  const state = availabilityOf(product);
  const isKit = !!product.kit;
  const quoteHref = `/contact?product=${encodeURIComponent(product.slug)}`;
  const leaf = product.categoryPath?.at(-1);
  const price = withVat(product.price);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 min-w-0 space-y-5 delay-100 duration-500 ease-out">
      <div>
        <CategoryPills path={product.categoryPath ?? []} />
        <h1 className="font-sentient mb-2 text-2xl leading-[1.1] font-bold tracking-[-0.02em] text-balance [font-variation-settings:'opsz'_28] sm:text-3xl lg:text-4xl xl:text-[2.75rem]">
          {product.name}
        </h1>
        {product.shortDescription && (
          <p className="text-foreground/70 mt-3 text-sm leading-relaxed whitespace-pre-line sm:text-base">
            {product.shortDescription}
          </p>
        )}
      </div>

      <div className="fc-rise rounded-2xl border border-border bg-gradient-to-br from-surface to-white p-5 [animation-delay:200ms]">
        {state === "contact" ? (
          <p className="text-2xl font-bold">Price on request</p>
        ) : (
          <ProductPrice
            amount={price}
            compareAt={product.compareAtPrice ? withVat(product.compareAtPrice) : undefined}
            className="text-3xl font-bold sm:text-4xl"
          />
        )}
      </div>

      {state === "in-stock" && (
        <StatusBox tone="emerald" icon={<CircleCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />} title="Available" />
      )}
      {state === "backorder" && (
        <StatusBox
          tone="blue"
          icon={<Package className="h-5 w-5 text-blue-600" aria-hidden="true" />}
          title="Available for backorder"
          text={
            isKit
              ? "Add it to your basket — you'll see how long it takes to arrange at checkout"
              : "Add it to your basket or ask us for a quote, and we'll arrange it"
          }
        />
      )}
      {state === "contact" && (
        <StatusBox
          tone="amber"
          icon={<MessageSquare className="h-5 w-5 text-amber-600" aria-hidden="true" />}
          title="Price on request"
          text="Want a price for this one? Get in touch with our sales team."
        />
      )}
      {state === "discontinued" && (
        <StatusBox
          tone="gray"
          icon={<Ban className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
          title="No longer available"
          text="This product has been discontinued."
        />
      )}

      {(state === "in-stock" || state === "backorder") && <InCartNotice slug={product.slug} />}

      <KitPickers saving={saving} pickers={pickers} />

      {state === "in-stock" &&
        (needsRecorder(product) ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-medium">Needs a recorder:</span> you can only check this drive out with a DVR or NVR in
            the same order, so{" "}
            <Link className="font-medium underline underline-offset-2" href="/categories/recorders">
              add a recorder
            </Link>{" "}
            as well, or pick a recorder bundle that already has the drive in it.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-medium">Buying this?</span> Add it to your basket and pay by card at our
            secure checkout. Need a bigger quantity? Just get in touch with Sales.
          </p>
        ))}

      {(state === "in-stock" || state === "backorder") && (
        <PurchasePanel
          item={{ slug: product.slug, name: product.name, sku: product.sku, price: product.price, image: product.images?.[0] }}
        >
          {state === "backorder" && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Available for backorder.</span> You can still order it: pop it in your basket
                and check out as usual. Before you pay, we&apos;ll show you how long it&apos;ll take to arrange. Prefer a
                quote? Ask for one and we&apos;ll sort out delivery with you.
              </p>
              <Link
                href={quoteHref}
                className={cn(outlineSmall, "hover:text-accent-foreground mt-3 border-blue-300 bg-white text-blue-800 hover:bg-blue-100")}
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Request a quote &amp; arrange delivery
              </Link>
            </div>
          )}
        </PurchasePanel>
      )}

      {state === "contact" && (
        <Link href={quoteHref} className={cn(outlineSmall, "bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold")}>
          <Phone className="h-4 w-4" aria-hidden="true" />
          Contact sales for a price
        </Link>
      )}
      {state === "discontinued" && leaf && (
        <Link
          href={leaf.href ?? `/categories/${leaf.slug}`}
          className={cn(outlineSmall, "border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 text-base font-semibold")}
        >
          See other {leaf.name}
        </Link>
      )}

      <TrustTiles delivery={delivery} className="lg:hidden" />
    </div>
  );
}
