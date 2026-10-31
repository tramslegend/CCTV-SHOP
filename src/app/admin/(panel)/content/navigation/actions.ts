"use server";

// Navigation editor mutation: requireAdmin("content") → zod validation → header list checked against the top-level
// categories → upsert of the "navigation" and "announcement" settings → activity-log diff → bumpCatalogVersion() so
// every page shows the change on the next request. Links that don't lead to a page come back as warnings.
import { db, transaction } from "@/db";
import { bumpCatalogVersion, logActivity, requireAdmin } from "@/lib/admin/session";
import { ensureCatalog, getCategoryTree } from "@/lib/cctvmaster/catalog";
import { diffForLog } from "@/lib/homepage/diff";
import { type ContentActionResult, fieldErrorsOf } from "@/lib/homepage/validation";
import { readNavigationForm } from "@/lib/navigation/admin";
import { linkWarnings } from "@/lib/navigation/link-check";
import { ANNOUNCEMENT_KEY, type HeaderItemSetting, NAVIGATION_KEY } from "@/lib/navigation/schema";
import { type NavigationFormValues, navigationFormSchema, navigationLinks } from "@/lib/navigation/validation";

const INVALID = "Check the highlighted fields and try again.";

/** One readable line per header item for the activity log. */
const headerSummary = (items: HeaderItemSetting[]) =>
  items
    .map((i) =>
      [
        i.slug,
        !i.show && "hidden",
        !i.menu && "no menu",
        i.icon && `icon ${i.icon.split("/").pop()}`,
        i.hidden.length && `${i.hidden.length} menu links hidden`,
        Object.keys(i.icons).length && `${Object.keys(i.icons).length} menu pictures`,
      ]
        .filter(Boolean)
        .join(" · "),
    )
    .join("; ");

const forLog = (v: NavigationFormValues) => ({
  navigation: { ...v.navigation, header: headerSummary(v.navigation.header) },
  announcement: v.announcement,
});

export async function saveNavigation(values: NavigationFormValues): Promise<ContentActionResult<NavigationFormValues>> {
  const { user } = await requireAdmin("content");
  const parsed = navigationFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  const next = parsed.data;

  // Only top-level categories can be in the bar; anything else (e.g. a category deleted meanwhile) is dropped.
  await ensureCatalog();
  const tree = getCategoryTree();
  next.navigation.header = next.navigation.header.filter((h) => {
    const node = tree.get(h.slug);
    return node && !node.parent;
  });

  const warnings = await linkWarnings(navigationLinks(next));
  const before = await readNavigationForm();
  const changes = diffForLog(forLog(before), forLog(next), 3);
  if (!Object.keys(changes).length) return { ok: true, message: "No changes to save.", data: next, warnings };

  await transaction(async (session) => {
    for (const [key, value] of [
      [NAVIGATION_KEY, next.navigation],
      [ANNOUNCEMENT_KEY, next.announcement],
    ] as const) {
      await db.settings.updateOne({ _id: key }, { $set: { value, updatedAt: new Date() }, $setOnInsert: { key } }, { upsert: true, session });
    }
  });
  await logActivity(user, "content.navigation.update", "settings", `${NAVIGATION_KEY}+${ANNOUNCEMENT_KEY}`, changes);
  await bumpCatalogVersion();
  const warned = Object.keys(warnings).length;
  return {
    ok: true,
    message: warned ? `Navigation saved. ${warned === 1 ? "One link needs" : `${warned} links need`} a look (marked in amber).` : "Navigation saved.",
    data: next,
    warnings,
  };
}
