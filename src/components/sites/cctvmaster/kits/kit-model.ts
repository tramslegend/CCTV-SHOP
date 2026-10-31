// Client-safe kit types, wording and filter logic shared by /kits, the kit category pages and the kit finder.
// Server-only data loading lives in ./kit-data.ts.

export type KitSystem = "IP" | "ANALOG";
export type KitUse = "home" | "small-business" | "large-property" | "commercial";
export type KitColour = "white" | "black" | "mixed";
export type KitForm = "bullet" | "turret" | "dome" | "ptz";
export type SortKey = "recommended" | "price-asc" | "price-desc" | "cameras-asc" | "cameras-desc";

export interface KitCameraGroup {
  qty: number;
  label: string;
  image?: string;
}

/** Everything a kit card, the filters and the finder need about one ready-made kit (prices inc. VAT). */
export interface KitSummary {
  slug: string;
  sku: string;
  name: string;
  href: string;
  headline: string;
  image?: string;
  imageAlt: string;
  brand?: string;
  system: KitSystem;
  cameraCount: number;
  channelCount: number;
  /** Resolution band: 2, 3, 4, 5 or 8 (4K). */
  res?: number;
  resLabel?: string;
  cameraGroups: KitCameraGroup[];
  recorderLabel: string;
  recorderImage?: string;
  storageLabel?: string;
  storageTb?: number;
  recordingDays?: number;
  use?: KitUse;
  colour?: KitColour;
  form?: KitForm;
  price: number;
  partsTotal?: number;
  savingPercent?: number;
  priceBand?: string;
  inStock: boolean;
  bestSellerRank?: number;
  order: number;
}

export interface BestSeller {
  id: string;
  use: "home" | "business" | "yard";
  name: string;
  rank: number;
  blurb: string;
  kit: KitSummary;
}

// ---------- wording (UI labels from the source) ----------

export const USE_LABELS: Record<KitUse, string> = {
  home: "Home / small property",
  "small-business": "Shop or small business",
  "large-property": "Large property or yard",
  commercial: "Commercial site",
};

export const COVERS: Record<KitUse, string> = {
  home: "Suits a house",
  "small-business": "Suits a shop or small business",
  "large-property": "Suits a big property or yard",
  commercial: "Suits a commercial site",
};

export const SYSTEM_LABELS: Record<KitSystem, string> = { IP: "IP / PoE", ANALOG: "Turbo HD (coax)" };

export const RES_OPTIONS = [2, 3, 4, 5, 8] as const;
export const resLabel = (res: number) => (res === 8 ? "4K" : `${res}MP`);

export const FORM_LABELS: Record<KitForm, string> = {
  bullet: "Bullet (long body)",
  turret: "Turret (ball in a cup)",
  dome: "Dome",
  ptz: "PTZ (motorised)",
};

export const COLOUR_LABELS: Record<KitColour, string> = {
  white: "White cameras",
  black: "Black cameras",
  mixed: "Mixed colours",
};

export const PRICE_BANDS = [
  { value: "under-500", label: "Under £500" },
  { value: "500-1000", label: "£500 – £1,000" },
  { value: "1000-2000", label: "£1,000 – £2,000" },
  { value: "2000-5000", label: "£2,000 – £5,000" },
  { value: "5000-plus", label: "£5,000+" },
] as const;

export const CAMERA_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32];

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "cameras-asc", label: "Fewest cameras" },
  { value: "cameras-desc", label: "Most cameras" },
];

export const PAGE_SIZE = 24;

export const kitUseForCameras = (n: number): KitUse | undefined =>
  n <= 0 ? undefined : n <= 4 ? "home" : n <= 8 ? "small-business" : n <= 16 ? "large-property" : "commercial";

export const storageLabelFor = (tb: number) => (tb < 1 ? `${Math.round(tb * 1000)}GB` : `${tb}TB`);

export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** £1,234.56 */
export const gbp = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------- filters ----------

export interface KitFilters {
  use?: KitUse;
  cameras?: number;
  system?: KitSystem;
  res?: number;
  resmin?: number;
  form?: KitForm;
  colour?: KitColour;
  storage?: number;
  price?: string;
  brand?: string;
  stock?: boolean;
}

export type FilterKey = keyof KitFilters;

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const isOneOf = <T extends string>(v: string | undefined, list: readonly T[]): v is T => !!v && (list as readonly string[]).includes(v);

export function parseFilters(sp: SearchParamsRecord): KitFilters {
  const f: KitFilters = {};
  const use = first(sp.use);
  if (isOneOf(use, ["home", "small-business", "large-property", "commercial"] as const)) f.use = use;
  const cameras = Number(first(sp.cameras));
  if (Number.isInteger(cameras) && cameras > 0) f.cameras = cameras;
  const system = first(sp.system)?.toUpperCase();
  if (system === "IP" || system === "ANALOG") f.system = system;
  const res = first(sp.res);
  const resNum = res === "4k" || res === "4K" ? 8 : Number(res);
  if ((RES_OPTIONS as readonly number[]).includes(resNum)) f.res = resNum;
  const resmin = first(sp.resmin);
  const resminNum = resmin === "4k" || resmin === "4K" ? 8 : Number(resmin);
  if ((RES_OPTIONS as readonly number[]).includes(resminNum)) f.resmin = resminNum;
  const form = first(sp.form);
  if (isOneOf(form, ["bullet", "turret", "dome", "ptz"] as const)) f.form = form;
  const colour = first(sp.colour);
  if (isOneOf(colour, ["white", "black", "mixed"] as const)) f.colour = colour;
  const storage = Number(first(sp.storage));
  if (storage > 0) f.storage = storage;
  const price = first(sp.price);
  if (PRICE_BANDS.some((b) => b.value === price)) f.price = price;
  const brand = first(sp.brand);
  if (brand) f.brand = brand;
  if (first(sp.stock) === "1") f.stock = true;
  return f;
}

export const parseSort = (sp: SearchParamsRecord): SortKey => {
  const s = first(sp.sort);
  return SORTS.some((o) => o.value === s) ? (s as SortKey) : "recommended";
};

export const parsePage = (sp: SearchParamsRecord) => {
  const n = Number(first(sp.page));
  return Number.isInteger(n) && n > 1 ? n : 1;
};

const sameBrand = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export function matches(k: KitSummary, f: KitFilters, skip?: FilterKey): boolean {
  if (skip !== "use" && f.use && k.use !== f.use) return false;
  if (skip !== "cameras" && f.cameras && k.cameraCount !== f.cameras) return false;
  if (skip !== "system" && f.system && k.system !== f.system) return false;
  if (skip !== "res" && f.res && k.res !== f.res) return false;
  if (skip !== "resmin" && f.resmin && (k.res ?? 0) < f.resmin) return false;
  if (skip !== "form" && f.form && k.form !== f.form) return false;
  if (skip !== "colour" && f.colour && k.colour !== f.colour) return false;
  if (skip !== "storage" && f.storage && k.storageTb !== f.storage) return false;
  if (skip !== "price" && f.price && k.priceBand !== f.price) return false;
  if (skip !== "brand" && f.brand && !sameBrand(k.brand, f.brand)) return false;
  if (skip !== "stock" && f.stock && !k.inStock) return false;
  return true;
}

export function sortKits(kits: KitSummary[], sort: SortKey): KitSummary[] {
  const list = [...kits];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "cameras-asc":
      return list.sort((a, b) => a.cameraCount - b.cameraCount || a.price - b.price);
    case "cameras-desc":
      return list.sort((a, b) => b.cameraCount - a.cameraCount || a.price - b.price);
    default:
      return list.sort((a, b) => a.order - b.order);
  }
}

/** Canonical query string for a filter set (keys in a stable order). */
export function filterQuery(f: KitFilters, extra: { sort?: SortKey; page?: number } = {}): string {
  const q = new URLSearchParams();
  if (f.use) q.set("use", f.use);
  if (f.cameras) q.set("cameras", String(f.cameras));
  if (f.system) q.set("system", f.system);
  if (f.res) q.set("res", String(f.res));
  if (f.resmin) q.set("resmin", String(f.resmin));
  if (f.form) q.set("form", f.form);
  if (f.colour) q.set("colour", f.colour);
  if (f.storage) q.set("storage", String(f.storage));
  if (f.price) q.set("price", f.price);
  if (f.brand) q.set("brand", f.brand);
  if (f.stock) q.set("stock", "1");
  if (extra.sort && extra.sort !== "recommended") q.set("sort", extra.sort);
  if (extra.page && extra.page > 1) q.set("page", String(extra.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Short human labels for the active filters ("4 cameras", "IP / PoE", …). */
export function filterLabels(f: KitFilters): string[] {
  const out: string[] = [];
  if (f.use) out.push(USE_LABELS[f.use]);
  if (f.cameras) out.push(`${f.cameras} ${plural(f.cameras, "camera", "cameras")}`);
  if (f.system) out.push(SYSTEM_LABELS[f.system]);
  if (f.res) out.push(resLabel(f.res));
  if (f.resmin) out.push(f.resmin === 8 ? "4K" : `${f.resmin}MP+`);
  if (f.form) out.push(FORM_LABELS[f.form]);
  if (f.colour) out.push(COLOUR_LABELS[f.colour]);
  if (f.storage) out.push(storageLabelFor(f.storage));
  if (f.price) out.push(PRICE_BANDS.find((b) => b.value === f.price)?.label ?? f.price);
  if (f.brand) out.push(f.brand);
  if (f.stock) out.push("ready to send");
  return out;
}

// ---------- kit finder (four questions) ----------

/** Compact row per kit for the client-side finder: [use, system, res, priceBand]. */
export type FinderRow = [KitUse | "", KitSystem, number, string];

export const FINDER_USES: KitUse[] = ["home", "small-business", "large-property", "commercial"];
