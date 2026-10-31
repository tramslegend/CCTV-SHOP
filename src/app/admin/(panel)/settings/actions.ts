"use server";

// Settings mutations for the back office. Every action: requireAdmin("settings") → zod validation → upsert of the
// section's keys (unknown keys already stored are kept) → activity-log diff → bumpCatalogVersion() so the storefront
// reloads its snapshot on the next request.
import { db, transaction } from "@/db";
import { bumpCatalogVersion, logActivity, requireAdmin } from "@/lib/admin/session";
import { parseSetting, type SettingKey, type ShopSettings } from "@/lib/settings/schema";
import { readRawSettings } from "@/lib/settings/server";
import {
  type DeliveryFormValues,
  deliveryFormSchema,
  deliveryToForm,
  fieldErrorsOf,
  type NotificationFormValues,
  notificationFormSchema,
  type SeoFormValues,
  seoFormSchema,
  seoToForm,
  type SettingsActionResult,
  type StoreFormValues,
  storeFormSchema,
  storeToForm,
} from "@/lib/settings/validation";

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

const INVALID = "Check the highlighted fields and try again.";

/** Short, readable view of a value for the activity log. */
function summarise(v: unknown): unknown {
  if (Array.isArray(v)) return v.map((x) => (isRecord(x) ? Object.values(x).join(" ") : x)).join("; ") || null;
  if (isRecord(v)) return Object.values(v).filter(Boolean).join(", ") || null;
  return v === "" ? null : (v ?? null);
}

/** Changed fields between two versions of a section: { field: { from, to } }. */
function diff(before: Json, after: Json, prefix = ""): Json {
  const out: Json = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key] ?? null) === JSON.stringify(after[key] ?? null)) continue;
    out[`${prefix}${key}`] = { from: summarise(before[key]), to: summarise(after[key]) };
  }
  return out;
}

/** Writes the given sections, logs what changed and refreshes the storefront. Returns the number of changed fields. */
async function saveSections(
  user: Awaited<ReturnType<typeof requireAdmin>>["user"],
  next: Partial<{ [K in SettingKey]: ShopSettings[K] }>,
): Promise<number> {
  const keys = Object.keys(next) as SettingKey[];
  const raw = await readRawSettings(keys);
  const changes: Json = {};
  const writes: { key: SettingKey; value: Json }[] = [];
  for (const key of keys) {
    const before = parseSetting(key, raw.get(key)) as unknown as Json;
    const after = next[key] as unknown as Json;
    const changed = diff(before, after, keys.length > 1 ? `${key}.` : "");
    if (!Object.keys(changed).length && raw.has(key)) continue;
    Object.assign(changes, changed);
    const stored = raw.get(key);
    writes.push({ key, value: { ...(isRecord(stored) ? stored : {}), ...after } });
  }
  if (!writes.length) return 0;
  await transaction(async (session) => {
    for (const { key, value } of writes) {
      await db.settings.updateOne({ _id: key }, { $set: { value, updatedAt: new Date() }, $setOnInsert: { key } }, { upsert: true, session });
    }
  });
  if (Object.keys(changes).length) await logActivity(user, "settings.update", "settings", keys.join("+"), changes);
  await bumpCatalogVersion();
  return Object.keys(changes).length;
}

const savedMessage = (label: string, changed: number) => (changed ? `${label} saved.` : "No changes to save.");

export async function saveStoreSettings(values: StoreFormValues): Promise<SettingsActionResult<StoreFormValues>> {
  const { user } = await requireAdmin("settings");
  const parsed = storeFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  const changed = await saveSections(user, { store: parsed.data });
  return { ok: true, message: savedMessage("Store details", changed), data: storeToForm(parsed.data) };
}

export async function saveDeliverySettings(values: DeliveryFormValues): Promise<SettingsActionResult<DeliveryFormValues>> {
  const { user } = await requireAdmin("settings");
  const parsed = deliveryFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  // Standard delivery's price and free-delivery threshold are edited in Admin → Checkout: keep the stored ones (a form
  // opened before they changed must not put the old prices back).
  const stored = parseSetting("delivery", (await readRawSettings(["delivery"])).get("delivery"));
  const delivery = { ...parsed.data.delivery, fee: stored.fee, freeFrom: stored.freeFrom };
  const { tax } = parsed.data;
  const changed = await saveSections(user, { delivery, tax });
  return { ok: true, message: savedMessage("Delivery settings", changed), data: deliveryToForm(delivery) };
}

export async function saveNotificationSettings(values: NotificationFormValues): Promise<SettingsActionResult<NotificationFormValues>> {
  const { user } = await requireAdmin("settings");
  const parsed = notificationFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  const changed = await saveSections(user, { notifications: parsed.data });
  return { ok: true, message: savedMessage("Notification settings", changed), data: { ...parsed.data } };
}

export async function saveSeoSettings(values: SeoFormValues): Promise<SettingsActionResult<SeoFormValues>> {
  const { user } = await requireAdmin("settings");
  const parsed = seoFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  const changed = await saveSections(user, { seo: parsed.data.seo, social: parsed.data.social });
  return { ok: true, message: savedMessage("SEO and social links", changed), data: seoToForm(parsed.data.seo, parsed.data.social) };
}
