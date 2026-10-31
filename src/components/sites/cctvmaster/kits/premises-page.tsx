import Link from "next/link";
import type { ReactNode } from "react";
import { getCategory } from "@/lib/cctvmaster/catalog";
import { getBestSellers, getFinderRows, getKitSummaries } from "./kit-data";
import { KitCard } from "./kit-card";
import { KitFinder } from "./kit-finder";
import { CONTAINER, STORE_HEADINGS, FaqList, LinkGrid, SlashBreadcrumb } from "./kit-sections";
import { cn } from "@/lib/utils";
import type { Faq, LinkItem, PremisesBand } from "./premises-data";

const BAND_SIZE = 4;

/** The kits shown under a camera-count band: the first four in recommended order. */
function bandKits(cameras: number) {
  return getKitSummaries()
    .filter((k) => k.cameraCount === cameras)
    .slice(0, BAND_SIZE);
}

function driveRange(cameras: number) {
  const sizes = getKitSummaries()
    .filter((k) => k.cameraCount === cameras && k.inStock && k.storageTb)
    .map((k) => k.storageTb!);
  if (!sizes.length) return undefined;
  const fmt = (n: number) => `${n} TB`;
  return `Drives from ${fmt(Math.min(...sizes))} to ${fmt(Math.max(...sizes))} in this band.`;
}

const seeAllHref = (cameras: number) =>
  getCategory(`${cameras}-camera-kits`) ? `/categories/${cameras}-camera-kits` : `/kits?cameras=${cameras}`;

export function CtaButtons() {
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <Link
        href="/kit-builder/cctv"
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        Build a system for your site
      </Link>
      <Link href="/trade" className="border-border hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium">
        Open a business account
      </Link>
      <Link href="/contact" className="border-border hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium">
        Ask us to size it
      </Link>
    </div>
  );
}

/** Shared layout of /business-cctv-systems and /cctv-for/[slug]. */
export function PremisesPage({
  crumbs,
  crumbCurrent,
  title,
  intro,
  bands,
  showDriveRange,
  guide,
  faqTitle,
  faqs,
  keepReading,
  footer,
}: {
  crumbs: LinkItem[];
  crumbCurrent?: string;
  title: string;
  intro: string;
  bands: PremisesBand[];
  showDriveRange?: boolean;
  guide: ReactNode;
  faqTitle: string;
  faqs: Faq[];
  keepReading: LinkItem[];
  footer?: ReactNode;
}) {
  return (
    <div className={cn(CONTAINER, STORE_HEADINGS, "py-8")}>
      <SlashBreadcrumb items={crumbs} current={crumbCurrent ?? title} />
      <header className="mt-3 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="text-muted-foreground mt-3 text-base sm:text-lg">{intro}</p>
        <CtaButtons />
      </header>
      {bands.map((band, i) => {
        const kits = bandKits(band.cameras);
        const drives = showDriveRange ? driveRange(band.cameras) : undefined;
        return (
          <section key={band.cameras} className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-2xl">
                <h2 id={`band-${band.cameras}`} className="text-2xl font-bold tracking-tight">
                  {band.cameras} -camera systems: {band.title}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">{band.blurb}</p>
                {drives && <p className="text-muted-foreground mt-1 text-sm">{drives}</p>}
              </div>
              <Link href={seeAllHref(band.cameras)} className="text-primary text-sm font-medium hover:underline">
                See all {band.cameras} -camera kits →
              </Link>
            </div>
            {kits.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {kits.map((k, n) => (
                  <KitCard key={k.slug} kit={k} preload={i === 0 && n === 0} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-6 text-sm">
                No {band.cameras}-camera kits are listed right now.{" "}
                <Link href="/kit-builder/cctv" className="text-primary underline">
                  Build one part by part
                </Link>
                .
              </p>
            )}
          </section>
        );
      })}
      <section className="mt-14" aria-labelledby="finder-heading">
        <h2 id="finder-heading" className="text-2xl font-bold tracking-tight">
          Not sure how many cameras you need?
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Answer three questions and the finder narrows the range to systems that fit your site.
        </p>
        <div className="mt-6">
          <KitFinder rows={getFinderRows()} bestSellers={getBestSellers()} />
        </div>
      </section>
      <div className="mx-auto mt-14 w-full max-w-4xl">
        {guide}
        <div className="mt-10">
          <h2 className="text-xl font-bold tracking-tight">{faqTitle}</h2>
          <FaqList faqs={faqs} />
        </div>
        <LinkGrid title="Keep reading" links={keepReading} />
        {footer}
      </div>
    </div>
  );
}
