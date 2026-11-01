import { Clock, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { VisitHero } from "@/components/sites/cctvmaster/content/page-heroes";
import { article, CONTAINER, CtaBox, QaList } from "@/components/sites/cctvmaster/content/page-parts";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import { addressLine, internationalPhone, mapHref, telHref } from "@/lib/settings/format";
import type { StoreSettings } from "@/lib/settings/schema";
import { loadSiteSettings } from "@/lib/settings/storefront";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("visit")]);
  if (page) return managedMetadata(page, settings);
  const { store } = settings;
  const { city, line2, postcode } = store.address;
  const district = postcode.split(" ")[0];
  const area = [line2, city].filter(Boolean).join(", ");
  return {
    title: `Visit Our CCTV Shop${city ? ` in ${city}` : ""} — Address & Hours`,
    description: `Open retail CCTV shop${area ? ` in ${area}${district ? ` ${district}` : ""}` : ""} — browse cameras, recorders and kits in person.${store.phone ? ` Call ${store.phone} first to confirm stock before travelling.` : ""}`,
    alternates: { canonical: "/visit" },
  };
}

export default async function VisitPage() {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("visit")]);
  const { store } = settings;
  // A version published in /admin/content/pages replaces the built-in content below; the address card stays.
  if (page) return <ManagedPage page={page} settings={settings} slot={<FindUsCard store={store} />} />;
  const city = store.address.city;
  const address = addressLine(store.address);
  const intlPhone = internationalPhone(store.phone);
  const ring = intlPhone ? `ring ${intlPhone}` : "contact us";
  const call = intlPhone ? `call ${intlPhone}` : "contact us";

  // Headings and questions follow the source; the copy is short and built from the store's facts in Settings.
  const questions = [
    {
      q: "Can I pick up my order instead of paying for delivery?",
      a: `Yes. Collection is set up by phone, not at checkout — ${ring} before you travel and we’ll have it ready.`,
    },
    {
      q: "Can I choose collection at checkout?",
      a: "No. Place your order online as normal, then call us to arrange collection.",
    },
    {
      q: "Can you check whether an item is in stock before I make the trip?",
      a: "Yes. Ask and we’ll check the shelf itself, not just the website.",
    },
    {
      q: "Do I need an account to collect an order?",
      a: "No. Guest checkout is fine; an account just adds order tracking and invoice downloads.",
    },
  ];

  return (
    <div className="min-h-screen">
      <VisitHero
        title={`Find ${store.name}${city ? ` in ${city}` : ""}`}
        intro={`${city ? `A ${city} counter` : "A shop counter"} with public prices and UK stock — give us a ring before you travel.`}
      />
      <section className="py-12 sm:py-16">
        <div className={cn(CONTAINER, "space-y-8")}>
          <FindUsCard store={store} />

          <div className="space-y-8">
            <p className={article.p}>
              Collecting an order? Collection isn’t an option at checkout, so it’s arranged by phone: {call} and we’ll
              confirm your order is picked and waiting before you leave.
            </p>
            <h2 className={article.h2}>Before you travel</h2>
            <ul className={article.ul}>
              <li>Place your order online, then {call}.</li>
              <li>Have your order number to hand.</li>
              <li>Wait for us to confirm it’s ready to collect.</li>
              <li>If anything is due in on our next delivery, we’ll tell you before you set off.</li>
            </ul>
            <p className={article.p}>
              Want to know something is in stock before you come? Ask — we check the shelf, not just the website.
            </p>
            {address && (
              <>
                <h2 className={article.h2}>Where to find us</h2>
                <p className={article.p}>
                  {address}. The{" "}
                  <Link className={article.link} href="/delivery">
                    delivery and collection page
                  </Link>{" "}
                  has more on collecting.
                </p>
              </>
            )}
            <h2 className={article.h2}>Areas we serve</h2>
            <p className={article.p}>
              Collection is from our {city ? `${city} ` : ""}address, and we deliver anywhere in the UK at one flat rate. For
              the Channel Islands or the Isle of Man, contact us before ordering.
            </p>
            <QaList items={questions} />
            <CtaBox
              title="Directions, opening times and what to bring"
              body="The delivery and collection page covers everything for the trip."
              href="/delivery"
              label="See delivery and collection"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/** Address, opening hours, directions and phone from Settings: stays on the page whichever version of the copy is shown. */
function FindUsCard({ store }: { store: StoreSettings }) {
  const address = addressLine(store.address);
  const map = mapHref(store);
  const phoneHref = telHref(store.phone);
  return (
    <div className="border-primary/20 rounded-2xl border bg-white p-6 sm:p-8">
      <h2 className="text-xl font-bold text-foreground">Where to find us</h2>
      {address && (
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          {store.name}, {address}
        </p>
      )}
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">
        Want to see something in person or collect an order?{" "}
        {phoneHref ? (
          <>
            Ring{" "}
            <a className="text-primary font-semibold hover:underline" href={phoneHref}>
              {store.phone}
            </a>{" "}
            before you set off
          </>
        ) : (
          <>
            <Link className="text-primary font-semibold hover:underline" href="/contact">
              Contact us
            </Link>{" "}
            before you set off
          </>
        )}{" "}
        and we’ll make sure it’s on the shelf and ready.
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {store.openingHours.length > 0 && (
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              Opening hours
            </p>
            <dl className="mt-2 divide-y divide-border text-sm">
              {store.openingHours.map((row, i) => (
                <div key={`${i}-${row.days}`} className="flex items-center justify-between py-1.5">
                  <dt className="text-muted-foreground">{row.days}</dt>
                  <dd className="font-medium text-foreground">{row.hours}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <div className="flex flex-col gap-3 text-sm">
          {map && (
            <a
              className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:underline"
              href={map}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Get directions (Google Maps)
            </a>
          )}
          {phoneHref && (
            <a className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:underline" href={phoneHref}>
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call before you travel
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
