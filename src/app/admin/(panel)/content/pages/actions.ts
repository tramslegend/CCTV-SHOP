"use server";

// Information-page mutations. Every write: requireAdmin("content") → zod validation → one database write → activity log
// entry with a concise diff → bumpCatalogVersion() so the shop re-renders the page.
import type { ActionResult, FieldErrors, PageFormValues } from "@/components/admin/content/types";
import { db, insert } from "@/db";
import { bumpCatalogVersion, logActivity, requireAdmin } from "@/lib/admin/session";
import { BLOCK_LABELS, type PageBlock, parseBlocks } from "@/lib/content/blocks";
import { type ImportedPage, importBuiltInPage } from "@/lib/content/page-import";
import { isPageSlug, PAGE_DEFS, type PageSlug } from "@/lib/content/pages";
import { fieldErrorsOf, pageInputSchema } from "@/lib/content/validation";
import { getShopSettings } from "@/lib/settings/server";

const fail = (message: string, fieldErrors?: FieldErrors) => ({ ok: false as const, message, fieldErrors });

/** Block errors are keyed by block id ("block.<id>.items.1.q"), so they stay on the right block if it's moved. */
function blockKeyed(errors: FieldErrors, raw: unknown): FieldErrors {
  const blocks = (raw as { blocks?: { id?: unknown }[] } | null)?.blocks;
  const out: FieldErrors = {};
  for (const [key, message] of Object.entries(errors)) {
    const m = /^blocks\.(\d+)(\..*)?$/.exec(key);
    const id = m && Array.isArray(blocks) ? blocks[Number(m[1])]?.id : undefined;
    out[typeof id === "string" ? `block.${id}${m?.[2] ?? ""}` : key] = message;
  }
  return out;
}

/** "3 blocks: Heading, Text, Questions & answers". */
const blockSummary = (blocks: PageBlock[]) =>
  blocks.length ? `${blocks.length} ${blocks.length === 1 ? "block" : "blocks"}: ${blocks.map((b) => BLOCK_LABELS[b.type]).join(", ")}`.slice(0, 300) : "no blocks";

function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) out[key] = { from: before[key] ?? null, to: after[key] ?? null };
  }
  return out;
}

const SLUGS_WITHOUT_BLOCKS = new Set(["contact", "guides"]);

export async function savePage(slug: string, input: PageFormValues): Promise<ActionResult<{ updatedAt: string }>> {
  const { user } = await requireAdmin("content");
  if (!isPageSlug(slug)) return fail("Unknown page.");
  const parsed = pageInputSchema.safeParse(input);
  if (!parsed.success) return fail("Some fields need attention. Check the highlighted fields.", blockKeyed(fieldErrorsOf(parsed.error), input));
  const v = parsed.data;
  const def = PAGE_DEFS[slug];
  if (v.status === "active" && !v.blocks.length && !SLUGS_WITHOUT_BLOCKS.has(slug))
    return fail("Add at least one block before publishing, or import the current content.", {
      blocks: "Add at least one block before publishing, or import the current content.",
    });

  const existing = await db.pages.findOne({ slug });
  const row = { title: v.title, intro: v.intro || null, metaDescription: v.metaDescription || null, status: v.status, blocks: v.blocks };

  const view = (r: { title: string; intro: string | null; metaDescription: string | null; status: string; blocks: PageBlock[] }) => ({
    title: r.title,
    intro: r.intro,
    metaDescription: r.metaDescription,
    status: r.status,
    blocks: blockSummary(r.blocks),
  });
  let changes: Record<string, unknown> | null = null;
  if (existing) {
    const before = { ...existing, blocks: parseBlocks(existing.blocks) };
    changes = diff(view(before), view(row));
    const blocksChanged = JSON.stringify(before.blocks) !== JSON.stringify(v.blocks);
    if (blocksChanged && !("blocks" in changes)) changes.blocks = `edited (${blockSummary(v.blocks)})`;
    if (!Object.keys(changes).length) return { ok: true, message: "No changes to save.", data: { updatedAt: existing.updatedAt.toISOString() } };
  }

  let saved: { updatedAt: Date };
  if (existing) {
    saved = { updatedAt: new Date() };
    await db.pages.updateOne({ _id: existing.id }, { $set: { ...row, updatedAt: saved.updatedAt } });
  } else {
    [saved] = await insert("pages", { slug, ...row });
  }

  if (existing) await logActivity(user, "page.update", "page", slug, changes ?? {});
  else await logActivity(user, "page.create", "page", slug, view(row));
  await bumpCatalogVersion();

  const message =
    v.status === "active"
      ? `Published. ${def.path} now shows your version.`
      : existing?.status === "active"
        ? `Saved as a draft. ${def.path} shows the built-in page again until you publish.`
        : `Saved as a draft. ${def.path} still shows the built-in page.`;
  return { ok: true, message, data: { updatedAt: saved.updatedAt.toISOString() } };
}

/** Deletes the custom version: the page shows its built-in content again. */
export async function revertPage(slug: string): Promise<ActionResult> {
  const { user } = await requireAdmin("content");
  if (!isPageSlug(slug)) return fail("Unknown page.");
  const existing = await db.pages.findOne({ slug });
  if (!existing) return { ok: true, message: "This page already shows its built-in content." };
  await db.pages.deleteOne({ _id: existing.id });
  await logActivity(user, "page.revert", "page", slug, {
    title: existing.title,
    status: existing.status,
    blocks: blockSummary(parseBlocks(existing.blocks)),
  });
  await bumpCatalogVersion();
  return { ok: true, message: `Reverted. ${PAGE_DEFS[slug].path} shows the built-in page again.` };
}

/** The built-in content as blocks, for the editor to load (nothing is saved until the owner saves). */
export async function importPageContent(slug: string): Promise<ActionResult<ImportedPage>> {
  await requireAdmin("content");
  if (!isPageSlug(slug)) return fail("Unknown page.");
  const settings = await getShopSettings();
  const data = importBuiltInPage(slug as PageSlug, settings);
  return { ok: true, message: "Current content loaded. Review it, then save.", data };
}
