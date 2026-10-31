// Server-side kit data for /kits, the kit category pages and the premises pages.
// Derives card fields (camera groups, colour, use, recording days…) from the scraped kit records.
import { getCategories, getCategory, getKits, getProduct } from "@/lib/cctvmaster/catalog";
import { withVat } from "@/lib/cctvmaster/money";
import type { Category, KitComponent, Product } from "@/lib/cctvmaster/types";
import {
  type BestSeller,
  type FinderRow,
  type KitColour,
  type KitFilters,
  type KitForm,
  type KitSummary,
  type KitSystem,
  matches,
  parseFilters,
  resLabel,
  storageLabelFor,
  kitUseForCameras,
} from "./kit-model";

// ---------- camera classification ----------

const RES_FROM_SLUG: Record<string, number> = { "2mp": 2, "3mp": 3, "4mp": 4, "5mp": 5, "8mp": 8 };

/** Resolution band of a camera product (category first, then the name). */
export function cameraRes(p: Pick<Product, "name" | "categoryPath">): number | undefined {
  if (/\b3\s?MP\b/i.test(p.name)) return 3;
  for (const c of p.categoryPath ?? []) {
    const r = c.slug ? RES_FROM_SLUG[c.slug.split("-").pop() ?? ""] ?? RES_FROM_SLUG[c.slug] : undefined;
    if (r) return r;
  }
  const m = p.name.match(/\b(2|4|5|8)\s?MP\b/i);
  if (m) return Number(m[1]);
  if (/\b4K\b/i.test(p.name)) return 8;
  return undefined;
}

export function cameraForm(name: string): KitForm | undefined {
  if (/\bPTZ\b|speed dome/i.test(name)) return "ptz";
  if (/bullet/i.test(name)) return "bullet";
  if (/turret/i.test(name)) return "turret";
  if (/dome/i.test(name)) return "dome";
  return undefined;
}

const FORM_WORD: Record<KitForm, string> = { bullet: "Bullet", turret: "Turret", dome: "Dome", ptz: "PTZ" };

function cameraColour(c: KitComponent, all: KitComponent[]): "white" | "black" | undefined {
  const p = getProduct(c.href.replace("/products/", ""));
  const attr = p?.attributes?.find((a) => /^colou?r$/i.test(a.name))?.value.toLowerCase();
  if (attr === "white" || attr === "black") return attr;
  const sku = c.sku.toLowerCase();
  const text = `${sku} ${c.name.toLowerCase()}`;
  if (/-b$/.test(sku) || text.includes("black")) return "black";
  if (/-w$/.test(sku) || text.includes("white")) return "white";
  // The plain model sold alongside its "-BLACK" twin is the white one.
  if (all.some((o) => o !== c && o.sku.toLowerCase().startsWith(`${sku}-`) && cameraColour(o, []) === "black")) return "white";
  return undefined;
}

function kitColour(cams: KitComponent[]): KitColour | undefined {
  const colours = cams.map((c) => cameraColour(c, cams));
  if (!colours.length || colours.some((c) => !c)) return undefined;
  if (colours.every((c) => c === "white")) return "white";
  if (colours.every((c) => c === "black")) return "black";
  return "mixed";
}

// Average bitrate per camera (Mbps) at each resolution band, as the source estimates recording days.
const MBPS: Record<number, number> = { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 4 };
const GB_PER_MBPS_DAY = 10.8;

/** Days of continuous recording for a set of cameras on a drive of `tb` terabytes. */
export function recordingDays(cams: { res?: number; qty: number }[], tb: number): number | undefined {
  const gbPerDay = cams.reduce((sum, c) => sum + c.qty * (MBPS[c.res ?? 4] ?? 2) * GB_PER_MBPS_DAY, 0);
  return gbPerDay > 0 && tb > 0 ? Math.floor((tb * 1000) / gbPerDay) : undefined;
}

const normaliseBrand = (b?: string) => (b ? (b === "ProLux" ? "Prolux" : b) : undefined);

// ---------- best sellers (source's ranking and copy) ----------

const BEST_SELLER_META: (Omit<BestSeller, "kit"> & { slug: string })[] = [
  { id: "dvr-4cam-4k-1tb", use: "home", rank: 1, name: "Four 4K cameras for your home", blurb: "Cover the front, back, drive and side with the kit most customers pick.", slug: "hikvision-4-channel-4k-cctv-kit-4-ds-2ce78u0t-turret-cameras-1tb" },
  { id: "dvr-4cam-4k-2tb", use: "home", rank: 2, name: "Four 4K cameras with a 2TB drive", blurb: "Same set of four, but it keeps footage for longer.", slug: "hikvision-4-channel-4k-cctv-kit-4-ds-2ce78u0t-turret-cameras-2tb" },
  { id: "dvr-4cam-3k-1tb", use: "home", rank: 3, name: "Four-camera 3K kit for less", blurb: "Clear enough to spot who is at your door, at a lower cost.", slug: "hikvision-4-channel-5mp-cctv-kit-4-turret-cameras-1tb-recording" },
  { id: "nvr-4cam-4k-2tb", use: "home", rank: 4, name: "Four-camera 4K network kit, 2TB", blurb: "Each camera needs just one cable, which keeps the fitting tidy.", slug: "hikvision-4-channel-4k-cctv-kit-4-ds-2cd1383g2-turret-cameras-2tb" },
  { id: "nvr-4cam-4k-1tb", use: "home", rank: 5, name: "Four-camera 4K network kit", blurb: "Cameras and recorder arrive ready to connect and switch on.", slug: "hikvision-4-channel-4k-cctv-kit-4-ds-2cd1383g2-turret-cameras-1tb" },
  { id: "dvr-4cam-3k-2tb", use: "home", rank: 6, name: "Four 3K cameras with a 2TB drive", blurb: "Our lower-cost four-camera set, now with extra storage.", slug: "hikvision-ids-7204hqhi-m1-xt-4-channel-dvr-cctv-kit-4-ds-2ce78k0t-hd4-ids7204hqhim-2-2" },
  { id: "dvr-2cam-4k-1tb", use: "home", rank: 7, name: "Two 4K cameras, front and back", blurb: "Enough for a flat, or a door and a garden.", slug: "hikvision-4-channel-4k-cctv-kit-2-turret-cameras-1tb-recording" },
  { id: "dvr-6cam-4k-2tb", use: "yard", rank: 8, name: "Six 4K cameras for a bigger home", blurb: "Recorder has two spare inputs if you want more cameras later.", slug: "hikvision-8-channel-4k-cctv-kit-6-turret-cameras-2tb-recording" },
  { id: "dvr-2cam-4k-2tb", use: "home", rank: 9, name: "Two 4K cameras with a 2TB drive", blurb: "A pair of cameras that records for twice as long.", slug: "hikvision-ids-7204huhi-m1-xt-4-channel-dvr-cctv-kit-2-ds-2ce78u0t-hd4-ids7204huhim-3-2" },
  { id: "dvr-8cam-4k-2tb", use: "business", rank: 10, name: "Eight 4K cameras for shop or home", blurb: "Watch every side of the building from a single recorder.", slug: "hikvision-8-channel-4k-cctv-kit-8-ds-2ce78u0t-turret-cameras-2tb" },
  { id: "dvr-4cam-4k-4tb", use: "home", rank: 11, name: "Four 4K cameras with a 4TB drive", blurb: "Keep weeks of recordings before the oldest are overwritten.", slug: "hikvision-ids-7204huhi-m1-xt-4-channel-dvr-cctv-kit-4-ds-2ce78u0t-hd4-ids7204huhim" },
  { id: "dvr-2cam-3k-1tb", use: "home", rank: 12, name: "Two-camera 3K kit to start with", blurb: "The cheapest way for you to get recording today.", slug: "hikvision-ids-7204hqhi-m1-xt-4-channel-dvr-cctv-kit-2-ds-2ce78k0t-hd4-ids7204hqhim-4-2" },
  { id: "nvr-4cam-4k-4tb", use: "home", rank: 13, name: "Four-camera 4K network kit, 4TB", blurb: "Network cameras with about a month of saved video.", slug: "hikvision-ds-7604nxi-k1-4p-4-channel-nvr-cctv-kit-4-ds-2cd1383g2-liu-ip4-ds7604nxik14-3" },
  { id: "nvr-8cam-4k-2tb", use: "business", rank: 14, name: "Eight-camera 4K network kit for business", blurb: "Eight network cameras covering a shop, an office or a yard.", slug: "hikvision-8-channel-4k-cctv-kit-8-ds-2cd1383g2-turret-cameras-2tb" },
  { id: "nvr-5cam-4k-2tb", use: "business", rank: 15, name: "Five-camera 4K network kit for business", blurb: "Five network cameras and three free inputs for later.", slug: "hikvision-8-channel-4k-cctv-kit-5-turret-cameras-2tb-recording" },
];

// ---------- summaries ----------

// Built from the catalogue snapshot's kit list. getKits() returns a new array after every snapshot reload (an admin
// change), which rebuilds the summaries on the next request.
let summaryCache: { source: Product[]; summaries: KitSummary[]; bySlug: Map<string, KitSummary> } | undefined;

const RES_FROM_CATEGORY: Record<string, number> = { "2mp-kits": 2, "3mp-kits": 3, "4mp-kits": 4, "5mp-kits": 5, "4k-kits": 8 };

function summarise(p: Product, index: number, rankBySlug: Map<string, number>): KitSummary {
  const kit = p.kit!;
  const system: KitSystem = kit.systemType === "IP" ? "IP" : "ANALOG";
  const cams = kit.components.filter((c) => c.role === "camera");
  const groups = cams.map((c) => {
    const cp = getProduct(c.href.replace("/products/", ""));
    const res = cp ? cameraRes(cp) : kit.resolutionMp;
    const form = cameraForm(c.name);
    return { qty: c.qty, res, form, image: c.image, label: `${res ? resLabel(res) : ""} ${form ? FORM_WORD[form] : "Camera"}`.trim() };
  });
  const resFromCat = (p.categoryPath ?? []).map((c) => RES_FROM_CATEGORY[c.slug ?? ""]).find(Boolean);
  const res = resFromCat ?? kit.resolutionMp;
  const groupRes = [...new Set(groups.map((g) => g.res).filter((r): r is number => !!r))].sort((a, b) => a - b);
  const forms = [...new Set(groups.map((g) => g.form))];
  const recorder = kit.components.find((c) => c.role === "recorder");
  const brand = normaliseBrand(p.brand);
  const headline = `${brand ? `${brand} ` : ""}${kit.channelCount}-channel CCTV kit`;
  const own = kit.siblings?.find((s) => s.sku === p.sku);
  const storageTb = kit.storage?.capacityTb;
  const days = own?.recordingDays ?? (storageTb ? recordingDays(groups, storageTb) : undefined);
  const storageLabel = kit.storage ? (kit.storage.token || storageLabelFor(kit.storage.capacityTb)) : undefined;
  const groupText = groups.map((g) => `${g.qty}× ${g.label}`).join(", ");
  return {
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    href: `/products/${p.slug}`,
    headline,
    image: p.images?.[0],
    imageAlt: `${headline}: ${kit.cameraCount} ${kit.cameraCount === 1 ? "camera" : "cameras"}${groupText ? ` (${groupText})` : ""}${storageLabel ? `, ${storageLabel} hard drive` : ""}`,
    brand,
    system,
    cameraCount: kit.cameraCount,
    channelCount: kit.channelCount,
    res,
    resLabel: groupRes.length > 1 ? groupRes.map(resLabel).join(" + ") : res ? resLabel(res) : undefined,
    cameraGroups: groups.map(({ qty, label, image }) => ({ qty, label, image })),
    recorderLabel: `${kit.channelCount}-channel ${system === "IP" ? "NVR" : "DVR"}`,
    recorderImage: recorder?.image,
    storageLabel,
    storageTb,
    recordingDays: days,
    use: kitUseForCameras(kit.cameraCount),
    colour: kitColour(cams),
    form: forms.length === 1 ? forms[0] : undefined,
    price: withVat(p.price),
    partsTotal: kit.bundleSaving ? withVat(kit.bundleSaving.partsTotal) : undefined,
    savingPercent: kit.bundleSaving?.percent,
    priceBand: kit.priceBand,
    inStock: kit.stockState ? kit.stockState === "in_stock" : !!p.inStock,
    bestSellerRank: rankBySlug.get(p.slug),
    order: index,
  };
}

export function getKitSummaries(): KitSummary[] {
  const kits = getKits();
  if (summaryCache?.source !== kits) {
    const rankBySlug = new Map(BEST_SELLER_META.map((b) => [b.slug, b.rank]));
    const raw = kits.map((p, i) => summarise(p, i, rankBySlug));
    // "Recommended", approximating the source: kits ready to send first, led by the well-stocked 10TB builds.
    const ranked = [...raw].sort(
      (a, b) =>
        Number(b.inStock) - Number(a.inStock) ||
        Math.abs((a.storageTb ?? 0) - 10) - Math.abs((b.storageTb ?? 0) - 10) ||
        a.channelCount - a.cameraCount - (b.channelCount - b.cameraCount) ||
        a.cameraGroups.length - b.cameraGroups.length ||
        Number(b.brand === "Hikvision") - Number(a.brand === "Hikvision") ||
        a.order - b.order,
    );
    ranked.forEach((k, i) => (k.order = i));
    summaryCache = { source: kits, summaries: ranked, bySlug: new Map(ranked.map((k) => [k.slug, k])) };
  }
  return summaryCache.summaries;
}

export const getKitSummary = (slug: string) => {
  getKitSummaries();
  return summaryCache?.bySlug.get(slug);
};

export function getBestSellers(): BestSeller[] {
  return BEST_SELLER_META.flatMap(({ slug, ...meta }) => {
    const kit = getKitSummary(slug);
    return kit ? [{ ...meta, kit }] : [];
  });
}

export const getFinderRows = (): FinderRow[] =>
  getKitSummaries().map((k) => [k.use ?? "", k.system, k.res ?? 0, k.priceBand ?? ""]);

/** Browse order for /kits/browse/[page]: smallest systems first. */
export const getBrowseOrder = () =>
  [...getKitSummaries()].sort((a, b) => a.cameraCount - b.cameraCount || Number(b.inStock) - Number(a.inStock) || a.price - b.price);

// ---------- kit categories ----------

/** A kit range rule stored in the admin (categories.kit_filter), read with the same parser as the URL filters. */
export const storedKitFilter = (rule: Record<string, string | number>): KitFilters =>
  parseFilters(Object.fromEntries(Object.entries(rule).map(([key, value]) => [key, String(value)])));

/**
 * The filter a kit category applies, or undefined if the slug is not a kit range: the rule set in the admin when the
 * range has one, otherwise the built-in rule for its slug.
 */
export function kitCategoryFilter(slug: string): KitFilters | undefined {
  const stored = getCategory(slug)?.kitFilter;
  return stored ? storedKitFilter(stored) : builtInKitFilter(slug);
}

/** The rule a kit range follows when the admin hasn't set one, derived from its slug ("4-camera-kits"…). */
export function builtInKitFilter(slug: string): KitFilters | undefined {
  if (slug === "cctv-kits") return {};
  if (slug === "turbo-hd-kits") return { system: "ANALOG" };
  if (slug === "ip-poe-kits") return { system: "IP" };
  if (slug === "white-kits") return { colour: "white" };
  if (slug === "black-kits") return { colour: "black" };
  if (slug === "mixed-colour-kits") return { colour: "mixed" };
  const cams = slug.match(/^(\d+)-camera-kits$/);
  if (cams) return { cameras: Number(cams[1]) };
  const res = slug.match(/^(?:(turbo-hd|ip-poe)-)?(2mp|3mp|4mp|5mp|4k)-kits$/);
  if (res) {
    const f: KitFilters = { res: res[2] === "4k" ? 8 : Number(res[2].replace("mp", "")) };
    if (res[1]) f.system = res[1] === "ip-poe" ? "IP" : "ANALOG";
    return f;
  }
  return undefined;
}

export const isKitCategory = (c: Pick<Category, "slug" | "breadcrumbs">) =>
  c.slug === "cctv-kits" || c.breadcrumbs.some((b) => b.href === "/categories/cctv-kits");

export interface RangeLink {
  slug: string;
  name: string;
  href: string;
  count: number;
}

export interface RangeGroup {
  title: string;
  links: RangeLink[];
}

/** "Browse kit ranges" groups with local kit counts. */
export function getKitRanges(): RangeGroup[] {
  const kits = getKitSummaries();
  const cats = getCategories().filter(isKitCategory);
  const link = (slug: string, name?: string): RangeLink | undefined => {
    const c = cats.find((x) => x.slug === slug);
    const f = kitCategoryFilter(slug);
    if (!c || !f) return undefined;
    const crumb = c.breadcrumbs.at(-1)?.name ?? slug;
    return { slug, name: name ?? crumb, href: `/categories/${slug}`, count: kits.filter((k) => matches(k, f)).length };
  };
  const cameraSlugs = cats
    .map((c) => c.slug.match(/^(\d+)-camera-kits$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map((m) => m[0]);
  const pick = (slugs: string[]) => slugs.map((s) => link(s)).filter((l): l is RangeLink => !!l && l.count > 0);
  return [
    { title: "By number of cameras", links: pick(cameraSlugs) },
    {
      title: "By system",
      links: pick([
        "ip-poe-kits", "ip-poe-2mp-kits", "ip-poe-4mp-kits", "ip-poe-5mp-kits", "ip-poe-4k-kits",
        "turbo-hd-kits", "turbo-hd-2mp-kits", "turbo-hd-3mp-kits", "turbo-hd-4mp-kits", "turbo-hd-5mp-kits", "turbo-hd-4k-kits",
      ]),
    },
    { title: "By resolution", links: pick(["2mp-kits", "3mp-kits", "4mp-kits", "5mp-kits", "4k-kits"]) },
    { title: "More ranges", links: pick(["black-kits", "mixed-colour-kits", "white-kits"]) },
  ];
}
