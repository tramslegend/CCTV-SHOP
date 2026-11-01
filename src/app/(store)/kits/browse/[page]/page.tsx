import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KitPrice } from "@/components/sites/cctvmaster/kits/kit-card";
import { CONTAINER, STORE_HEADINGS } from "@/components/sites/cctvmaster/kits/kit-sections";
import { getBrowseOrder } from "@/components/sites/cctvmaster/kits/kit-data";
import { BROWSE_PAGE_SIZE, BrowsePagesNav, KitsHero } from "@/components/sites/cctvmaster/kits/kits-hub";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";

function pageNumber(raw: string) {
  const n = Number(raw);
  const pages = Math.ceil(getBrowseOrder().length / BROWSE_PAGE_SIZE);
  return Number.isInteger(n) && n >= 1 && n <= pages && String(n) === raw ? n : undefined;
}

export async function generateMetadata({ params }: PageProps<"/kits/browse/[page]">): Promise<Metadata> {
  await ensureCatalog();
  const n = pageNumber((await params).page);
  if (!n) return {};
  return {
    title: `Ready-made CCTV kits — page ${n}`,
    description: `Page ${n} of every ready-made CCTV kit we list: recorder, matched cameras and storage, with prices including VAT.`,
    alternates: { canonical: `/kits/browse/${n}` },
  };
}

export default async function KitBrowsePage({ params }: PageProps<"/kits/browse/[page]">) {
  await ensureCatalog();
  const n = pageNumber((await params).page);
  if (!n) notFound();
  const all = getBrowseOrder();
  const from = (n - 1) * BROWSE_PAGE_SIZE;
  const kits = all.slice(from, from + BROWSE_PAGE_SIZE);
  return (
    <div className={`flex min-h-full flex-col bg-white text-foreground ${STORE_HEADINGS}`}>
      <KitsHero
        eyebrow="CCTV kits · UK stock"
        title={`Ready-made kits — page ${n}`}
        intro={`Each one is a complete system: a recorder with matching cameras and storage, checked to work together. This page lists kits ${from + 1} to ${from + kits.length} of ${all.length}, smallest systems first.`}
      />
      <section className="py-12 sm:py-16">
        <div className={CONTAINER}>
          <div className="space-y-10">
            <ol className="divide-border divide-y border-y">
              {kits.map((k) => (
                <li key={k.slug} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={k.href}
                      className="text-foreground hover:text-primary font-medium break-words hover:underline"
                    >
                      {k.name}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 text-sm">{k.headline}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 font-semibold">
                    <div className="flex flex-col">
                      <KitPrice value={k.price} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <BrowsePagesNav total={all.length} current={n} title="More kits" className="mt-0" />
            <p className="text-muted-foreground text-sm">
              Rather have a shortlist?{" "}
              <Link href="/kits" className="text-primary font-semibold hover:underline">
                Try the four quick questions in our kit finder
              </Link>{" "}
              or{" "}
              <Link href="/categories/cctv-kits" className="text-primary font-semibold hover:underline">
                browse kits by size and picture detail
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
