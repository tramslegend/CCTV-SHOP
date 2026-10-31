// Back-office reads for /admin/content/navigation (server only).
import { db } from "@/db";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";
import { readRawSettings } from "@/lib/settings/server";
import { headerEntries, type MenuEntry } from "./menu";
import { ANNOUNCEMENT_KEY, NAVIGATION_KEY, parseAnnouncement, parseNavigation } from "./schema";
import type { NavigationFormValues } from "./validation";

/** A menu link as the editor shows it (the owner's hide / picture choices live in the form values). */
export interface MenuLinkMeta {
  name: string;
  href: string;
  ownImage: string;
  items: MenuLinkMeta[];
}

/** A top-level category in the header bar editor. */
export interface HeaderMeta {
  slug: string;
  name: string;
  href: string;
  categoryImage: string;
  /** Menu built from the kit navigation rather than subcategories. */
  isKitRoot: boolean;
  links: MenuLinkMeta[];
}

const toMeta = (entries: MenuEntry[]): MenuLinkMeta[] => entries.map((e) => ({ name: e.name, href: e.href, ownImage: e.ownImage, items: toMeta(e.items) }));

export async function readNavigationForm(): Promise<NavigationFormValues> {
  const raw = await readRawSettings([NAVIGATION_KEY, ANNOUNCEMENT_KEY]);
  return { navigation: parseNavigation(raw.get(NAVIGATION_KEY)), announcement: parseAnnouncement(raw.get(ANNOUNCEMENT_KEY)) };
}

/**
 * The editor's starting point: stored values with the header list completed (every visible top-level category, in bar
 * order, unknown or hidden categories dropped), and what each category's menu would contain.
 */
export async function navigationEditorData() {
  const values = await readNavigationForm();
  await ensureCatalog();
  const entries = headerEntries(values.navigation);
  const meta: HeaderMeta[] = entries.map((e) => ({
    slug: e.slug,
    name: e.name,
    href: e.href,
    categoryImage: e.categoryImage,
    isKitRoot: e.isKitRoot,
    links: toMeta(e.entries),
  }));
  values.navigation = { ...values.navigation, header: entries.map((e) => e.setting) };
  const hiddenTop = await db.categories.find({ parentId: null, visible: false }, { projection: { _id: 0, name: 1 } }).toArray();
  return { values, meta, hiddenCategories: hiddenTop.map((c) => c.name) };
}
