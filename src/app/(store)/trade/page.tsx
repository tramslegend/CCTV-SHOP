import { Building2, FileText, Receipt, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { TradeHero } from "@/components/sites/cctvmaster/content/page-heroes";
import { article, CONTAINER, QaList } from "@/components/sites/cctvmaster/content/page-parts";
import { TradeForm } from "@/components/sites/cctvmaster/content/trade-form";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import { telHref } from "@/lib/settings/format";
import type { StoreSettings } from "@/lib/settings/schema";
import { loadSiteSettings } from "@/lib/settings/storefront";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("trade")]);
  if (page) return managedMetadata(page, settings);
  const { store } = settings;
  return {
    title: "CCTV Trade Prices UK: Same Public Cost, Trade Perks Added",
    description: `${store.name} keeps one public price for everyone, so there's no separate trade price list to unlock.`,
    alternates: { canonical: "/trade" },
  };
}

/** "call 020 … or email …", "call 020 …", "email …" or "contact us", from the details set in Settings. */
const reachUs = (store: StoreSettings, joiner = " or ") =>
  [store.phone && `call ${store.phone}`, store.email && `email ${store.email}`].filter(Boolean).join(joiner) || "contact us";

const benefits = [
  {
    icon: FileText,
    title: "Quotes for whole jobs",
    body: "Send a spec or drawing and get the whole job priced on one schedule, held for 30 days.",
  },
  {
    icon: Receipt,
    title: "Purchase orders and VAT invoices",
    body: "Order against your PO number and receive a full VAT invoice, without paying by card each time.",
  },
  {
    icon: UserCheck,
    title: "Someone who knows you",
    body: "One named contact who knows your jobs, on the phone or by email every working day.",
  },
  {
    icon: Building2,
    title: "Stock checked before you set off",
    body: "We check the actual shelf, not just the website, before you travel to collect.",
  },
];

// Headings and questions follow the source; the copy is short and written for this clone.
const questionsFor = (store: StoreSettings) => [
  {
    q: "Do trade customers get different prices from the public?",
    a: "No — there is one public price for everyone. For bigger jobs, ask about a project quote or volume pricing.",
  },
  {
    q: "Can I check that an item is in stock before I travel to collect it?",
    a: store.phone
      ? `Yes. Call ${store.phone} first and we’ll check the shelf and have your order picked before you arrive.`
      : "Yes. Contact us first and we’ll check the shelf and have your order picked before you arrive.",
  },
  {
    q: "Can I order on a purchase order instead of paying by card?",
    a: `Get in touch${store.phone ? ` on ${store.phone}` : ""}${store.phone && store.email ? " or" : ""}${store.email ? ` at ${store.email}` : ""} and we’ll set that up with you.`,
  },
  {
    q: "Who will I deal with if I have a trade account?",
    a: "A single named contact who knows your jobs, reachable by phone or email on working days.",
  },
  {
    q: "Can you check whether products will work with my existing system?",
    a: "Yes. Send the model numbers of your recorder and the product you’re considering and we’ll confirm compatibility.",
  },
];

export default async function TradePage() {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("trade")]);
  const { store } = settings;
  // A version published in /admin/content/pages replaces the built-in content below; the application form stays.
  if (page) return <ManagedPage page={page} settings={settings} slot={<ApplySection store={store} />} />;
  return (
    <>
      <TradeHero
        kicker="Trade accounts"
        title={`Trade accounts at ${store.name}`}
        intro="For small businesses, electricians, installers and facilities teams buying more than the odd camera. Apply below and we’ll reply within one working day."
        note="Prices stay public and identical for every customer. A trade account changes how you buy rather than what you pay: whole-job quotes, purchase orders and VAT invoices for your records."
        phone={store.phone}
      />
      <section className="mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">What you get with a trade account</h2>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2">
          {benefits.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-2 bg-white p-6">
              <Icon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <h3 className="text-base font-semibold text-zinc-950">{title}</h3>
              <p className="text-sm leading-relaxed text-zinc-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <ApplySection store={store} />

      <section className={cn(CONTAINER, "py-12")}>
        <h2 className={article.h2}>Who a trade account is for</h2>
        <p className={article.p}>
          Installers, electricians, facilities teams and small businesses that buy CCTV regularly — for example if you
          quote jobs for clients, look after several sites, or build systems into a wider service.
        </p>
        <h2 className={article.h2}>What the account includes</h2>
        <ul className={article.ul}>
          <li>A named contact who knows your jobs, by phone or email on working days.</li>
          <li>Shelf checks before you travel, so you never collect from an empty bay.</li>
          <li>Help pricing jobs, so you don’t have to cost them line by line.</li>
          <li>A way to order without a card payment for every job — ask us how it would work for you.</li>
        </ul>
        <h2 className={article.h2}>Pricing stays public</h2>
        <p className={article.p}>
          Everyone pays the same published price, so you can see exactly what you’ll pay in the shop before committing.
          The account adds service around that price rather than a hidden price list.
        </p>
        <h2 className={article.h2}>Quotes, volume pricing and purchase orders</h2>
        <p className={article.p}>
          For a project quote, volume pricing or ordering on a PO, {reachUs(store)} with an outline of the job.
        </p>
        <h2 className={article.h2}>Technical support on equipment</h2>
        <p className={article.p}>
          Product pages carry the key specifications, and we’ll check compatibility if you send your recorder’s model
          number — usually it comes down to IP versus analogue HD, and the brand.
        </p>
        <p className={article.p}>
          Ready-made kits pair a recorder, cameras and cabling that work together; use one as the starting point for a
          job or build your own list from the range.
        </p>
        <h2 className={article.h2}>Common questions</h2>
        <QaList items={questionsFor(store)} />
      </section>
    </>
  );
}

/** The application form: stays on the page whichever version of the copy is shown. */
function ApplySection({ store }: { store: StoreSettings }) {
  const phoneHref = telHref(store.phone);
  return (
    <section id="apply" className="scroll-mt-24 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-14 md:px-6 md:py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">Apply for a trade account</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          It takes about a minute. A real person reads every application and replies within one working day.
        </p>
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
          <TradeForm />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          Only after a project quote, volume pricing or a PO? You don’t need an account —{" "}
          {store.email ? (
            <a className="font-semibold text-emerald-700 hover:text-emerald-800" href={`mailto:${store.email}`}>
              email us
            </a>
          ) : (
            <a className="font-semibold text-emerald-700 hover:text-emerald-800" href="/contact">
              message us
            </a>
          )}
          {phoneHref && (
            <>
              {" "}
              or call{" "}
              <a className="font-semibold text-emerald-700 hover:text-emerald-800" href={phoneHref}>
                {store.phone}
              </a>
            </>
          )}
          .
        </p>
      </div>
    </section>
  );
}
