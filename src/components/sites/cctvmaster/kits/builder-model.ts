// Client-safe types and helpers for the CCTV kit builder (/kit-builder/cctv). Prices are ex-VAT.
import type { KitSystem } from "./kit-model";

export interface BuilderPart {
  slug: string;
  sku: string;
  name: string;
  price: number;
  image?: string;
  /** Short line under the name (specs, size, length…). */
  detail?: string;
}

export interface BuilderCamera extends BuilderPart {
  system: KitSystem;
  res: number;
  pick?: boolean;
}

export interface BuilderRecorder extends BuilderPart {
  system: KitSystem;
  channels: number;
  maxRes: number;
  popularity: number;
}

export interface BuilderDrive extends BuilderPart {
  tb: number;
}

export interface BuilderPsu extends BuilderPart {
  amps: number;
}

export interface BuilderOptionItem extends BuilderPart {
  /** Big label on the option tile ("20m", "8 ports"). */
  label: string;
}

export interface BuilderGroup {
  title: string;
  sub: string;
  system?: KitSystem;
  items: BuilderOptionItem[];
}

export interface BuilderCatalog {
  cameras: BuilderCamera[];
  recorders: BuilderRecorder[];
  drives: BuilderDrive[];
  psus: BuilderPsu[];
  cables: BuilderGroup[];
  accessories: BuilderGroup[];
}

export type LineRole = "camera" | "recorder" | "drive" | "psu" | "cable" | "accessory";

export interface BuilderLine {
  role: LineRole;
  part: BuilderPart;
  qty: number;
  res?: number;
}

/** A starting configuration: a ready-made kit (?kit=SKU) or a customise link (?mode=advanced&…). */
export interface BuilderSeed {
  kitName?: string;
  kitHref?: string;
  system: KitSystem;
  res?: number;
  channels?: number;
  lines: BuilderLine[];
  missing: string[];
}

export const RES_NAMES: Record<number, string> = {
  2: "Full HD (2MP)",
  3: "3MP",
  4: "2K (4MP)",
  5: "2K+ (5MP)",
  6: "6MP",
  8: "4K Ultra HD (8MP)",
  12: "Beyond 4K (12MP)",
};

export const resName = (res: number) => RES_NAMES[res] ?? `${res}MP`;

// Same bitrate model as the kit cards (see kit-data.ts recordingDays).
const MBPS: Record<number, number> = { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 4 };

export function daysFor(cams: { res?: number; qty: number }[], tb: number): number | undefined {
  const gbPerDay = cams.reduce((sum, c) => sum + c.qty * (MBPS[c.res ?? 4] ?? 2) * 10.8, 0);
  return gbPerDay > 0 && tb > 0 ? Math.floor((tb * 1000) / gbPerDay) : undefined;
}

/** Amps a 12V supply needs for coax cameras (about 0.5A each, as the source sizes it). */
export const ampsFor = (cameras: number) => Math.max(1, Math.ceil(cameras * 0.5 * 10) / 10);

export const tbLabel = (tb: number) => (tb < 1 ? `${Math.round(tb * 1000)}GB` : `${tb}TB`);
