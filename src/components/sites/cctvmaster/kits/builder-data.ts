// Server-side parts catalogue and seeds for the kit builder, derived from the local product data.
import { getKits, getProduct, getShopProducts } from "@/lib/cctvmaster/catalog";
import type { Product } from "@/lib/cctvmaster/types";
import {
  ampsFor,
  type BuilderCamera,
  type BuilderCatalog,
  type BuilderDrive,
  type BuilderGroup,
  type BuilderLine,
  type BuilderOptionItem,
  type BuilderPart,
  type BuilderPsu,
  type BuilderRecorder,
  type BuilderSeed,
  type LineRole,
  resName,
  tbLabel,
} from "./builder-model";
import { cameraRes } from "./kit-data";
import type { KitSystem } from "./kit-model";

const path = (p: Product) => (p.categoryPath ?? []).map((c) => c.slug ?? "");
const attr = (p: Product, re: RegExp) => p.attributes?.find((a) => re.test(a.name))?.value;
const yes = (v?: string) => !!v && !/^(no|none|n\/a|-|false)$/i.test(v.trim());

/** How often each product appears in a ready-made kit (used to pick "Our pick"). */
function usage(): Map<string, number> {
  const m = new Map<string, number>();
  for (const k of getKits()) for (const c of k.kit!.components) {
    const slug = c.href.replace("/products/", "");
    m.set(slug, (m.get(slug) ?? 0) + 1);
  }
  return m;
}

const part = (p: Product, detail?: string): BuilderPart => ({
  slug: p.slug,
  sku: p.sku,
  name: p.name,
  price: p.price,
  image: p.images?.[0],
  detail,
});

function cameraSpecs(p: Product, res: number): string {
  const out = [`${resName(res)} picture`];
  if (yes(attr(p, /colorvu/i)) || /colorvu|colour/i.test(p.name)) out.push("Colour pictures at night");
  if (yes(attr(p, /white light|smart hybrid|supplement light type/i)) || /hybrid light|smart light/i.test(p.name))
    out.push("Light switches on when someone comes");
  if (yes(attr(p, /^(human detection|acusense)/i)) || /acusense/i.test(p.name)) out.push("Tells people from pets");
  if (yes(attr(p, /two-way audio/i)) || /two way audio/i.test(p.name)) out.push("You can talk through it");
  else if (yes(attr(p, /microphone/i)) || /\bmic\b/i.test(p.name)) out.push("Picks up sound");
  const ip = attr(p, /^ip rating/i)?.match(/IP6\d/i)?.[0] ?? p.name.match(/\bIP6\d\b/i)?.[0];
  if (ip) out.push(`Weatherproof (${ip.toUpperCase()})`);
  if (yes(attr(p, /sd card/i))) out.push("Has a memory card slot");
  return out.slice(0, 3).join(" · ");
}

function recorderMaxRes(name: string, system: KitSystem): number {
  if (/\b8K\b|12\s?MP/i.test(name)) return 12;
  if (/\b8\s?MP\b|\b4K\b/i.test(name)) return 8;
  if (/\b6\s?MP\b/i.test(name)) return 6;
  if (/\b5\s?MP/i.test(name)) return 5;
  if (/\b4\s?MP\b/i.test(name)) return 4;
  if (/1080p|\b2\s?MP\b/i.test(name)) return 2;
  return system === "IP" ? 8 : 5;
}

const lengthOf = (name: string) => {
  const m = name.match(/(\d+(?:\.\d+)?)\s?m\b/i) ?? name.match(/(\d+(?:\.\d+)?)M\b/);
  return m ? Number(m[1]) : undefined;
};

/** One item per length: the kit part if there is one, otherwise the cheapest. */
function byLength(products: Product[], used: Map<string, number>): BuilderOptionItem[] {
  const best = new Map<number, Product>();
  for (const p of products) {
    const len = lengthOf(p.name);
    if (!len) continue;
    const cur = best.get(len);
    if (!cur || (used.get(p.slug) ?? 0) > (used.get(cur.slug) ?? 0) || ((used.get(p.slug) ?? 0) === (used.get(cur.slug) ?? 0) && p.price < cur.price))
      best.set(len, p);
  }
  return [...best.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([len, p]) => ({ ...part(p), label: `${len}m` }));
}

// Rebuilt whenever the storefront catalogue reloads (getShopProducts() returns a new array after an admin change).
let cached: { source: unknown; catalog: BuilderCatalog } | undefined;

export function getBuilderCatalog(): BuilderCatalog {
  const source = getShopProducts();
  if (cached?.source === source) return cached.catalog;
  const used = usage();
  const shop = source.filter((p) => p.price > 0 && p.inStock !== false && !p.isCallForPrice && !p.isContactSales);

  const cameras: BuilderCamera[] = shop
    .filter((p) => path(p)[0] === "cameras" && (path(p)[1] === "ip" || path(p)[1] === "turbo-hd"))
    .map((p) => {
      const system: KitSystem = path(p)[1] === "ip" ? "IP" : "ANALOG";
      const res = cameraRes(p) ?? 4;
      return { ...part(p, cameraSpecs(p, res)), system, res };
    });
  // "Our pick" per system and resolution: the camera used in the most kits.
  const pickKey = (c: BuilderCamera) => `${c.system}-${c.res}`;
  const picks = new Map<string, BuilderCamera>();
  for (const c of cameras) {
    const cur = picks.get(pickKey(c));
    if (!cur || (used.get(c.slug) ?? 0) > (used.get(cur.slug) ?? 0)) picks.set(pickKey(c), c);
  }
  for (const c of picks.values()) c.pick = true;

  const recorders: BuilderRecorder[] = shop
    .filter((p) => path(p)[0] === "recorders" && /^(nvr|dvr)$/.test(path(p)[1] ?? ""))
    .flatMap((p) => {
      const system: KitSystem = path(p)[1] === "nvr" ? "IP" : "ANALOG";
      const channels = Number(path(p)[2]?.match(/^(\d+)ch$/)?.[1] ?? p.name.match(/(\d+)[- ]?(?:ch|channel)/i)?.[1]);
      if (!channels) return [];
      const maxRes = recorderMaxRes(p.name, system);
      return [{ ...part(p), system, channels, maxRes, popularity: used.get(p.slug) ?? 0 }];
    });

  const driveBest = new Map<number, Product>();
  for (const p of shop) {
    const slug = path(p)[1];
    if (path(p)[0] !== "storage" || !slug || !/hdd|hard drive/i.test(`${p.sku} ${p.name}`)) continue;
    const m = slug.match(/^(\d+)(tb|gb)$/);
    if (!m) continue;
    const tb = m[2] === "tb" ? Number(m[1]) : Number(m[1]) / 1000;
    if (tb < 0.5) continue;
    const cur = driveBest.get(tb);
    if (!cur || p.price < cur.price || (p.price === cur.price && (used.get(p.slug) ?? 0) > (used.get(cur.slug) ?? 0)))
      driveBest.set(tb, p);
  }
  const drives: BuilderDrive[] = [...driveBest.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tb, p]) => ({ ...part(p, tbLabel(tb)), tb }));

  const psus: BuilderPsu[] = shop
    .filter((p) => path(p).includes("power") && /^(PSU-BOX-12V|MOSO-PSU)/i.test(p.sku) && !/backu/i.test(p.sku))
    .map((p) => ({ ...part(p), amps: Number(p.name.match(/(\d+(?:\.\d+)?)\s?A\b/)?.[1] ?? 0) }))
    .filter((p) => p.amps > 0)
    .sort((a, b) => a.amps - b.amps || a.price - b.price);

  const ethernet = (kind: string) => shop.filter((p) => path(p).includes("ethernet") && path(p).includes(kind));
  const cat6Leads = ethernet("cat6").filter((p) => /^RJ45-NETWORK-CABLE-CAT6/i.test(p.sku));
  const reels = [...ethernet("cat6"), ...ethernet("cat5e")].filter((p) => /\b(100|305)\s?m\b/i.test(p.name));
  const coax = shop.filter((p) => /^RG59P-CABLE|SHOTGUN-RG59|AURA-SHOTGUN/i.test(p.sku));
  const cableGroups: BuilderGroup[] = [
    { title: "Cat6 Cable", sub: "Ready-made network leads for IP cameras", system: "IP", items: byLength(cat6Leads, used) },
    {
      title: "Cable on a reel",
      sub: "Bulk network cable to cut to length (add RJ45 plugs)",
      system: "IP",
      items: byLength(reels, used).map((i) => ({ ...i, label: `${i.label} ${/cat5e/i.test(i.name) ? "Cat5e" : "Cat6"}` })),
    },
    {
      title: "RG59 Shotgun Cable",
      sub: "Picture and power in one lead for coax cameras",
      system: "ANALOG",
      items: byLength(coax, used),
    },
  ];
  const cables = cableGroups.filter((g) => g.items.length > 0);

  const hdmi = shop.filter((p) => /^HDMI-CABLE/i.test(p.sku));
  const switches = shop
    .filter((p) => path(p).includes("poe-switches"))
    .map((p) => {
      const ports = path(p).find((s) => /^\d+-port$/.test(s))?.split("-")[0];
      return { ...part(p), label: ports ? `${ports} ports` : "PoE switch" };
    })
    .sort((a, b) => a.price - b.price);
  const accessoryGroups: BuilderGroup[] = [
    { title: "HDMI cable", sub: "Plugs your recorder into a TV or monitor.", items: byLength(hdmi, used).slice(0, 6) },
    { title: "PoE switch", sub: "Adds more network sockets, so you can plug in more cameras.", system: "IP", items: switches.slice(0, 6) },
  ];
  const accessories = accessoryGroups.filter((g) => g.items.length > 0);

  const catalog = { cameras, recorders, drives, psus, cables, accessories };
  cached = { source, catalog };
  return catalog;
}

const ROLE: Record<string, LineRole> = {
  recorder: "recorder",
  camera: "camera",
  storage: "drive",
  psu: "psu",
  cable: "cable",
  accessory: "accessory",
};

/** Seed for ?kit=<SKU or slug>: every part of a ready-made kit, priced as it stands. */
export function seedFromKit(ref: string): BuilderSeed | undefined {
  const kit = getKits().find((k) => k.sku.toLowerCase() === ref.toLowerCase() || k.slug === ref);
  if (!kit?.kit) return seedFromSibling(ref);
  const lines: BuilderLine[] = [];
  const missing: string[] = [];
  for (const c of kit.kit.components) {
    const p = getProduct(c.href.replace("/products/", ""));
    if (!p || !(p.price > 0)) {
      missing.push(c.name);
      continue;
    }
    const role = ROLE[c.role] ?? "accessory";
    const res = role === "camera" ? cameraRes(p) : undefined;
    const detail =
      role === "camera" && res
        ? resName(res)
        : role === "drive" && kit.kit.storage
          ? tbLabel(kit.kit.storage.capacityTb)
          : role === "recorder"
            ? `Holds up to ${kit.kit.channelCount} cameras`
            : undefined;
    lines.push({ role, part: part(p, detail), qty: c.qty, res });
  }
  return {
    kitName: kit.name,
    kitHref: `/products/${kit.slug}`,
    system: kit.kit.systemType === "IP" ? "IP" : "ANALOG",
    res: kit.kit.resolutionMp,
    channels: kit.kit.channelCount,
    lines,
    missing,
  };
}

/**
 * Kits we only know as a "sibling" of a scraped kit (same recorder, different camera mix or drive): rebuild them
 * from the sibling record — its cameras and drive size — plus the family's recorder, cable and power.
 */
function seedFromSibling(ref: string): BuilderSeed | undefined {
  for (const parent of getKits()) {
    const sib = parent.kit?.siblings?.find((s) => s.sku.toLowerCase() === ref.toLowerCase());
    if (!sib || !parent.kit) continue;
    const lines: BuilderLine[] = [];
    const missing: string[] = [];
    const n = sib.cameras?.reduce((a, c) => a + c.qty, 0) ?? sib.cameraCount ?? 0;
    const recorderComp = parent.kit.components.find((c) => c.role === "recorder");
    const recorder = recorderComp ? getProduct(recorderComp.href.replace("/products/", "")) : undefined;
    if (recorder) lines.push({ role: "recorder", part: part(recorder, `Holds up to ${parent.kit.channelCount} cameras`), qty: 1 });
    const shop = getShopProducts();
    for (const c of sib.cameras ?? []) {
      const p = findBySku(shop, c.sku);
      if (!p) {
        missing.push(c.name);
        continue;
      }
      const res = cameraRes(p);
      lines.push({ role: "camera", part: part(p, res ? resName(res) : undefined), qty: c.qty, res });
    }
    const tb = sib.storageCapacityTb;
    const parentDrive = parent.kit.components.find((c) => c.role === "storage");
    const sameDrive = parentDrive && parent.kit.storage?.capacityTb === tb ? getProduct(parentDrive.href.replace("/products/", "")) : undefined;
    const drive = sameDrive ? part(sameDrive, tbLabel(tb!)) : tb ? getBuilderCatalog().drives.find((d) => d.tb === tb) : undefined;
    if (drive) lines.push({ role: "drive", part: drive, qty: Math.max(1, sib.storageDrives ?? 1) });
    for (const c of parent.kit.components.filter((x) => x.role === "cable" || x.role === "psu")) {
      const p = getProduct(c.href.replace("/products/", ""));
      if (p) lines.push({ role: c.role === "psu" ? "psu" : "cable", part: part(p), qty: c.role === "cable" ? n : c.qty });
    }
    return {
      kitName: `Ready-made kit ${sib.sku}`,
      system: parent.kit.systemType === "IP" ? "IP" : "ANALOG",
      res: lines.find((l) => l.role === "camera")?.res,
      channels: parent.kit.channelCount,
      lines,
      missing,
    };
  }
  return undefined;
}

const findBySku = (list: Product[], sku: string) => list.find((p) => p.sku.toLowerCase() === sku.toLowerCase());

/** Seed for the product pages' "customise" links: ?mode=advanced&recorder=…&camera=…&n=…&storage=… */
export function seedFromParts(params: { recorder?: string; camera?: string; n?: string; storage?: string }): BuilderSeed | undefined {
  const shop = getShopProducts();
  const rec = params.recorder ? findBySku(shop, params.recorder) : undefined;
  const cam = params.camera ? findBySku(shop, params.camera) : undefined;
  if (!rec && !cam) return undefined;
  const cat = getBuilderCatalog();
  const recorder = rec ? cat.recorders.find((r) => r.slug === rec.slug) : undefined;
  const system: KitSystem = recorder?.system ?? (cam && path(cam)[1] === "ip" ? "IP" : "ANALOG");
  const n = Math.max(1, Math.min(64, Number(params.n) || 4));
  const lines: BuilderLine[] = [];
  const res = cam ? cameraRes(cam) : undefined;
  if (cam) lines.push({ role: "camera", part: part(cam, res ? resName(res) : undefined), qty: n, res });
  if (rec) lines.push({ role: "recorder", part: part(rec, recorder ? `Holds up to ${recorder.channels} cameras` : undefined), qty: 1 });
  const tb = Number(params.storage);
  const drive = tb > 0 ? cat.drives.find((d) => d.tb === tb) : undefined;
  if (drive) lines.push({ role: "drive", part: drive, qty: 1 });
  if (cam) {
    const lead = cat.cables.find((g) => g.system === system)?.items.find((i) => i.label === "20m");
    if (lead) lines.push({ role: "cable", part: lead, qty: n });
    if (system === "ANALOG") {
      const psu = cat.psus.find((p) => p.amps >= ampsFor(n) && (n > 1 || p.amps < 5)) ?? cat.psus.at(-1);
      if (psu) lines.push({ role: "psu", part: psu, qty: 1 });
    }
  }
  return { system, res, channels: recorder?.channels, lines, missing: [] };
}
