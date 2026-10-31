import type { Metadata } from "next";
import { legalFacts, returnsSections } from "@/components/sites/cctvmaster/content/legal-copy";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { LegalBody, LegalShell } from "@/components/sites/cctvmaster/content/page-parts";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import { loadSiteSettings } from "@/lib/settings/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("returns");
  if (page) return managedMetadata(page, await loadSiteSettings());
  return {
    title: "Returns & Refunds",
    description: "How to send something back to us, and when you’ll get your money back.",
    alternates: { canonical: "/returns" },
  };
}

export default async function ReturnsPage() {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("returns")]);
  // The owner's own text, published in /admin/content/pages, replaces the built-in summary below.
  if (page) return <ManagedPage page={page} settings={settings} />;
  const { store } = settings;
  return (
    <LegalShell store={store} crumb="Returns & Refunds" kicker="Legal · Returns" title="Returns & Refunds" updated="October 2026">
      <LegalBody sections={returnsSections(legalFacts(store))} />
    </LegalShell>
  );
}
