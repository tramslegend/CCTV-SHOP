// Pure helpers for ready-made kit pages: sibling pickers ("How many cameras?" and friends), box roles and tags.
// No imports beyond types, so it can run anywhere (server components, scripts).
import type { Kit, KitCamera, KitComponent, KitSibling } from "@/lib/cctvmaster/types";

const VAT = 1.2;
const incVat = (exVat: number) => Math.round(exVat * VAT * 100) / 100;

export interface KitOption {
  key: string;
  title: string;
  /** Muted second line, e.g. "2 channels left free" or "with 2TB" when a mix option also changes the drive. */
  subtitle?: string;
  /** Price difference to this kit, inc. VAT. */
  delta: number;
  href: string;
  current: boolean;
}

export interface KitPicker {
  id: "count" | "mix" | "storage";
  heading: string;
  hint: string;
  options: KitOption[];
}

export interface KitSaving {
  parts: number;
  kit: number;
  save: number;
  percent: number;
}

export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

const DRIVE_SERIES = /^([A-Z]\d{3}|SkyHawk|Purple|IronWolf|BarraCuda|Barracuda|WD\d*Purple)$/;

/** Short drive descriptor for storage options: "Toshiba S300 surveillance-grade" or the first words of the name. */
export function driveLabel(name?: string) {
  if (!name) return "";
  const words = name.replace(/\s+/g, " ").trim().split(" ");
  const grade = /surveillance/i.test(name) ? "surveillance" : /\bNAS\b/.test(name) ? "NAS" : undefined;
  if (grade) {
    const series = words[1] && DRIVE_SERIES.test(words[1]) ? ` ${words[1]}` : "";
    return `${words[0]}${series} ${grade}-grade`;
  }
  return words.length > 4 ? `${words.slice(0, 4).join(" ")}…` : words.join(" ");
}

/** "5TB", or "2× 10TB = 20TB" for multi-drive kits. */
export function storageLabel(token?: string, drives?: number, capacityTb?: number) {
  if (!token) return "";
  const each = token.replace(/^\d+X/i, "");
  return drives && drives > 1 ? `${drives}× ${each} = ${capacityTb}TB` : each;
}

const styleOf = (name: string) => {
  if (/ptz|speed ?dome/i.test(name)) return "PTZ";
  if (/turret|eyeball/i.test(name)) return "turret";
  if (/bullet/i.test(name)) return "bullet";
  if (/dome/i.test(name)) return "dome";
  if (/fish ?eye/i.test(name)) return "fisheye";
  if (/cube/i.test(name)) return "cube";
  return "camera";
};

const byQtyDesc = <T extends { qty: number }>(list: T[]) =>
  list
    .map((item, i) => ({ item, i }))
    .sort((a, b) => b.item.qty - a.item.qty || a.i - b.i)
    .map((e) => e.item);

function styleLabel(cameras: KitCamera[] = []) {
  const totals: { style: string; qty: number }[] = [];
  for (const c of cameras) {
    const style = styleOf(c.name);
    const found = totals.find((t) => t.style === style);
    if (found) found.qty += c.qty;
    else totals.push({ style, qty: c.qty });
  }
  return byQtyDesc(totals)
    .map((t) => `${t.qty}× ${t.style}`)
    .join(" + ");
}

const skuLabel = (cameras: KitCamera[] = []) =>
  byQtyDesc(cameras)
    .map((c) => `${c.qty}× ${c.sku}`)
    .join(" + ");

const daysLabel = (d: number) => `${d} ${plural(d, "day")} of footage`;

function spareLabel(spare: number) {
  if (spare <= 0) return "Uses every recorder channel";
  return spare === 1 ? "1 channel left free" : `${spare} channels left free`;
}

/**
 * Builds the sibling pickers the source shows in the buy box of a kit that belongs to a family.
 * `pageExists` decides whether a sibling has its own local page; otherwise the option opens it in the kit builder.
 */
export function kitPickers(kit: Kit, sku: string, pageExists: (slug: string) => boolean): KitPicker[] {
  const sibs = kit.siblings ?? [];
  if (sibs.length < 2) return [];
  const current = sibs.find((s) => s.isCurrent) ?? sibs.find((s) => s.sku === sku);
  if (!current) return [];

  const href = (s: KitSibling) => {
    const slug = s.href.replace(/^\/products\//, "");
    return pageExists(slug) ? `/products/${slug}` : `/kit-builder/cctv?kit=${encodeURIComponent(s.sku)}`;
  };
  const delta = (s: KitSibling) => Math.round((incVat(s.price) - incVat(current.price)) * 100) / 100;
  const best = (list: KitSibling[]) =>
    list.includes(current)
      ? current
      : [...list].sort(
          (a, b) =>
            Number(!!b.indexable) - Number(!!a.indexable) ||
            Number(b.storageToken === current.storageToken) - Number(a.storageToken === current.storageToken) ||
            a.price - b.price,
        )[0];
  const option = (s: KitSibling, title: string, subtitle?: string): KitOption => ({
    key: s.sku,
    title,
    subtitle,
    delta: delta(s),
    href: href(s),
    current: s === current,
  });

  const pickers: KitPicker[] = [];
  const count = (s: KitSibling) => s.cameraCount ?? 0;

  // How many cameras? One option per camera count.
  // The family lists its kits in the source's own order; keep the first appearance of each count.
  const counts = [...new Set(sibs.map(count))];
  if (counts.length > 1) {
    pickers.push({
      id: "count",
      heading: "How many cameras?",
      hint: "Pick how many — the recorder and cameras stay the same.",
      options: counts.map((n) =>
        option(
          best(sibs.filter((s) => count(s) === n)),
          `${n} ${plural(n, "camera")}`,
          spareLabel(kit.channelCount - n),
        ),
      ),
    });
  }

  // Same camera count, different split of cameras.
  const sameCount = sibs.filter((s) => count(s) === count(current));
  const mixOf = (s: KitSibling) => s.cameraMix ?? "";
  const mixes = [...new Set([mixOf(current), ...sameCount.map(mixOf)])];
  if (mixes.length > 1) {
    const reps = mixes.map((m) => best(sameCount.filter((s) => mixOf(s) === m)));
    const styles = reps.map((s) => styleLabel(s.cameras));
    const byStyle = new Set(styles).size === styles.length;
    pickers.push({
      id: "mix",
      heading: byStyle ? "Which camera styles?" : "Which camera mix?",
      hint: byStyle ? "Same kit, with a different split of camera styles." : "Same recorder, different mix of cameras.",
      options: reps.map((s, i) =>
        option(
          s,
          byStyle ? styles[i] : skuLabel(s.cameras),
          s !== current && s.storageToken !== current.storageToken ? `with ${s.storageToken}` : undefined,
        ),
      ),
    });
  }

  // Same cameras, different drive.
  const sameMix = sameCount.filter((s) => (s.cameraMix ?? "") === (current.cameraMix ?? ""));
  const tokens = [...new Set(sameMix.map((s) => s.storageToken ?? ""))];
  if (tokens.length > 1) {
    const reps = tokens
      .map((t) => best(sameMix.filter((s) => (s.storageToken ?? "") === t)))
      .sort((a, b) => (a.storageCapacityTb ?? 0) - (b.storageCapacityTb ?? 0));
    pickers.push({
      id: "storage",
      heading: "How long should it keep footage?",
      hint: "Once the drive's full, the recorder records over the oldest day.",
      options: reps.map((s) =>
        option(
          s,
          s.recordingDays ? daysLabel(s.recordingDays) : (s.storageToken ?? ""),
          [storageLabel(s.storageToken, s.storageDrives, s.storageCapacityTb), driveLabel(s.storageDriveName)]
            .filter(Boolean)
            .join(" — "),
        ),
      ),
    });
  }
  return pickers;
}

/** "Buying the parts one by one" comparison, inc. VAT. Only shown for kits that belong to a family. */
export function kitSaving(kit: Kit, priceExVat: number): KitSaving | undefined {
  if (!kit.bundleSaving || (kit.siblings?.length ?? 0) < 2) return undefined;
  const parts = incVat(kit.bundleSaving.partsTotal);
  const price = incVat(priceExVat);
  if (parts <= price) return undefined;
  return { parts, kit: price, save: Math.round((parts - price) * 100) / 100, percent: kit.bundleSaving.percent };
}

export const recordingDays = (kit: Kit, sku: string) =>
  (kit.siblings?.find((s) => s.isCurrent) ?? kit.siblings?.find((s) => s.sku === sku))?.recordingDays;

// ---------- what's in the box ----------

export const ROLE_ORDER = ["recorder", "camera", "storage", "psu", "cable", "accessory", "other"];

export const ROLE_COPY: Record<string, { label: string; text: string }> = {
  recorder: { label: "The recorder", text: "Records all your cameras and runs the app" },
  camera: { label: "The cameras", text: "The part you put on the wall" },
  storage: { label: "The hard drive", text: "Stores your recordings" },
  psu: { label: "The power supply", text: "Powers the cameras from one plug" },
  cable: { label: "The cable", text: "Connects each camera back to the recorder" },
  accessory: { label: "Included extra", text: "Included free with this kit" },
  other: { label: "In the box", text: "Comes with the kit" },
};

const roleRank = (role: string) => {
  const i = ROLE_ORDER.indexOf(role);
  return i === -1 ? ROLE_ORDER.length : i;
};

export const sortComponents = (components: KitComponent[]) =>
  components
    .map((c, i) => ({ c, i }))
    .sort((a, b) => roleRank(a.c.role) - roleRank(b.c.role) || a.i - b.i)
    .map((e) => e.c);

export const storageSize = (kit: Kit) => {
  if (!kit.storage) return undefined;
  const { capacityTb, drives, token } = kit.storage;
  if (drives > 1) return `${capacityTb}TB`;
  return token.replace(/^1X/i, "");
};

export function kitTags(kit: Kit) {
  const tags = [kit.systemType === "IP" ? "IP (PoE) system" : "Analogue HD system", `${kit.channelCount}-channel recorder`];
  if (kit.cameraCount > 0) tags.push(`${kit.cameraCount} ${plural(kit.cameraCount, "camera")}`);
  if (kit.resolutionMp) tags.push(`${kit.resolutionMp}MP recording`);
  if (kit.storage) {
    const { drives, token, capacityTb } = kit.storage;
    const each = token.replace(/^\d+X/i, "");
    tags.push(drives > 1 ? `${capacityTb}TB storage included (${drives}× ${each} drives)` : `${storageSize(kit)} storage included`);
  }
  return tags;
}

/** The short lines under "What's in the box": camera count, recording days and the analogue/IP reminder. */
export function kitSummary(kit: Kit, days?: number) {
  const parts: string[] = [];
  if (kit.cameraCount > 0) parts.push(`${kit.cameraCount} ${plural(kit.cameraCount, "camera")} in the box`);
  if (days) parts.push(`Keeps about ${days} ${plural(days, "day")} of recording`);
  parts.push(
    kit.systemType === "IP"
      ? "Uses network cameras, so check the power equipment and cables listed below"
      : "Uses analogue cameras, so if you're reusing old coax, check it's in good condition and compatible first",
  );
  return `${parts.join(". ")}.`;
}
