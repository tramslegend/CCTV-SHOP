import type { Metadata } from "next";
import Link from "next/link";
import { guideSections } from "@/components/sites/cctvmaster/content/guides-data";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import { CONTAINER, HelpHero } from "@/components/sites/cctvmaster/content/page-parts";
import { getBlogPost } from "@/lib/cctvmaster/catalog";
import { getPublishedPage, managedMetadata } from "@/lib/content/pages-server";
import type { BlogPost } from "@/lib/cctvmaster/types";
import { loadSiteSettings } from "@/lib/settings/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("guides");
  if (page) return managedMetadata(page, await loadSiteSettings());
  return {
    title: "CCTV Buying Guide: Compatibility, Storage & Night Vision",
    description:
      "CCTV buying guide for homes and small businesses: check compatibility, storage and night vision before you buy, with free sizing calculators.",
    alternates: { canonical: "/guides" },
  };
}

const calculators = [
  { label: "Storage calculator", href: "/tools/cctv-storage-calculator" },
  { label: "PoE and voltage drop calculator", href: "/tools/poe-voltage-drop-calculator" },
  { label: "Lens and viewing angle calculator", href: "/tools/cctv-lens-calculator" },
];

export default async function GuidesPage() {
  const [settings, page] = await Promise.all([loadSiteSettings(), getPublishedPage("guides")]);
  // A version published in /admin/content/pages replaces the heading and intro; the calculators and guide list stay.
  if (page) return <ManagedPage page={page} settings={settings} slot={<GuideList />} />;
  return (
    <div className="flex min-h-full flex-col bg-white text-foreground">
      <HelpHero
        kicker="Free tool · UK"
        title="CCTV help and guides"
        intro="Help with choosing, sizing and fitting CCTV, sorted by topic. They're written around the kit we actually sell, and the free calculators do the sums for you."
      />
      <GuideList />
    </div>
  );
}

/** Calculator links and the guides by topic (from the published blog posts). */
function GuideList() {
  const sections = guideSections
    .map(([title, slugs]) => ({ title, posts: slugs.map((s) => getBlogPost(s)).filter((p): p is BlogPost => !!p) }))
    .filter((s) => s.posts.length);
  return (
    <section className="py-12 sm:py-16">
      <div className={CONTAINER}>
        <div className="flex flex-col gap-8">
          <div className="border-border bg-card rounded-xl border p-5">
            <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">Handy calculators</p>
            <ul className="flex flex-wrap gap-2">
              {calculators.map((c) => (
                <li key={c.href}>
                  <Link
                    className="border-border inline-block rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                    href={c.href}
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-foreground text-xl font-bold tracking-tight">{section.title}</h2>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {section.posts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      className="border-border bg-card block h-full rounded-lg border p-4 hover:border-primary transition-colors"
                      href={`/blog/${post.slug}`}
                    >
                      <span className="text-foreground block text-sm font-semibold">{post.title}</span>
                      {post.excerpt ? (
                        <span className="text-muted-foreground mt-1 line-clamp-2 block text-xs leading-relaxed">
                          {post.excerpt}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-10 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            <span>Can&apos;t find what you need?</span>{" "}
            <Link
              className="font-semibold text-brand-700 underline underline-offset-2 hover:decoration-2"
              href="/contact"
            >
              Just ask
            </Link>{" "}
            <span>— you&apos;ll get a straight answer from people who handle this kit every day.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
