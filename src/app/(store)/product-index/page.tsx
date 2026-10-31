import type { Metadata } from "next";
import Link from "next/link";
import { ensureCatalog, getShopProducts } from "@/lib/cctvmaster/catalog";

export const metadata: Metadata = {
  title: "Every product A to Z",
  description:
    "Everything we sell in one A–Z list — cameras, recorders, cables and accessories — each with a link to its own page.",
};

const collator = new Intl.Collator("en");

function sections() {
  const groups = new Map<string, { slug: string; name: string }[]>();
  for (const p of [...getShopProducts()].sort((a, b) => collator.compare(a.name, b.name))) {
    const first = p.name.trim().charAt(0).toUpperCase();
    const key = /[A-Z]/.test(first) ? first : "0-9";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push({ slug: p.slug, name: p.name });
  }
  return [...groups.entries()].sort(([a], [b]) => (a === "0-9" ? 1 : b === "0-9" ? -1 : a.localeCompare(b)));
}

export default async function ProductIndexPage() {
  await ensureCatalog();
  const groups = sections();
  const total = getShopProducts().length;
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-[-0.02em] text-gray-950">Every product, A to Z</h1>
      <p className="mt-3 max-w-2xl text-sm text-gray-600">
        <span>All {total} products we sell right now, in one A–Z list. Rather browse by type? </span>
        <Link href="/categories" className="underline">
          Go by category
        </Link>
        <span> or </span>
        <Link href="/products" className="underline">
          search the shop
        </Link>
        <span>.</span>
      </p>
      <nav aria-label="Jump to a letter" className="mt-6">
        <ul className="flex flex-wrap gap-1.5">
          {groups.map(([letter]) => (
            <li key={letter}>
              <a
                href={`#index-${letter}`}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-gray-200 px-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                {letter}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {groups.map(([letter, items]) => (
        <section key={letter} id={`index-${letter}`} className="mt-10 scroll-mt-24">
          <h2 className="border-b border-gray-200 pb-2 text-xl font-bold tracking-[-0.02em] text-gray-950">{letter}</h2>
          <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.slug} className="min-w-0 text-sm">
                <Link href={`/products/${item.slug}`} className="break-words text-gray-800 hover:underline">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
