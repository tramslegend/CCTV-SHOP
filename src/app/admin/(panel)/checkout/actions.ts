"use server";

// Admin → Checkout mutations. Every action: requireAdmin("settings") → zod validation → merge into the "checkout"
// settings key (standard delivery's price and threshold go to the "delivery" key, which the shop's delivery messages
// read) → activity-log diff → bumpCatalogVersion() so the shop uses the change on the next request.
import { db, transaction } from "@/db";
import { bumpCatalogVersion, logActivity, requireAdmin } from "@/lib/admin/session";
import { getCheckoutSettings, readRawCheckout } from "@/lib/checkout/server";
import type { CheckoutSettings, DeliveryOption } from "@/lib/checkout/settings";
import {
  type DeliveryOptionsFormValues,
  deliveryOptionsSchema,
  deliveryOptionsToForm,
  type FormRulesValues,
  formRulesSchema,
  formRulesToForm,
  type MessagesFormValues,
  messagesSchema,
  messagesToForm,
  type OrderingFormValues,
  orderingSchema,
  orderingToForm,
} from "@/lib/checkout/validation";
import { formatGBP } from "@/lib/cctvmaster/money";
import { parseSetting } from "@/lib/settings/schema";
import { fieldErrorsOf, type SettingsActionResult } from "@/lib/settings/validation";

type Json = Record<string, unknown>;
type Actor = Awaited<ReturnType<typeof requireAdmin>>["user"];
const isRecord = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

const INVALID = "Check the highlighted fields and try again.";
const LONG_TEXT = new Set(["pausedMessage", "notice", "thankYou", "emailNote"]);

/** Changed fields of a section: { field: { from, to } }, long texts as a character count. */
function diff(before: Json, after: Json): Json {
  const out: Json = {};
  for (const key of Object.keys(after)) {
    const a = before[key] ?? null;
    const b = after[key] ?? null;
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (LONG_TEXT.has(key) && typeof b === "string") out[key] = b ? `edited (${String(a ?? "").length} → ${b.length} characters)` : "cleared";
    else out[key] = { from: a, to: b };
  }
  return out;
}

/** One line per delivery option for the activity log. */
const optionLabel = (o: DeliveryOption) =>
  [
    `${o.name}${o.enabled ? "" : " (off)"}`,
    o.kind === "collect" ? "collection" : null,
    o.price ? formatGBP(o.price) : "free",
    o.freeFrom === null ? null : o.freeFrom === 0 ? "always free" : `free from ${formatGBP(o.freeFrom)}`,
    o.estimate || null,
    o.excludedAreas.length ? `not to ${o.excludedAreas.join(" ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

/** Writes one section of the checkout settings (and standard delivery's price when the options change). */
async function save<K extends keyof CheckoutSettings>(user: Actor, key: K, next: CheckoutSettings[K], changes: Json) {
  const raw = await readRawCheckout();
  const storedCheckout = raw.get("checkout");
  const value: Json = { ...(isRecord(storedCheckout) ? storedCheckout : {}), [key]: next };
  await transaction(async (session) => {
    await db.settings.updateOne({ _id: "checkout" }, { $set: { value, updatedAt: new Date() }, $setOnInsert: { key: "checkout" } }, { upsert: true, session });
    if (key === "delivery") {
      const standard = (next as DeliveryOption[])[0];
      const storedDelivery = raw.get("delivery");
      const delivery = {
        ...(isRecord(storedDelivery) ? storedDelivery : {}),
        ...parseSetting("delivery", storedDelivery),
        fee: standard.price,
        freeFrom: standard.freeFrom ?? 0,
      };
      await db.settings.updateOne(
        { _id: "delivery" },
        { $set: { value: delivery, updatedAt: new Date() }, $setOnInsert: { key: "delivery" } },
        { upsert: true, session },
      );
    }
  });
  await logActivity(user, "checkout.update", "settings", key, changes);
  await bumpCatalogVersion();
}

const NO_CHANGES = "No changes to save.";

export async function saveOrdering(values: OrderingFormValues): Promise<SettingsActionResult<OrderingFormValues>> {
  const { user } = await requireAdmin("settings");
  const parsed = orderingSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  const current = await getCheckoutSettings();
  const changes = diff(current.ordering, parsed.data);
  if (!Object.keys(changes).length) return { ok: true, message: NO_CHANGES, data: orderingToForm(current) };
  await save(user, "ordering", parsed.data, changes);
  return {
    ok: true,
    message: parsed.data.enabled ? "Saved. The shop is taking orders." : "Saved. Online ordering is paused.",
    data: orderingToForm(await getCheckoutSettings()),
  };
}

export async function saveDeliveryOptions(values: DeliveryOptionsFormValues): Promise<SettingsActionResult<DeliveryOptionsFormValues>> {
  const { user } = await requireAdmin("settings");
  const parsed = deliveryOptionsSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  const current = await getCheckoutSettings();
  const before = current.delivery.map(optionLabel);
  const after = parsed.data.map(optionLabel);
  if (JSON.stringify(before) === JSON.stringify(after) && JSON.stringify(current.delivery.map((o) => o.id)) === JSON.stringify(parsed.data.map((o) => o.id)))
    return { ok: true, message: NO_CHANGES, data: deliveryOptionsToForm(current) };
  await save(user, "delivery", parsed.data, { options: { from: before, to: after } });
  return { ok: true, message: "Delivery options saved.", data: deliveryOptionsToForm(await getCheckoutSettings()) };
}

export async function saveFormRules(values: FormRulesValues): Promise<SettingsActionResult<FormRulesValues>> {
  const { user } = await requireAdmin("settings");
  const parsed = formRulesSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  const current = await getCheckoutSettings();
  const changes = diff(current.form, parsed.data);
  if (!Object.keys(changes).length) return { ok: true, message: NO_CHANGES, data: formRulesToForm(current) };
  await save(user, "form", parsed.data, changes);
  return { ok: true, message: "Checkout form saved.", data: formRulesToForm(await getCheckoutSettings()) };
}

export async function saveMessages(values: MessagesFormValues): Promise<SettingsActionResult<MessagesFormValues>> {
  const { user } = await requireAdmin("settings");
  const parsed = messagesSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  const current = await getCheckoutSettings();
  const changes = diff(current.messages, parsed.data);
  if (!Object.keys(changes).length) return { ok: true, message: NO_CHANGES, data: messagesToForm(current) };
  await save(user, "messages", parsed.data, changes);
  return { ok: true, message: "Checkout messages saved.", data: messagesToForm(await getCheckoutSettings()) };
}
