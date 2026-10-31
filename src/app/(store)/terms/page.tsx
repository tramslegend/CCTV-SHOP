import type { Metadata } from "next";
import { legalFacts, termsSections } from "@/components/sites/cctvmaster/content/legal-copy";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { LegalBody, LegalShell } from "@/components/sites/cctvmaster/content/page-parts";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import { VAT_RATE } from "@/lib/cctvmaster/money";
import { vatPercent } from "@/lib/settings/format";
import { loadSiteSettings } from "@/lib/settings/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("terms")]);
  if (page) return managedMetadata(page, settings);
  const { store } = settings;
  return {
    title: "Terms & Conditions – Sales, Delivery & PayPal",
    description: `UK terms of sale from ${store.name}: prices include ${vatPercent(VAT_RATE)}% VAT, 14-day cancellation rights, delivery within 30 days, and secure checkout by card or PayPal.`,
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("terms")]);
  // The owner's own text, published in /admin/content/pages, replaces the built-in summary below.
  if (page) return <ManagedPage page={page} settings={settings} />;
  const { store } = settings;
  return (
    <LegalShell store={store} crumb="Terms & Conditions" kicker="Legal · Terms" title="Terms & Conditions" updated="October 2026">
      <LegalBody sections={termsSections(legalFacts(store))} />
    </LegalShell>
  );
}
