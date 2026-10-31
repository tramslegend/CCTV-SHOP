"use server";

// Homepage editor mutation: requireAdmin("content") → zod validation → checks against the catalogue (kit, products,
// categories) → upsert of the "homepage" setting → activity-log diff → bumpCatalogVersion() so the homepage shows the
// change on the next request. Links that don't lead to a page are returned as warnings (the save still happens).
import { db } from "@/db";
import { bumpCatalogVersion, logActivity, requireAdmin } from "@/lib/admin/session";
import { ensureCatalog, getCategory } from "@/lib/cctvmaster/catalog";
import { productsByIds, readHomepage } from "@/lib/homepage/admin";
import { diffForLog } from "@/lib/homepage/diff";
import { HOMEPAGE_KEY, type HomepageSettings } from "@/lib/homepage/schema";
import { type ContentActionResult, fieldErrorsOf, type FieldMessages, homepageFormSchema, homepageLinks } from "@/lib/homepage/validation";
import { linkWarnings } from "@/lib/navigation/link-check";

const INVALID = "Check the highlighted fields and try again.";

/** Problems that need the catalogue: errors block the save, warnings don't. */
async function catalogueChecks(v: HomepageSettings): Promise<{ errors: FieldMessages; warnings: FieldMessages }> {
  const errors: FieldMessages = {};
  const warnings: FieldMessages = {};
  const products = new Map((await productsByIds([v.hero.kit.productId, ...v.popular.picks])).map((p) => [p.id, p]));

  if (v.hero.kit.productId) {
    const kit = products.get(v.hero.kit.productId);
    if (!kit) errors["hero.kit.productId"] = "That kit no longer exists. Pick another one.";
    else if (!kit.isKit) errors["hero.kit.productId"] = "Pick a kit (a product made of several parts).";
    else if (kit.status !== "active") warnings["hero.kit.productId"] = "This kit isn't active, so the card is hidden until it is.";
  }

  v.popular.picks.forEach((id, i) => {
    const p = products.get(id);
    if (!p) errors[`popular.picks.${i}`] = "This product no longer exists. Remove it.";
    else if (p.status !== "active") warnings[`popular.picks.${i}`] = `${p.name} isn't active, so it's skipped on the homepage.`;
  });
  if (new Set(v.popular.picks).size !== v.popular.picks.length) errors["popular.picks"] = "Each product can only be picked once.";

  await ensureCatalog();
  if (new Set(v.categories.picks).size !== v.categories.picks.length) errors["categories.picks"] = "Each category can only be picked once.";
  v.categories.picks.forEach((slug, i) => {
    if (!getCategory(slug)) warnings[`categories.picks.${i}`] = `The category "${slug}" is hidden or no longer exists, so it's skipped.`;
  });
  return { errors, warnings };
}

export async function saveHomepage(values: HomepageSettings): Promise<ContentActionResult<HomepageSettings>> {
  const { user } = await requireAdmin("content");
  const parsed = homepageFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  const next = parsed.data;

  const { errors, warnings } = await catalogueChecks(next);
  if (Object.keys(errors).length) return { ok: false, message: INVALID, fieldErrors: errors, warnings };
  Object.assign(warnings, await linkWarnings(homepageLinks(next)));

  const before = await readHomepage();
  const changes = diffForLog(before, next);
  if (!Object.keys(changes).length) return { ok: true, message: "No changes to save.", data: next, warnings };

  await db.settings.updateOne(
    { _id: HOMEPAGE_KEY },
    { $set: { value: next, updatedAt: new Date() }, $setOnInsert: { key: HOMEPAGE_KEY } },
    { upsert: true },
  );
  await logActivity(user, "content.homepage.update", "settings", HOMEPAGE_KEY, changes);
  await bumpCatalogVersion();
  const warned = Object.keys(warnings).length;
  return {
    ok: true,
    message: warned ? `Homepage saved. ${warned === 1 ? "One thing needs" : `${warned} things need`} a look (marked in amber).` : "Homepage saved.",
    data: next,
    warnings,
  };
}
