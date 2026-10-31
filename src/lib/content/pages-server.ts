// Storefront side of the editable information pages. Server-only. Each content route asks for its published custom
// version and renders it (components/sites/cctvmaster/content/managed-page.tsx); without one it shows its built-in
// content. Admin saves call bumpCatalogVersion(), which revalidates every page, so prerendered pages pick up changes.
import type { Metadata } from "next";
import { cache } from "react";
import { db } from "@/db";
import type { PageRow } from "@/db/schema";
import type { ShopSettings } from "@/lib/settings/schema";
import { fillTokens, parseBlocks, tokenValues } from "./blocks";
import { type ManagedPageData, PAGE_DEFS, type PageSlug } from "./pages";

export const toPageData = (slug: PageSlug, row: PageRow): ManagedPageData => ({
  slug,
  title: row.title,
  intro: row.intro ?? "",
  metaDescription: row.metaDescription ?? "",
  blocks: parseBlocks(row.blocks),
  updatedAt: row.updatedAt.toISOString(),
});

/** The page's published custom version, or null when the shop should show the built-in page. */
export const getPublishedPage = cache(async (slug: PageSlug): Promise<ManagedPageData | null> => {
  const row = await db.pages.findOne({ slug, status: "active" });
  return row ? toPageData(slug, row) : null;
});

/** Metadata for a published custom version: its title and meta description (placeholders filled in). */
export function managedMetadata(page: ManagedPageData, settings: ShopSettings): Metadata {
  const tokens = tokenValues(settings);
  const description = fillTokens(page.metaDescription, tokens) || undefined;
  return {
    title: fillTokens(page.title, tokens),
    description,
    alternates: { canonical: PAGE_DEFS[page.slug].path },
  };
}
