// Readable change list for the activity log: { "hero.headline": { from, to }, "popular.picks": { from, to } }.
// Objects are walked down to `depth` levels; lists and anything deeper are summarised as short text.

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

function summarise(v: unknown): unknown {
  if (v === "" || v === undefined || v === null) return null;
  if (typeof v === "string") return v.length > 160 ? `${v.slice(0, 157)}…` : v;
  if (typeof v !== "object") return v;
  const flat = (x: unknown): string =>
    Array.isArray(x) ? x.map(flat).filter(Boolean).join("; ") : isRecord(x) ? Object.values(x).map(flat).filter(Boolean).join(" ") : String(x ?? "");
  const s = flat(v);
  return s ? (s.length > 300 ? `${s.slice(0, 297)}…` : s) : null;
}

export function diffForLog(before: unknown, after: unknown, depth = 2, prefix = ""): Json {
  const out: Json = {};
  if (isRecord(before) && isRecord(after) && depth > 0) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      Object.assign(out, diffForLog(before[key], after[key], depth - 1, prefix ? `${prefix}.${key}` : key));
    }
    return out;
  }
  if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)) out[prefix || "value"] = { from: summarise(before), to: summarise(after) };
  return out;
}
