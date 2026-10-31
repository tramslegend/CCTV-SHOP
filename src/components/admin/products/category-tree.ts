// Category tree helpers shared by the products list, form and actions (pure functions over the category rows).
import type { CategoryOption } from "./types";

interface CategoryRow {
  id: number;
  name: string;
  parentId: number | null;
  isKitRange: boolean;
  position: number;
}

/** Categories in tree order (depth-first, by position), each with its full name path. */
export function buildCategoryOptions(rows: CategoryRow[]): CategoryOption[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const children = new Map<number | null, CategoryRow[]>();
  for (const r of rows) {
    const parent = r.parentId !== null && byId.has(r.parentId) ? r.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), r]);
  }
  const out: CategoryOption[] = [];
  const seen = new Set<number>();
  const walk = (parent: number | null, path: string[]) => {
    const list = [...(children.get(parent) ?? [])].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    for (const c of list) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      const p = [...path, c.name];
      out.push({ id: c.id, name: c.name, path: p, parentId: c.parentId, isKitRange: c.isKitRange });
      walk(c.id, p);
    }
  };
  walk(null, []);
  return out;
}

const indexOf = (options: CategoryOption[]) => new Map(options.map((o) => [o.id, o]));

/** Ids of the category's ancestors, top-level first. */
export function ancestorIds(options: CategoryOption[], id: number): number[] {
  const byId = indexOf(options);
  const chain: number[] = [];
  const seen = new Set<number>();
  for (let c = byId.get(id)?.parentId; c !== null && c !== undefined && !seen.has(c); c = byId.get(c)?.parentId) {
    seen.add(c);
    chain.unshift(c);
  }
  return chain;
}

/** The category and everything below it. */
export function descendantIds(options: CategoryOption[], id: number): number[] {
  const out = [id];
  for (let i = 0; i < out.length; i++) for (const o of options) if (o.parentId === out[i] && !out.includes(o.id)) out.push(o.id);
  return out;
}

/**
 * Category assignments to store for a product (product_categories). Shop listings include products assigned to the
 * category itself, so a product is assigned to its primary category and that category's parents, plus any extra
 * categories and their parents. Kit ranges list kits by rule, so their parents are never added automatically and
 * a kit's primary range is not assigned.
 */
export function listingCategoryIds(options: CategoryOption[], primaryId: number | null, extraIds: number[]): number[] {
  const byId = indexOf(options);
  const ids = new Set<number>();
  const addWithParents = (id: number) => {
    const c = byId.get(id);
    if (!c) return;
    ids.add(id);
    if (c.isKitRange) return;
    for (const a of ancestorIds(options, id)) if (!byId.get(a)?.isKitRange) ids.add(a);
  };
  if (primaryId !== null && !byId.get(primaryId)?.isKitRange) addWithParents(primaryId);
  for (const id of extraIds) addWithParents(id);
  return [...ids];
}

/** The extra categories to show in the form: stored assignments minus the ones added automatically. */
export function extraCategoryIds(options: CategoryOption[], primaryId: number | null, storedIds: number[]): number[] {
  const automatic = new Set(listingCategoryIds(options, primaryId, []));
  const extras = storedIds.filter((id) => !automatic.has(id));
  const impliedByOthers = new Set(extras.flatMap((id) => ancestorIds(options, id)));
  return extras.filter((id) => !impliedByOthers.has(id));
}
