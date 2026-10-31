import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageEditor } from "@/components/admin/content/page-editor";
import type { PageEditorMeta, PageFormValues } from "@/components/admin/content/types";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { parseBlocks } from "@/lib/content/blocks";
import { importBuiltInPage } from "@/lib/content/page-import";
import { isPageSlug, PAGE_DEFS } from "@/lib/content/pages";
import { getShopSettings } from "@/lib/settings/server";
import { formatDateTime } from "../../_lib/format";

export async function generateMetadata(props: PageProps<"/admin/content/pages/[slug]">): Promise<Metadata> {
  await requireAdmin("content");
  const { slug } = await props.params;
  return { title: isPageSlug(slug) ? `Edit ${PAGE_DEFS[slug].label}` : "Page not found" };
}

export default async function EditContentPage(props: PageProps<"/admin/content/pages/[slug]">) {
  await requireAdmin("content");
  const { slug } = await props.params;
  if (!isPageSlug(slug)) notFound();
  const def = PAGE_DEFS[slug];
  const [row, settings] = await Promise.all([db.pages.findOne({ slug }), getShopSettings()]);

  // Without a custom version the form starts from the built-in heading, intro and description, with no blocks:
  // "Import current content" brings in the rest.
  const builtIn = row ? null : importBuiltInPage(slug, settings);
  const values: PageFormValues = row
    ? {
        title: row.title,
        intro: row.intro ?? "",
        metaDescription: row.metaDescription ?? "",
        status: row.status === "active" ? "active" : "draft",
        blocks: parseBlocks(row.blocks),
      }
    : { title: builtIn!.title, intro: builtIn!.intro, metaDescription: builtIn!.metaDescription, status: "draft", blocks: [] };
  const meta: PageEditorMeta = {
    slug,
    saved: !!row,
    status: row ? (row.status === "active" ? "active" : "draft") : null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
    updatedLabel: row ? formatDateTime(row.updatedAt) : null,
  };

  return (
    <PageEditor
      // A save changes updatedAt (and a revert removes the row): the editor remounts with the saved state as its baseline.
      key={meta.updatedAt ?? "built-in"}
      def={def}
      meta={meta}
      initialValues={values}
      settings={settings}
      nowIso={new Date().toISOString()}
    />
  );
}
