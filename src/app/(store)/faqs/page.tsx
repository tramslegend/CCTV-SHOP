import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { CONTAINER, HelpHero } from "@/components/sites/cctvmaster/content/page-parts";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import { VAT_RATE } from "@/lib/cctvmaster/money";
import { addressLine, deliveryFacts, vatPercent } from "@/lib/settings/format";
import type { ShopSettings } from "@/lib/settings/schema";
import { loadSiteSettings } from "@/lib/settings/storefront";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("faqs");
  if (page) return managedMetadata(page, await loadSiteSettings());
  return {
    title: "Frequently Asked Questions",
    description: "Quick answers about ordering, delivery, returns and whether parts work together.",
    alternates: { canonical: "/faqs" },
  };
}

interface Faq {
  q: string;
  a: string;
  link?: { href: string; label: string };
}

// Questions and groups as on the source; answers are short and built from the shop's facts in Settings.
const groupsFor = ({ store, delivery }: ShopSettings): { title: string; items: Faq[] }[] => {
  const d = deliveryFacts(delivery);
  const address = addressLine(store.address);
  return [
  {
    title: "Ordering & paying",
    items: [
      {
        q: "Do I have to open an account?",
        a: "No — guest checkout works. An account is optional and simply lets you track orders, download invoices and reorder quickly.",
      },
      {
        q: "How can I pay?",
        a: "By any major debit or credit card (Visa, Mastercard or Amex) through our secure checkout. Payment is taken when the order is placed.",
      },
      {
        q: "Do your prices include VAT?",
        a: `Yes. Prices on the site include UK VAT at ${vatPercent(VAT_RATE)}%, and checkout itemises the VAT before you pay.`,
      },
    ],
  },
  {
    title: "Delivery & collection",
    items: [
      {
        q: "How much will delivery be, and when does my order go out?",
        a: `${d.alwaysFree ? "UK delivery is free on every order" : `UK delivery is ${d.fee} per order and free from ${d.freeFrom} (VAT included)`}. In-stock orders placed before ${d.cutoff}, Monday to Friday, are dispatched the same working day.`,
        link: { href: "/delivery", label: "Delivery costs and cut-off" },
      },
      {
        q: "Can I pick my order up?",
        a: `Yes, from our counter${address ? ` on ${address}` : ""}. Order online, then ${store.phone ? `call ${store.phone}` : "contact us"} so we can confirm it’s ready before you travel.`,
        link: { href: "/delivery", label: "Where to collect from" },
      },
    ],
  },
  {
    title: "Returns & warranty",
    items: [
      {
        q: "Can I send something back?",
        a: "Yes. As a consumer you can cancel most online orders within 14 days of delivery, and you have separate rights if an item is faulty.",
        link: { href: "/returns", label: "Returns & refunds" },
      },
      {
        q: "What if something’s faulty?",
        a: "Send us your order number and a short description of the fault. Under the Consumer Rights Act 2015 you’re entitled to a repair, replacement or refund, depending on when the fault appears.",
        link: { href: "/contact", label: "Get in touch" },
      },
      {
        q: "Is there a warranty?",
        a: "Warranty cover depends on the product and manufacturer, so check the product page. Your statutory rights apply either way.",
      },
    ],
  },
  {
    title: "Will it work together?",
    items: [
      {
        q: "Will this camera work with the recorder I already have?",
        a: "It depends on whether your system is IP or analogue HD, and on the brand. Send us your recorder’s model number and we’ll confirm before you buy.",
        link: { href: "/contact", label: "Ask us to check" },
      },
      {
        q: "Do you sell complete kits?",
        a: "Yes — matched sets of recorder, cameras and cabling, sold alongside the individual parts.",
        link: { href: "/products", label: "Browse products" },
      },
    ],
  },
  ];
};

const linkCls = "font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800";

export default async function FaqsPage() {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("faqs")]);
  // A version published in /admin/content/pages replaces the built-in page below.
  if (page) return <ManagedPage page={page} settings={settings} />;
  const groups = groupsFor(settings);
  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-950">
      <HelpHero
        kicker="Help · UK"
        title="Frequently asked questions"
        intro="Quick answers on ordering, delivery, returns and whether things work together."
      />
      <section className="py-12 sm:py-16">
        <div className={CONTAINER}>
          <div className="mx-auto flex max-w-3xl flex-col gap-12">
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="mb-5 text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">{group.title}</h2>
                <div className="flex flex-col gap-6">
                  {group.items.map((item) => (
                    <details key={item.q} open className="group border-b border-zinc-200 pb-5">
                      <summary className="mb-2 flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-zinc-950 [&::-webkit-details-marker]:hidden">
                        <span>{item.q}</span>
                        <ChevronDown
                          className={cn("mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180")}
                          aria-hidden="true"
                        />
                      </summary>
                      <p className="text-sm leading-relaxed text-zinc-600">
                        {item.a}
                        {item.link ? (
                          <>
                            {" "}
                            <Link className={linkCls} href={item.link.href}>
                              {item.link.label}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-sm text-zinc-600">
              Can’t find it?{" "}
              <Link className={linkCls} href="/contact">
                Contact support
              </Link>{" "}
              — real engineers, UK hours.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
