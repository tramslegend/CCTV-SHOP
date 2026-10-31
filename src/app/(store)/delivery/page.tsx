import type { Metadata } from "next";
import Link from "next/link";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { CONTAINER } from "@/components/sites/cctvmaster/content/page-parts";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import { addressLine, deliveryFacts, internationalPhone, mapHref } from "@/lib/settings/format";
import { loadSiteSettings } from "@/lib/settings/storefront";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("delivery")]);
  if (page) return managedMetadata(page, settings);
  const { store, delivery } = settings;
  const d = deliveryFacts(delivery);
  const city = store.address.city;
  return {
    title: d.alwaysFree ? `CCTV Delivery UK: Free, ${d.cutoff} Cut-Off` : `CCTV Delivery UK: Free Over ${d.freeFromShort}, ${d.cutoff} Cut-Off`,
    description: `${d.alwaysFree ? "CCTV delivery anywhere in the UK is free" : `CCTV delivery anywhere in the UK is ${d.fee} per order, free from ${d.freeFromShort}, VAT included`}. In-stock orders before ${d.cutoff} Mon–Fri ship same day; ${city ? `${city} pick-up` : "pick-up"} by phone.`,
    alternates: { canonical: "/delivery" },
  };
}

export default async function DeliveryPage() {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("delivery")]);
  // A version published in /admin/content/pages replaces the built-in page below.
  if (page) return <ManagedPage page={page} settings={settings} />;
  const { store, delivery } = settings;
  const d = deliveryFacts(delivery);
  const fee = d.fee;
  const threshold = d.freeFrom;
  const collectAddress = addressLine(store.address);
  const collectPhone = internationalPhone(store.phone);
  const map = mapHref(store);
  const email = store.email;

  const stats = d.alwaysFree
    ? [
        { label: "Delivery anywhere in the UK", value: "Free", note: "On every order, VAT included" },
        { label: "Arrives", value: d.transit, note: "After dispatch, by tracked service" },
        { label: "Sent the same day", value: `Order by ${d.cutoff}`, note: "Mon to Fri, on items in stock" },
      ]
    : [
        { label: "Delivery anywhere in the UK", value: fee, note: "One charge per order, VAT included" },
        { label: "Free delivery", value: `${threshold} or more`, note: "Taken off in your basket (VAT included)" },
        { label: "Sent the same day", value: `Order by ${d.cutoff}`, note: "Mon to Fri, on items in stock" },
      ];

  // Questions as on the source; answers are short summaries of the delivery facts above (from Settings).
  const questions = [
    {
      q: "How much does delivery cost?",
      a: d.alwaysFree
        ? "Nothing: delivery to any UK address is free, whatever the order comes to."
        : `A flat ${fee} per order to any UK address, VAT included, and nothing once your order reaches ${threshold}. The charge covers the whole order and is shown before you pay.`,
    },
    {
      q: "When will my order be sent?",
      a: `In-stock items ordered before ${d.cutoff} on a weekday leave the same working day and usually arrive ${d.transit} later. Later or weekend orders go out the next working day, and back-ordered items follow as soon as they arrive.`,
    },
    {
      q: "Can I pick up my order instead of paying for delivery?",
      a: `Yes. Collection is arranged by phone rather than at checkout — ${collectPhone ? `call ${collectPhone}` : "contact us"} and we’ll confirm your order is ready${collectAddress ? ` at ${collectAddress}` : ""} before you travel.`,
    },
    {
      q: "Does it cost more to get to Northern Ireland, or to the Highlands and Islands in Scotland?",
      a: d.alwaysFree
        ? "No. Delivery is free to every UK address. For the Channel Islands or the Isle of Man, please contact us before ordering."
        : `No. Every UK address pays the same ${fee}, or nothing from ${threshold}. For the Channel Islands or the Isle of Man, please contact us before ordering.`,
    },
    {
      q: "What if my order turns up damaged, or it’s the wrong thing?",
      a: "Tell us promptly and we’ll put it right at our expense, return postage included. Separately, you can cancel an online or phone order within 14 days without giving a reason.",
    },
  ];

  return (
    <div className={cn(CONTAINER, "py-12 md:py-16")}>
      <nav className="text-muted-foreground mb-6 text-sm" aria-label="Breadcrumb">
        <Link className="hover:underline" href="/">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span aria-current="page">Delivery &amp; collection</span>
      </nav>
      <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Delivery &amp; collection</h1>
      <p className="text-muted-foreground mb-10 max-w-2xl text-base leading-relaxed md:text-lg">
        What delivery costs, when your order leaves us and how to collect it yourself — all shown before you pay.
      </p>
      <dl className="mb-12 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-muted/40 rounded-xl border p-5">
            <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{s.label}</dt>
            <dd className="mt-2 text-2xl font-bold">{s.value}</dd>
            <dd className="text-muted-foreground mt-1 text-sm">{s.note}</dd>
          </div>
        ))}
      </dl>
      <section className="mb-12 rounded-xl border p-6">
        <h2 className="mb-2 text-xl font-bold">Pick it up from us</h2>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed md:text-base">
          {collectAddress && (
            <>
              Our counter is at <strong className="text-foreground">{collectAddress}</strong>.{" "}
            </>
          )}
          Collection isn’t offered at checkout, so{" "}
          {collectPhone ? (
            <>
              call <strong className="text-foreground">{collectPhone}</strong>
            </>
          ) : (
            "contact us"
          )}{" "}
          first and we’ll check your order is picked and waiting — no wasted trip for something still on its way to us.
        </p>
        <p className="mt-3 text-sm">
          {map && (
            <>
              <a className="font-semibold underline underline-offset-2" href={map} rel="noopener noreferrer" target="_blank">
                Directions
              </a>{" "}
              ·{" "}
            </>
          )}
          <Link className="font-semibold underline underline-offset-2" href="/visit">
            Opening times and what to bring
          </Link>
        </p>
      </section>
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Your questions</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {questions.map((item) => (
            <div key={item.q}>
              <h3 className="mb-2 font-semibold">{item.q}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
      <p className="text-muted-foreground text-sm">
        Changed your mind, or has something turned up faulty? Have a look at{" "}
        <Link className="text-foreground font-semibold underline underline-offset-2" href="/returns">
          our returns page
        </Link>
        {email ? (
          <>
            {" "}
            or email{" "}
            <a className="text-foreground font-semibold underline underline-offset-2" href={`mailto:${email}`}>
              {email}
            </a>
          </>
        ) : (
          <>
            {" "}
            or{" "}
            <Link className="text-foreground font-semibold underline underline-offset-2" href="/contact">
              get in touch
            </Link>
          </>
        )}
        .
      </p>
    </div>
  );
}
