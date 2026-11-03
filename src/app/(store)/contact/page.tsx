import { CircleCheck, Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ContactForm } from "@/components/sites/cctvmaster/content/contact-form";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { ContactHero } from "@/components/sites/cctvmaster/content/page-heroes";
import { getProduct } from "@/lib/cctvmaster/catalog";
import type { Product } from "@/lib/cctvmaster/types";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import { addressLine, mapHref, telHref } from "@/lib/settings/format";
import type { StoreSettings } from "@/lib/settings/schema";
import { loadSiteSettings } from "@/lib/settings/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("contact")]);
  if (page) return managedMetadata(page, settings);
  const { store } = settings;
  const ways = [store.phone && `Call ${store.phone}`, store.email && `email ${store.email}`].filter(Boolean).join(" or ");
  const where = [store.address.city, store.address.postcode.split(" ")[0]].filter(Boolean).join(" ");
  return {
    title: "Contact Us: Help Choosing CCTV, Orders & Returns",
    description: `${ways ? `${ways} to reach` : "Contact"} ${store.name}${where ? ` in ${where}` : ""} — help choosing a system, orders, returns and warranty claims.`,
    alternates: { canonical: "/contact" },
  };
}

function Route({ href, label, value, icon, external }: { href: string; label: string; value: string; icon: ReactNode; external?: boolean }) {
  return (
    <li>
      <a
        className="group flex items-center gap-3 rounded-xl border border-border bg-white px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-brand-700 hover:shadow-[0_12px_24px_-16px_rgba(42,120,204,0.3)]"
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
          <p className="truncate text-sm font-semibold text-foreground">{value}</p>
        </div>
      </a>
    </li>
  );
}

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("contact")]);
  // Product pages link here as /contact?product=<slug> to ask for a quote.
  const param = (await searchParams).product;
  const product = getProduct(Array.isArray(param) ? (param[0] ?? "") : (param ?? ""));
  const reach = <ReachUs store={settings.store} product={product} />;
  // A version published in /admin/content/pages replaces the heading and intro; the contact details and form stay.
  if (page) return <ManagedPage page={page} settings={settings} slot={reach} />;
  return (
    <div className="bg-white text-foreground">
      <ContactHero
        title="Get In Touch"
        badge="Avg reply: under 1 hour, weekdays"
        intro={
          <>
            Questions about a product? Need help speccing a system? Talk to a human — we&apos;re happy to help, even if
            you&apos;re just figuring things out.
          </>
        }
      />
      {reach}
    </div>
  );
}

/** Phone, email, address, opening hours and the contact form: stay on the page whichever version of the intro is shown. */
function ReachUs({ store, product }: { store: StoreSettings; product: Product | undefined }) {
  const phoneHref = telHref(store.phone);
  const address = addressLine(store.address);
  const map = mapHref(store);
  const initialMessage = product
    ? `Hi, I'd like a quote for the ${product.name}${product.sku ? ` (SKU ${product.sku})` : ""}. Quantity: 1. Please let me know price and availability.`
    : "";
  return (
    <section className="bg-surface/60 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
          <div className="lg:col-span-2">
            <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-brand-700 uppercase">Reach us</p>
            <h2 className="font-sentient mt-2 text-2xl leading-[1.1] font-bold tracking-tight text-foreground md:text-3xl">
              The fastest routes in.
            </h2>
            <ul className="mt-6 space-y-3">
              {phoneHref && (
                <Route href={phoneHref} label="Call us" value={store.phone} icon={<Phone className="h-4.5 w-4.5" aria-hidden="true" />} />
              )}
              {store.email && (
                <Route href={`mailto:${store.email}`} label="Email us" value={store.email} icon={<Mail className="h-4.5 w-4.5" aria-hidden="true" />} />
              )}
              {address && map && (
                <Route href={map} label="Visit us" value={address} external icon={<MapPin className="h-4.5 w-4.5" aria-hidden="true" />} />
              )}
            </ul>
            {store.openingHours.length > 0 && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
                <div className="flex items-center gap-3 border-b border-border bg-surface/60 px-5 py-3">
                  <Clock className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground">Opening hours</p>
                </div>
                <dl className="divide-y divide-border px-5 py-3 text-sm">
                  {store.openingHours.map((row, i) => (
                    <div key={`${i}-${row.days}`} className="flex items-center justify-between py-2">
                      <dt className="text-muted-foreground">{row.days}</dt>
                      <dd className="font-medium text-foreground">{row.hours}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.18em] text-brand-700 uppercase">
              <CircleCheck className="h-3 w-3" aria-hidden="true" />
              We answer messages in &lt; 1 hour
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_40px_-22px_rgba(0,0,0,0.25)]">
              <div className="border-b border-border bg-surface/60 px-6 py-4 sm:px-8">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {product ? "Request a quote" : "Send a message"}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {product
                    ? `Asking about: ${product.name}`
                    : "Fill in the form and someone from our team will reply as soon as they can."}
                </p>
              </div>
              <div className="p-6 sm:p-8">
                <ContactForm
                  key={product?.slug ?? "general"}
                  initialSubject={product ? "product" : ""}
                  initialMessage={initialMessage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
