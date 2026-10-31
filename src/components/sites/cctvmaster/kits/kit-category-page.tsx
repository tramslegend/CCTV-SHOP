import Link from "next/link";
import { getBlogPost } from "@/lib/cctvmaster/catalog";
import { MarkdownContent } from "../product/markdown";
import type { BlogPost, Category } from "@/lib/cctvmaster/types";
import { BestSellers } from "./best-sellers";
import { getBestSellers, getKitRanges, getKitSummaries, kitCategoryFilter } from "./kit-data";
import { KitListing } from "./kit-listing";
import {
  type KitFilters,
  type KitSummary,
  matches,
  parseFilters,
  resLabel,
  type SearchParamsRecord,
  storageLabelFor,
} from "./kit-model";
import { CONTAINER, STORE_HEADINGS, ChevronBreadcrumb, FaqList, Prose } from "./kit-sections";
import { cn } from "@/lib/utils";
import type { Faq } from "./premises-data";

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : undefined;
};

const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

function rangeStats(kits: KitSummary[]) {
  const ready = kits.filter((k) => k.inStock);
  const base = ready.length ? ready : kits;
  const res = [...new Set(base.map((k) => k.res).filter((r): r is number => !!r))].sort((a, b) => a - b);
  const tb = base.map((k) => k.storageTb).filter((t): t is number => !!t);
  const ch = base.map((k) => k.channelCount);
  const spare = base.map((k) => k.channelCount - k.cameraCount);
  const prices = base.map((k) => k.price);
  return {
    ready: ready.length,
    systems: new Set(base.map((k) => k.system)),
    res,
    minTb: tb.length ? Math.min(...tb) : undefined,
    maxTb: tb.length ? Math.max(...tb) : undefined,
    minCh: Math.min(...ch),
    maxCh: Math.max(...ch),
    maxSpare: Math.max(0, ...spare),
    days: median(base.map((k) => k.recordingDays).filter((d): d is number => !!d)),
    brands: [...new Set(base.map((k) => k.brand).filter((b): b is string => !!b))].sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base" }),
    ),
    minPrice: prices.length ? Math.min(...prices) : undefined,
    maxPrice: prices.length ? Math.max(...prices) : undefined,
    allDrives: base.every((k) => !!k.storageTb),
  };
}

const gbp = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function systemsPhrase(s: Set<string>) {
  if (s.size > 1) return "a mix of IP (PoE) and Turbo HD (coax) systems";
  return s.has("IP") ? "all of them IP (PoE)" : "all of them Turbo HD (coax)";
}

const resRange = (res: number[]) =>
  res.length === 0 ? "" : res.length === 1 ? resLabel(res[0]) : `${resLabel(res[0])} to ${resLabel(res.at(-1)!)}`;

const GUIDE_SETS: [RegExp, string[]][] = [
  [/^ip-poe/, ["nvr-cctv-system-uk-guide", "poe-network-switch-cctv-guide", "cat5e-vs-cat6-cctv-cable", "nvr-meaning-in-cctv"]],
  [/^turbo-hd/, ["dvr-cctv-keep-hybrid-or-ip-nvr", "shotgun-cable-cctv-rg59-run-length-voltage-drop", "dvr-meaning-cctv-and-tv", "12v-cctv-power-supply-sizing-amps"]],
  [/4k/, ["4k-cctv-cameras-uk", "best-cctv-system-uk-framework", "surveillance-hard-drive-vs-desktop-hdd", "cctv-buyers-guide-uk"]],
  [/colour|white|black/, ["turret-vs-bullet-camera", "hikvision-colorvu-camera-guide-uk", "best-cctv-outdoor-security-cameras-2026", "cctv-buyers-guide-uk"]],
  [/^(1|2|3|4)-camera/, ["4-camera-cctv-kit-uk", "4k-cctv-cameras-uk", "best-small-business-cctv-system-uk", "hikvision-or-dahua-uk-small-business-cctv"]],
  [/-camera/, ["best-small-business-cctv-system-uk", "nvr-cctv-system-uk-guide", "commercial-cctv-camera-guide-uk", "hikvision-or-dahua-uk-small-business-cctv"]],
  [/./, ["cctv-buyers-guide-uk", "best-home-cctv-systems-uk-2026", "best-small-business-cctv-system-uk", "4-camera-cctv-kit-uk"]],
];

function relatedGuides(slug: string): BlogPost[] {
  const set = GUIDE_SETS.find(([re]) => re.test(slug))?.[1] ?? [];
  return set.map((s) => getBlogPost(s)).filter((p): p is BlogPost => !!p).slice(0, 4);
}

function categoryFaqs(name: string, s: ReturnType<typeof rangeStats>, kits: KitSummary[]): Faq[] {
  const cams = kits.length ? Math.round(median(kits.map((k) => k.cameraCount)) ?? 4) : 4;
  const per = (res: number) => Math.floor(1000 / (cams * (res === 8 ? 4 : res === 2 ? 1 : 2) * 10.8));
  return [
    {
      q: "How many days of footage do kits in this range keep?",
      a: `That depends on the drive size, the number of cameras and their resolution. With ${cams} ${cams === 1 ? "camera" : "cameras"} recording all the time, each terabyte holds roughly ${per(2)} days at 2MP or ${per(8)} days at 4K.${s.days ? ` The typical kit in ${name} keeps about ${s.days} days.` : ""} Recording only on motion stretches that further.`,
    },
    {
      q: "Channels and cameras — what's the difference?",
      a: `Channels are how many cameras the recorder can take; cameras are how many come in the box. Recorders here take ${s.minCh === s.maxCh ? s.minCh : `${s.minCh} to ${s.maxCh}`} cameras${s.maxSpare ? `, and some leave room for up to ${s.maxSpare} more` : ""}, so you can add cameras later without a new recorder.`,
    },
    {
      q: "What's in the box?",
      a: `A recorder (an NVR for IP kits, a DVR for Turbo HD) with matching cameras${s.allDrives ? " and a hard drive" : ", and in most cases a hard drive"}. Each kit's page lists every part with its model number.`,
    },
    {
      q: "How much do kits in this range cost?",
      a:
        s.minPrice !== undefined && s.maxPrice !== undefined
          ? `Kits here currently run from ${gbp(s.minPrice)} to ${gbp(s.maxPrice)} including VAT; the price on each card is the full kit price.`
          : "Each card shows the full kit price including VAT.",
    },
  ];
}

/** Kit range page (/categories/cctv-kits and every range below it), rendered by the shared /categories/[slug] route. */
export function KitCategoryPage({
  category,
  searchParams,
}: {
  category: Category;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const fixed: KitFilters = kitCategoryFilter(category.slug) ?? {};
  const all = getKitSummaries();
  const sp = searchParams as SearchParamsRecord;
  const user = parseFilters(sp);
  const inRange = all.filter((k) => matches(k, fixed));
  const scoped = user.system && !fixed.system ? inRange.filter((k) => k.system === user.system) : inRange;
  const stats = rangeStats(scoped);
  const crumbs = category.breadcrumbs.map((c) => ({ label: c.name, href: c.href }));
  const name = crumbs.at(-1)?.label ?? category.title ?? "CCTV Kits";

  const sellers = getBestSellers();
  const rangeSellers = sellers.filter((b) => matches(b.kit, fixed));
  const shownSellers = (rangeSellers.length >= 3 ? rangeSellers : sellers).slice(0, 8);

  const ranges = getKitRanges();
  const guides = relatedGuides(category.slug);
  const faqs = categoryFaqs(name, stats, scoped);

  return (
    <div className={cn(CONTAINER, STORE_HEADINGS, "py-8")}>
      <ChevronBreadcrumb items={crumbs} />
      <h1 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">{category.title ?? name}</h1>
      {/* Intro written for this range in the admin (Categories), above the generated summary. */}
      {category.description && <MarkdownContent source={category.description} className="mb-4 max-w-3xl" />}
      <div className="mb-6 max-w-3xl space-y-2 text-sm leading-relaxed">
        <p className="text-muted-foreground">
          {scoped.length
            ? `${stats.ready ? `${stats.ready.toLocaleString("en-GB")} kits in this range are ready to send` : "Kits in this range are ordered in for you"}, ${systemsPhrase(stats.systems)}. Recorders take ${stats.minCh === stats.maxCh ? stats.minCh : `${stats.minCh} to ${stats.maxCh}`} cameras${stats.res.length ? `, the cameras run at ${resRange(stats.res)}` : ""}${stats.minTb ? ` and drives go from ${storageLabelFor(stats.minTb)} to ${storageLabelFor(stats.maxTb!)}` : ""}.${stats.days ? ` A typical kit here keeps about ${stats.days} days of non-stop recording before the oldest footage is overwritten — our estimate at normal settings.` : ""}${stats.brands.length ? ` Brands: ${listJoin(stats.brands)}.` : ""}`
            : "There are no ready-made kits in this range at the moment."}
        </p>
        {category.slug === "cctv-kits" && (
          <p>
            <Link href="/kits" className="text-primary font-semibold hover:underline">
              Stuck choosing? Let the kit finder help
            </Link>
          </p>
        )}
      </div>
      <BestSellers
        items={shownSellers}
        intro="Customers buy these from this range more than any other."
        className="mb-8"
        seeAll={sellers.length}
      />
      <KitListing kits={all} basePath={`/categories/${category.slug}`} fixed={fixed} searchParams={sp} />
      <section className="mx-auto mt-12 w-full max-w-4xl" aria-labelledby="kit-hub-faq">
        <h2 id="kit-hub-faq" className="text-xl font-bold tracking-tight">
          {name}: your questions answered
        </h2>
        <FaqList faqs={faqs} />
      </section>
      {scoped.length > 0 && (
        <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-6 sm:px-6">
          <Prose>
            <h2>{name}: what you get</h2>
            <p>
              Every kit in {name.toLowerCase().startsWith("cctv") ? "this range" : name} is a recorder sold together with
              matching cameras{stats.allDrives ? " and a hard drive" : ""}, so the parts are already known to work
              together. {stats.systems.size > 1 ? "You can choose between network (PoE) kits and coax (Turbo HD) kits." : ""}
            </p>
            <h3>How to choose</h3>
            <ul>
              <li>
                <strong>Cable</strong>: IP kits run one network cable to each camera; Turbo HD kits reuse round coax
                cable from an older system.
              </li>
              <li>
                <strong>Channels</strong>: recorders here take{" "}
                {stats.minCh === stats.maxCh ? stats.minCh : `${stats.minCh} to ${stats.maxCh}`} cameras — pick spare
                channels if you may add cameras later.
              </li>
              {stats.res.length > 0 && (
                <li>
                  <strong>Resolution</strong>: cameras run at {resRange(stats.res)}; higher resolution lets you zoom
                  further but fills the drive faster.
                </li>
              )}
              {stats.minTb && (
                <li>
                  <strong>Storage</strong>: drives from {storageLabelFor(stats.minTb)} to {storageLabelFor(stats.maxTb!)}
                  ; each card shows roughly how many days that keeps.
                </li>
              )}
            </ul>
          </Prose>
          <div className="mt-8">
            <h2 className="text-xl font-bold tracking-tight">{name} — frequently asked questions</h2>
            <FaqList
              faqs={[
                {
                  q: "What's the difference between a DVR kit and an NVR kit?",
                  a: "A DVR kit records coax (Turbo HD) cameras; an NVR kit records network cameras, usually powered over the same cable (PoE).",
                },
                {
                  q: "Will I be able to add more cameras later?",
                  a: stats.maxSpare
                    ? `Yes, on kits whose recorder has spare channels — some here have room for up to ${stats.maxSpare} more cameras. Each card tells you how much space is left.`
                    : "Not on the same recorder: every kit here uses all of its recorder's channels, so adding a camera means a bigger recorder.",
                },
              ]}
            />
          </div>
        </div>
      )}
      <nav aria-label="Browse kit ranges" className="border-border mt-10 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Browse kit ranges</h2>
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {ranges.map((g) => (
            <section key={g.title}>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">{g.title}</h3>
              <ul className="space-y-1.5 text-sm">
                {g.links.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={l.href}
                      aria-current={l.slug === category.slug ? "page" : undefined}
                      className="text-muted-foreground hover:text-foreground break-words hover:underline aria-[current=page]:text-foreground aria-[current=page]:font-medium"
                    >
                      {l.name}
                      <span className="ml-1.5 text-xs">{l.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </nav>
      {guides.length > 0 && (
        <section className="mx-auto w-full max-w-4xl px-4 pt-8 pb-6 sm:px-6" aria-labelledby="category-guides-heading">
          <h2 id="category-guides-heading" className="text-xl font-bold tracking-tight">
            Related guides
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/blog/${g.slug}`}
                  className="border-border bg-card hover:border-primary block h-full rounded-lg border p-4 transition-colors"
                >
                  <span className="text-foreground block text-sm font-semibold break-words">{g.title}</span>
                  {g.excerpt && (
                    <span className="text-muted-foreground mt-1 line-clamp-2 block text-xs leading-relaxed">
                      {g.excerpt}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/guides" className="text-primary font-semibold underline-offset-2 hover:underline">
              All guides →
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
