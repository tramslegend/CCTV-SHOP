import type { Metadata } from "next";
import { cookieSections } from "@/components/sites/cctvmaster/content/legal-copy";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { LegalBody, LegalShell } from "@/components/sites/cctvmaster/content/page-parts";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import { loadSiteSettings } from "@/lib/settings/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("cookies")]);
  if (page) return managedMetadata(page, settings);
  const { store } = settings;
  return {
    title: `Cookie Policy: How ${store.name} Uses Cookies`,
    description: `${store.name} uses essential, analytics and preference cookies, plus third-party cookies from payment and analytics providers — here's what each does and how to manage or disable them.`,
    alternates: { canonical: "/cookies" },
  };
}

export default async function CookiesPage() {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("cookies")]);
  // The owner's own text, published in /admin/content/pages, replaces the built-in summary below.
  if (page) return <ManagedPage page={page} settings={settings} />;
  return (
    <LegalShell store={settings.store} crumb="Cookie Policy" kicker="Legal · Cookies" title="Cookie Policy" updated="April 2026">
      <LegalBody sections={cookieSections} />
    </LegalShell>
  );
}
