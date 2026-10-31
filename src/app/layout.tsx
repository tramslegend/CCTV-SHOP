import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/sites/cctvmaster/toaster";
import { siteTitle, titleTemplate } from "@/lib/settings/format";
import { loadSiteSettings } from "@/lib/settings/storefront";
import "./globals.css";

// Inter variable font as self-hosted by cctvmaster.co.uk.
const inter = localFont({
  src: "./fonts/inter-variable-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

// Homepage title, title pattern and default description come from Settings ("SEO & social"), falling back to the
// shop name.
export async function generateMetadata(): Promise<Metadata> {
  const { store, seo } = await loadSiteSettings();
  return {
    // Absolute URLs for social cards; set SITE_URL when serving the shop somewhere other than localhost.
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
    title: { default: siteTitle(seo, store), template: titleTemplate(seo, store) },
    description: seo.description || undefined,
    applicationName: store.name,
    openGraph: { siteName: store.name },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" translate="no" className={`${inter.variable} light`}>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-black focus:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Skip to main content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
