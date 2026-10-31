import type { Metadata } from "next";
import { BestSellers } from "@/components/sites/cctvmaster/kits/best-sellers";
import { getBestSellers, getFinderRows, getKitSummaries } from "@/components/sites/cctvmaster/kits/kit-data";
import { KitFinder } from "@/components/sites/cctvmaster/kits/kit-finder";
import { CONTAINER, STORE_HEADINGS } from "@/components/sites/cctvmaster/kits/kit-sections";
import { KitListing } from "@/components/sites/cctvmaster/kits/kit-listing";
import { BrowsePagesNav, KitsHero, KitsMoreInfo, KitSizeLinks } from "@/components/sites/cctvmaster/kits/kits-hub";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";

export const metadata: Metadata = {
  title: "CCTV Kits: Matched Recorder and Cameras for Home or Shop",
  description:
    "CCTV kits with a recorder and matched cameras, nearly all with hard drive included, for homes and shops. Answer four plain questions to find the right one.",
  alternates: { canonical: "/kits" },
};

export default async function KitsPage({ searchParams }: PageProps<"/kits">) {
  await ensureCatalog();
  const sp = await searchParams;
  const kits = getKitSummaries();
  const bestSellers = getBestSellers();
  return (
    <div className={`flex min-h-full flex-col bg-white text-zinc-950 ${STORE_HEADINGS}`}>
      <KitsHero
        eyebrow="Free tool · UK"
        title="Find your CCTV kit"
        intro="Answer four quick questions and we'll show you the kits that fit. Every kit pairs a recorder with cameras we've already checked together, and nearly all of them include the hard drive."
      />
      <section className="py-12 sm:py-16">
        <div className={CONTAINER}>
          <div className="space-y-10">
            <BestSellers
              items={bestSellers}
              intro="Not sure where to begin? These are the kits our customers buy most, so start here and scroll on if none fits."
            />
            <KitSizeLinks />
            <section id="kit-finder" className="scroll-mt-28">
              <h2 className="text-foreground text-xl font-bold">Not sure what to get? Try four quick questions</h2>
              <p className="text-muted-foreground mt-1 mb-4 text-sm leading-relaxed">
                No jargon, and nothing to look up. After each answer you&apos;ll see how many kits are still in the
                running.
              </p>
              <KitFinder rows={getFinderRows()} bestSellers={bestSellers} />
            </section>
            <section id="prebuilt-kits" className="scroll-mt-28">
              <h2 className="text-foreground text-xl font-bold">Or browse every kit</h2>
              <p className="text-muted-foreground mt-1 mb-5 text-sm leading-relaxed">
                Each card shows the kind of place a kit suits, how many cameras it comes with and roughly how many days
                of footage it keeps before recording over the oldest. Every part is also sold on its own — follow a
                kit through to see them.
              </p>
              <KitListing kits={kits} basePath="/kits" searchParams={sp} />
              <BrowsePagesNav total={kits.length} />
            </section>
          </div>
          <KitsMoreInfo />
        </div>
      </section>
    </div>
  );
}
