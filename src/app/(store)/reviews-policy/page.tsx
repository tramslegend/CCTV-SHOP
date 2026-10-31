import type { Metadata } from "next";
import Link from "next/link";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { CONTAINER } from "@/components/sites/cctvmaster/content/page-parts";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import type { StoreSettings } from "@/lib/settings/schema";
import { loadSiteSettings } from "@/lib/settings/storefront";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("reviews-policy")]);
  if (page) return managedMetadata(page, settings);
  const { store } = settings;
  return {
    title: { absolute: `Our reviews policy | ${store.name}` },
    description: "Who can leave a review here, how reviews get checked and put live, and whether you get anything for writing one.",
    alternates: { canonical: "/reviews-policy" },
  };
}

/** "email … or call …" (whichever are set in Settings), or the contact page. */
const reach = (store: StoreSettings) =>
  [store.email && `email ${store.email}`, store.phone && `call ${store.phone}`].filter(Boolean).join(" or ") || "use our contact page";

// Headings follow the source; the copy is a short summary written for this clone.
const sectionsFor = (store: StoreSettings) => [
  {
    id: "who-can-review",
    title: "Who can leave a review",
    body: [
      `Reviews are open only to people who bought the product from ${store.name}. After your purchase we email a private review link, or you can review from the order in your account once it has been dispatched.`,
      "Every customer receives the same request, worded the same way — we don’t pick who to ask based on how happy we expect them to be.",
    ],
  },
  {
    id: "every-review-published",
    title: "Good or bad, every review goes up",
    body: [
      "Low star ratings and critical comments are published as written, without editing.",
      "A review is held for a manual check only if it contains contact details or links, abusive language, or text that isn’t made of real words.",
    ],
  },
  {
    id: "rewards",
    title: "Do you get anything for reviewing?",
    body: [
      "No. There are no discounts, credit or prize-draw entries in return for a review.",
      "The same applies to reviews you leave on Google, Trustpilot or any other site.",
    ],
  },
  {
    id: "replies",
    title: "When we reply",
    body: ["We may respond publicly to a review, but a reply will never offer anything in exchange for changing or removing it."],
  },
  {
    id: "review-or-complaint",
    title: "Leaving a review or making a complaint",
    body: [
      "A review shares your opinion with other shoppers; a complaint asks us to fix something. You can do either or both, and raising a problem never stops you reviewing.",
      `To raise a problem, ${reach(store)}. Your rights are set out on our returns page.`,
    ],
  },
  {
    id: "report",
    title: "Spotted a fake review?",
    body: [
      `If a review looks fake or seems to break these rules, ${reach(store)} and tell us which one — we’ll investigate.`,
    ],
  },
  {
    id: "other-sites",
    title: "Google and Trustpilot",
    body: [
      "We may also invite you to review us on Google or Trustpilot. Reviews from other websites, marketplaces included, are never copied onto our product pages.",
    ],
  },
];

export default async function ReviewsPolicyPage() {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("reviews-policy")]);
  // A version published in /admin/content/pages replaces the built-in page below.
  if (page) return <ManagedPage page={page} settings={settings} />;
  const { store } = settings;
  const sections = sectionsFor(store);
  return (
    <div className={cn(CONTAINER, "py-12 md:py-16")}>
      <nav className="text-muted-foreground mb-6 text-sm" aria-label="Breadcrumb">
        <Link className="hover:underline" href="/">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span aria-current="page">Reviews policy</span>
      </nav>
      <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Our reviews policy</h1>
      <p className="text-muted-foreground mb-2 text-base leading-relaxed md:text-lg">
        How {store.name} collects, checks and publishes product reviews — and whether writing one earns you anything.
      </p>
      <p className="text-muted-foreground mb-10 text-sm">Last updated 14 October 2026</p>
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="mb-8">
          <h2 className="mb-3 text-xl font-bold">{s.title}</h2>
          {s.body.map((p) => (
            <p key={p} className="text-muted-foreground mb-3 text-sm leading-relaxed md:text-base">
              {p}
            </p>
          ))}
        </section>
      ))}
      <p className="text-muted-foreground text-sm">
        Something wrong with an order? Our{" "}
        <Link className="text-foreground font-semibold underline underline-offset-2" href="/returns">
          returns page
        </Link>{" "}
        explains what happens next, or you can{" "}
        <Link className="text-foreground font-semibold underline underline-offset-2" href="/contact">
          get in touch
        </Link>
        .
      </p>
    </div>
  );
}
