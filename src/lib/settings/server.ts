// Settings read straight from the database: for the back office, emails, invoices and anything outside the storefront
// snapshot. Server-only. (The storefront reads them from the catalogue snapshot instead: see ./storefront.ts.)
import { db } from "@/db";
import { parseSetting, parseSettings, SETTING_KEYS, type SettingKey, type ShopSettings } from "./schema";

/** Raw stored values (as saved, unparsed) for the given keys. */
export async function readRawSettings(keys: readonly string[]): Promise<Map<string, unknown>> {
  const rows = await db.settings.find({ _id: { $in: [...keys] } }).toArray();
  return new Map(rows.map((r) => [r.key, r.value]));
}

/** Every settings section, typed and with defaults filled in. */
export async function getShopSettings(): Promise<ShopSettings> {
  const raw = await readRawSettings(SETTING_KEYS);
  return parseSettings((key) => raw.get(key));
}

/** One settings section, typed and with defaults filled in. */
export async function getSettingFromDb<K extends SettingKey>(key: K): Promise<ShopSettings[K]> {
  const raw = await readRawSettings([key]);
  return parseSetting(key, raw.get(key));
}
