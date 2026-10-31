import type { Metadata } from "next";
import Link from "next/link";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { article, CONTAINER, CtaBox, QaList } from "@/components/sites/cctvmaster/content/page-parts";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import { addressLine } from "@/lib/settings/format";
import type { StoreSettings } from "@/lib/settings/schema";
import { loadSiteSettings } from "@/lib/settings/storefront";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("about");
  if (page) return managedMetadata(page, await loadSiteSettings());
  return {
    title: "CCTV Stocked and Run by Field Engineers in the UK",
    description:
      "UK CCTV supplier run by field engineers, selling the same cameras and recorders installers fit to homeowners and small businesses, with advice before you buy.",
    alternates: { canonical: "/about" },
  };
}

const categories = [
  { label: "Cameras", href: "/categories/cameras" },
  { label: "Recorders", href: "/categories/recorders" },
  { label: "CCTV kits, with a recorder, cameras and cabling picked to work together", href: "/kits" },
  { label: "Storage", href: "/categories/storage" },
  { label: "Wire and cable", href: "/categories/wire-cable" },
  { label: "Data comm and networking", href: "/categories/data-comm-networking" },
  { label: "Intrusion", href: "/categories/intrusion" },
  { label: "Accessories", href: "/categories/accessories" },
];

// Headings and questions follow the source; the copy is a short summary written for this clone. The shop's name,
// address and contact details come from Settings; questions about details that aren't set are left out.
const questionsFor = (store: StoreSettings) => {
  const address = addressLine(store.address);
  const channels = [store.phone && `call ${store.phone}`, store.email && `email ${store.email}`].filter(Boolean);
  const contact = channels.length ? `${channels.join(", ")} or use the [contact page](/contact).` : "Use the [contact page](/contact).";
  return [
  ...(address ? [{ q: `Where is ${store.name} based?`, a: `We're at ${address}.` }] : []),
  {
    q: "Can installers and businesses buy from you?",
    a: "Yes, at the same public prices as everyone else. For a project quote, volume pricing or a purchase order, [contact us](/contact).",
  },
  {
    q: "Do you install the equipment you sell?",
    a: "No. We supply the equipment; fitting is arranged by you or your own installer.",
  },
  {
    q: `How do I contact ${store.name}?`,
    a: contact.charAt(0).toUpperCase() + contact.slice(1),
  },
  ];
};

const listLink = "hover:text-foreground transition-colors";

export default async function AboutPage() {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("about")]);
  // A version published in /admin/content/pages replaces the built-in page below.
  if (page) return <ManagedPage page={page} settings={settings} />;
  const { store } = settings;
  const city = store.address.city;
  return (
    <div className={cn(CONTAINER, "py-12")}>
      <p className={article.p}>
        {store.name} is an online CCTV and security equipment shop based in {city || "the UK"}. Homeowners, small businesses and
        installers all buy from us, at public prices that are the same for every customer.
      </p>
      <h1 className={article.h2}>Who we sell to</h1>
      <p className={article.p}>
        There’s no account or trade relationship to set up first. Everyone shops the same range at the same published
        prices, and guest checkout takes any major debit or credit card.
      </p>
      <h2 className={article.h2}>What we stock</h2>
      <p className={article.p}>The shop is organised into these categories:</p>
      <ul className={article.ul}>
        {categories.map((c) => (
          <li key={c.href}>
            <Link className={listLink} href={c.href}>
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className={article.p}>
        There are also ranges for{" "}
        <Link className={listLink} href="/collections/video-door-entry">
          video door entry
        </Link>{" "}
        and{" "}
        <Link className={listLink} href="/collections/access-control">
          door access control
        </Link>
        , a{" "}
        <Link className={listLink} href="/brands/hikvision">
          Hikvision range
        </Link>
        , a{" "}
        <Link className={listLink} href="/kit-builder/cctv">
          kit builder
        </Link>{" "}
        and a{" "}
        <Link className={listLink} href="/tools/cctv-storage-calculator">
          storage calculator
        </Link>
        . Product pages list the key specifications, so you can check a part suits your setup before you order.
      </p>
      <h2 className={article.h2}>What we do and don&apos;t do</h2>
      <p className={article.p}>
        We supply equipment only — installation is for you or your own installer to arrange. Unsure whether a camera
        will work with your existing recorder? Send us the recorder’s model number and we’ll check.
      </p>
      <h2 className={article.h2}>How buying works</h2>
      <p className={article.p}>
        Add items to your basket and pay by card at checkout. Delivery is a single charge per order (see the{" "}
        <Link className={listLink} href="/delivery">
          delivery page
        </Link>
        ). Collection from our {city ? `${city} ` : ""}counter is arranged by phone rather than at checkout, and returns are explained on
        the{" "}
        <Link className={listLink} href="/returns">
          returns page
        </Link>
        .
      </p>
      <QaList items={questionsFor(store)} />
      <CtaBox
        title="Buying regularly or for a project?"
        body="Our prices are already public, so there’s nothing to unlock. If you quote jobs or buy for several sites, the trade page explains how we can help."
        href="/trade"
        label="See trade options"
      />
    </div>
  );
}
