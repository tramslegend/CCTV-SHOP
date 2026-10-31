// Kit range rules (categories.kit_filter) as the admin edits them. Client-safe: the rule editor uses it for its live
// kit count and the server actions to build the stored value. The shop reads a stored rule with kit-data's
// storedKitFilter(), which parses the same keys as the kit filter URLs (system, cameras, res, colour).
import {
  COLOUR_LABELS,
  type KitColour,
  type KitFilters,
  type KitSystem,
  RES_OPTIONS,
  resLabel,
  SYSTEM_LABELS,
} from "@/components/sites/cctvmaster/kits/kit-model";

export const RULE_SYSTEMS = ["any", "IP", "ANALOG"] as const;
/** "any" plus the shop's resolution bands (RES_OPTIONS: 2, 3, 4, 5 and 8 = 4K). */
export const RULE_RESOLUTIONS = ["any", "2", "3", "4", "5", "8"] as const satisfies readonly ("any" | `${(typeof RES_OPTIONS)[number]}`)[];
export const RULE_COLOURS = ["any", "white", "black", "mixed"] as const;
export const MAX_RULE_CAMERAS = 64;

/** The rule as form values; "any" (or an empty camera count) means the rule doesn't restrict that property. */
export interface KitRuleValues {
  system: (typeof RULE_SYSTEMS)[number];
  /** Exact number of cameras in the kit, as typed. */
  cameras: string;
  res: (typeof RULE_RESOLUTIONS)[number];
  colour: (typeof RULE_COLOURS)[number];
}

export const ANY_RULE: KitRuleValues = { system: "any", cameras: "", res: "any", colour: "any" };

export const SYSTEM_OPTIONS = RULE_SYSTEMS.map((v) => ({ value: v, label: v === "any" ? "Any system" : SYSTEM_LABELS[v] }));
export const RES_RULE_OPTIONS = RULE_RESOLUTIONS.map((v) => ({ value: v, label: v === "any" ? "Any resolution" : resLabel(Number(v)) }));
export const COLOUR_OPTIONS = RULE_COLOURS.map((v) => ({ value: v, label: v === "any" ? "Any colour" : COLOUR_LABELS[v] }));

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

/** Form values for a filter (a stored rule, or the built-in rule of a kit range's slug). */
export function ruleFromFilters(f: KitFilters | undefined): KitRuleValues {
  const res = f?.res !== undefined ? String(f.res) : "any";
  return {
    system: f?.system ?? "any",
    cameras: f?.cameras ? String(f.cameras) : "",
    res: isOneOf(RULE_RESOLUTIONS, res) ? res : "any",
    colour: f?.colour ?? "any",
  };
}

/** Parsed camera count, or null for "any" / not a valid count. */
export function ruleCameras(rule: KitRuleValues): number | null {
  const n = Number(rule.cameras.trim());
  return rule.cameras.trim() && Number.isInteger(n) && n >= 1 && n <= MAX_RULE_CAMERAS ? n : null;
}

/** The stored jsonb value: only the properties the rule restricts, in a fixed key order. */
export function ruleToRecord(rule: KitRuleValues): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (rule.system !== "any") out.system = rule.system;
  const cameras = ruleCameras(rule);
  if (cameras !== null) out.cameras = cameras;
  if (rule.res !== "any") out.res = Number(rule.res);
  if (rule.colour !== "any") out.colour = rule.colour;
  return out;
}

export const sameRule = (a: KitRuleValues, b: KitRuleValues) => JSON.stringify(ruleToRecord(a)) === JSON.stringify(ruleToRecord(b));

/** "4 cameras · IP / PoE · 4K", or "All kits". */
export function describeRule(rule: KitRuleValues): string {
  const parts: string[] = [];
  const cameras = ruleCameras(rule);
  if (cameras !== null) parts.push(`${cameras} ${cameras === 1 ? "camera" : "cameras"}`);
  if (rule.system !== "any") parts.push(SYSTEM_LABELS[rule.system]);
  if (rule.res !== "any") parts.push(resLabel(Number(rule.res)));
  if (rule.colour !== "any") parts.push(COLOUR_LABELS[rule.colour]);
  return parts.length ? parts.join(" · ") : "All kits";
}

/** What the rule editor needs to know about each kit in the shop: [system, cameras, resolution band, colour]. */
export type KitFacts = [system: KitSystem, cameras: number, res: number, colour: KitColour | ""];

/** Whether a kit falls in the range; the same tests as the shop's kit filters (kit-model `matches`) for these keys. */
export function ruleMatches([system, cameras, res, colour]: KitFacts, rule: KitRuleValues): boolean {
  const wantCameras = ruleCameras(rule);
  if (wantCameras !== null && cameras !== wantCameras) return false;
  if (rule.system !== "any" && system !== rule.system) return false;
  if (rule.res !== "any" && res !== Number(rule.res)) return false;
  if (rule.colour !== "any" && colour !== rule.colour) return false;
  return true;
}
