import type { Metadata } from "next";
import Link from "next/link";
import { categoryCount, isKitCategory } from "@/components/sites/cctvmaster/listing/listing-data";
import { ensureCatalog, getCategories, getCategoryTree, getTaxonomy } from "@/lib/cctvmaster/catalog";
import { loadSiteSettings } from "@/lib/settings/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const { store } = await loadSiteSettings();
  return {
    title: "All Categories",
    description: `All of ${store.name}’s product categories in one place: cameras, recorders, hard drives, networking, cable and accessories, held in UK stock.`,
  };
}

interface Entry {
  slug: string;
  name: string;
  href: string;
  count: number;
}

const collator = new Intl.Collator("en");

/** Kit counts per kit category, from the kit navigation (system totals and per-system sub-counts). */
function kitCounts() {
  const counts = new Map<string, number>();
  for (const system of getTaxonomy().kitNav.children ?? []) {
    counts.set(system.slug, system.kits);
    const prefix = system.slug.replace(/-kits$/, "");
    for (const child of system.children ?? []) {
      counts.set(child.slug, (counts.get(child.slug) ?? 0) + child.kits);
      if (child.axis === "resolution") counts.set(`${prefix}-${child.slug}`, child.kits);
    }
  }
  return counts;
}

function sections() {
  const tree = getCategoryTree();
  const categories = getCategories();
  const kits = kitCounts();
  const byCount = (a: Entry, b: Entry) => b.count - a.count || (a.slug < b.slug ? 1 : -1);

  const shop = [...tree.values()]
    .filter((n) => !n.parent)
    .map((n) => {
      const category = categories.find((c) => c.slug === n.slug);
      if (!category || isKitCategory(category)) return null;
      const children = n.children
        .map((s) => ({ slug: s, name: tree.get(s)?.name ?? s, href: `/categories/${s}`, count: categoryCount(s) }))
        .filter((c) => c.count > 0)
        .sort(byCount)
        .slice(0, 8);
      return { slug: n.slug, name: n.name, href: n.href, count: categoryCount(n.slug), children };
    })
    .filter((s): s is Entry & { children: Entry[] } => !!s && s.count > 0);

  const nav = getTaxonomy().kitNav;
  const kitChildren = categories
    .filter((c) => isKitCategory(c) && c.slug !== nav.slug)
    .map((c) => ({ slug: c.slug, name: tree.get(c.slug)?.name ?? c.slug, href: `/categories/${c.slug}`, count: kits.get(c.slug) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort(byCount)
    .slice(0, 8);
  const kitSection = { slug: nav.slug, name: nav.name, href: nav.href, count: nav.kits, children: kitChildren };

  return [kitSection, ...shop].sort((a, b) => b.count - a.count || collator.compare(a.name, b.name));
}

export default async function CategoriesPage() {
  await ensureCatalog();
  return (
    <div className="text-foreground">
      <header className="fc-band">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <h1 className="fc-rise text-3xl font-bold tracking-[-0.02em] sm:text-4xl">All Categories</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">Pick a category to see everything we sell in it.</p>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sections().map((section) => (
            <section
              key={section.slug}
              className="fc-reveal border-border rounded-xl border bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_40px_-22px_rgba(24,80,150,0.45)]"
            >
              <Link href={section.href} className="text-lg font-semibold transition-colors hover:text-brand-700">
                {section.name}
                <span className="text-muted-foreground ml-2 text-xs font-normal">{section.count}</span>
              </Link>
              {section.children.length ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {section.children.map((child) => (
                    <li key={child.slug}>
                      <Link href={child.href} className="text-muted-foreground transition-colors hover:text-primary hover:underline">
                        {child.name}
                        <span className="ml-1.5 text-xs">{child.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
