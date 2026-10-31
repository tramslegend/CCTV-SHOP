import type { Metadata } from "next";
import { legalFacts, privacyExtras, privacySections } from "@/components/sites/cctvmaster/content/legal-copy";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { LegalBody, LegalShell } from "@/components/sites/cctvmaster/content/page-parts";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import { loadSiteSettings } from "@/lib/settings/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("privacy")]);
  if (page) return managedMetadata(page, settings);
  const { store } = settings;
  return {
    title: `Privacy Policy: How ${store.name} Uses Your Data`,
    description: `${store.name} only collects the name, address, contact and payment details needed to fulfil your order, never sells your data, and honours UK GDPR access, correction and deletion rights.`,
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage() {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("privacy")]);
  // The owner's own text, published in /admin/content/pages, replaces the built-in summary below.
  if (page) return <ManagedPage page={page} settings={settings} />;
  const { store } = settings;
  return (
    <>
      <LegalShell store={store} crumb="Privacy Policy" kicker="Legal · Privacy" title="Privacy Policy" updated="April 2026">
        <LegalBody sections={privacySections(legalFacts(store))} />
      </LegalShell>
      {privacyExtras.map((extra, i) => (
        <section key={extra.id} className="mx-auto mt-10 max-w-4xl px-4" aria-labelledby={extra.id}>
          <h2 id={extra.id} className={`mb-3 text-2xl font-bold tracking-tight${i === 0 ? " md:text-3xl" : ""}`}>
            {extra.title}
          </h2>
          <p className="text-sm leading-relaxed opacity-80">{extra.text}</p>
        </section>
      ))}
    </>
  );
}
