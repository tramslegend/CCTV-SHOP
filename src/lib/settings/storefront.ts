// Settings for storefront pages, read from the in-memory catalogue snapshot (reloaded after every admin save via
// bumpCatalogVersion). Server-only: client components receive the values as props.
import { ensureCatalog, getSetting } from "@/lib/cctvmaster/catalog";
import { parseSetting, parseSettings, type SettingKey, type ShopSettings } from "./schema";

/** One section from the loaded snapshot. Call `await ensureCatalog()` (or loadSiteSettings) first in the request. */
export const siteSetting = <K extends SettingKey>(key: K): ShopSettings[K] => parseSetting(key, getSetting(key));

/** Every section from the loaded snapshot (see siteSetting). */
export const siteSettings = (): ShopSettings => parseSettings((key) => getSetting(key));

/** Loads the snapshot if needed, then returns every settings section. */
export async function loadSiteSettings(): Promise<ShopSettings> {
  await ensureCatalog();
  return siteSettings();
}
