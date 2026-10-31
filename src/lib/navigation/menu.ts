// Header category bar and mega menus, generated from the catalogue snapshot and the "navigation" setting:
//  - the bar lists top-level categories (hidden categories never appear) in the order set in the admin; categories the
//    setting doesn't mention yet are added at the end;
//  - a category's menu lists its subcategories and their subcategories; the kit ranges root uses the kit navigation
//    (system → ranges) instead. Links the owner hid are left out.
// Pictures: the owner's choice for that link, else the subcategory's own image, else its parent's picture.
// Server-only: call after `await ensureCatalog()`.
import { getCategory, getCategoryTree, getTaxonomy } from "@/lib/cctvmaster/catalog";
import type { CategoryNode, KitNavNode } from "@/lib/cctvmaster/types";
import type { HeaderItemSetting, NavigationSettings } from "./schema";

export interface MenuLink {
  name: string;
  href: string;
  icon: string;
}

export interface MenuGroup extends MenuLink {
  items: MenuLink[];
}

export interface MegaMenu extends MenuLink {
  /** Menus of flat groups (no third level) use a third column on wide screens. */
  wide: boolean;
  groups: MenuGroup[];
}

export interface HeaderNavItem {
  slug: string;
  name: string;
  href: string;
  icon: string;
  menu: MegaMenu | null;
}

/** One menu link with everything the admin editor needs. */
export interface MenuEntry {
  name: string;
  href: string;
  /** Picture shown (after fallbacks). */
  icon: string;
  /** Picture used when the owner hasn't chosen one. */
  defaultIcon: string;
  /** The subcategory's own image (empty when it has none). */
  ownImage: string;
  hidden: boolean;
  items: MenuEntry[];
}

export interface HeaderEntry {
  slug: string;
  name: string;
  href: string;
  /** Category image (the bar's default picture). */
  categoryImage: string;
  setting: HeaderItemSetting;
  /** Generated menu contents (empty when the category has no subcategories). */
  entries: MenuEntry[];
  isKitRoot: boolean;
}

const newItem = (slug: string): HeaderItemSetting => ({ slug, show: true, icon: "", menu: true, hidden: [], icons: {} });

/** Top-level categories (kit ranges root included) in admin order. */
function topNodes(): CategoryNode[] {
  return [...getCategoryTree().values()].filter((n) => !n.parent);
}

interface SourceNode {
  name: string;
  href: string;
  slug: string;
  children: SourceNode[];
}

function categorySource(slug: string, depth: number): SourceNode[] {
  const tree = getCategoryTree();
  const node = tree.get(slug);
  if (!node || depth === 0) return [];
  return node.children
    .map((c) => tree.get(c))
    .filter((c): c is CategoryNode => !!c)
    .map((c) => ({ name: c.name, href: c.href, slug: c.slug, children: categorySource(c.slug, depth - 1) }));
}

function kitSource(nodes: KitNavNode[] | undefined, depth: number): SourceNode[] {
  if (!nodes || depth === 0) return [];
  return nodes
    .filter((n) => !!getCategory(n.slug))
    .map((n) => ({ name: n.name, href: n.href, slug: n.slug, children: kitSource(n.children, depth - 1) }));
}

function toEntries(nodes: SourceNode[], setting: HeaderItemSetting, parentIcon: string): MenuEntry[] {
  const hidden = new Set(setting.hidden);
  return nodes.map((n) => {
    const ownImage = getCategory(n.slug)?.imageUrl ?? "";
    const defaultIcon = ownImage || parentIcon;
    const icon = setting.icons[n.href] || defaultIcon;
    return { name: n.name, href: n.href, icon, defaultIcon, ownImage, hidden: hidden.has(n.href), items: toEntries(n.children, setting, icon) };
  });
}

/** Every top-level category with its setting (stored or default) and generated menu, in bar order. */
export function headerEntries(nav: NavigationSettings): HeaderEntry[] {
  const nodes = topNodes();
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  const listed = nav.header.filter((i) => bySlug.has(i.slug));
  const listedSlugs = new Set(listed.map((i) => i.slug));
  const settings = [...listed, ...nodes.filter((n) => !listedSlugs.has(n.slug)).map((n) => newItem(n.slug))];
  const kitNav = getTaxonomy().kitNav;
  return settings.map((setting) => {
    const node = bySlug.get(setting.slug)!;
    const categoryImage = getCategory(node.slug)?.imageUrl ?? "";
    const isKitRoot = kitNav.slug === node.slug;
    const source = isKitRoot ? kitSource(kitNav.children, 2) : categorySource(node.slug, 2);
    return {
      slug: node.slug,
      name: node.name,
      href: node.href,
      categoryImage,
      setting,
      entries: toEntries(source, setting, setting.icon || categoryImage),
      isKitRoot,
    };
  });
}

/** The header bar as shown in the shop. */
export function headerNav(nav: NavigationSettings): HeaderNavItem[] {
  return headerEntries(nav)
    .filter((e) => e.setting.show)
    .map((e) => {
      const icon = e.setting.icon || e.categoryImage;
      const groups: MenuGroup[] = e.entries
        .filter((g) => !g.hidden)
        .map((g) => ({ name: g.name, href: g.href, icon: g.icon, items: g.items.filter((i) => !i.hidden).map(({ name, href, icon: i }) => ({ name, href, icon: i })) }));
      const menu: MegaMenu | null =
        e.setting.menu && groups.length ? { name: e.name, href: e.href, icon, wide: groups.every((g) => !g.items.length), groups } : null;
      return { slug: e.slug, name: e.name, href: e.href, icon, menu };
    });
}
