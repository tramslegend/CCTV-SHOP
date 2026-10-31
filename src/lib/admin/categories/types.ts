// Shapes shared by the categories admin pages (server) and its components (client). No server imports here.
import type { ProductPick } from "@/components/admin/products/types";
import type { KitRuleValues } from "./kit-rule";

export type { ActionResult, CategoryOption, FieldErrors } from "@/components/admin/products/types";

/** Everything the category form edits. */
export interface CategoryFormValues {
  name: string;
  slug: string;
  parentId: number | null;
  /** Page heading (h1); the name is used when empty. */
  title: string;
  metaDescription: string;
  /** Markdown intro shown at the top of the shop category page. */
  description: string;
  imageUrl: string | null;
  visible: boolean;
  /** Fixed once the category exists. */
  isKitRange: boolean;
  /** Kit ranges only. */
  kitRule: KitRuleValues | null;
}

/** One row of the admin category tree. */
export interface CategoryTreeRow {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  depth: number;
  isKitRange: boolean;
  visible: boolean;
  /** Visible itself, but a parent is hidden, so the shop hides it too. */
  hiddenByParent: boolean;
  /** Shop categories: distinct products listed in it and everything below it. Kit ranges: live kits matching the rule. */
  count: number;
  /** Shop categories: how many of those products are active (shown in the shop). */
  liveCount: number;
  childCount: number;
  /** Position among its siblings, for the move up/down buttons. */
  isFirst: boolean;
  isLast: boolean;
  /** Kit ranges: the rule in words and whether it was set in the admin (otherwise the built-in rule for the slug). */
  rule?: string;
  customRule?: boolean;
}

/** A product listed in the category being edited. */
export interface CategoryProductRow extends ProductPick {
  /**
   * Why it can't be removed here: "main" = this is its main category; "sub" = it's listed in a sub-category, and a
   * product is always listed in the parents of its categories.
   */
  lock: "main" | "sub" | null;
}

/** Facts shown around the edit form. */
export interface CategoryMeta {
  id: number;
  slug: string;
  /** Shop address when the category and all its parents are visible. */
  shopHref: string | null;
  childCount: number;
  /** Products whose main category this is (cleared if the category is deleted). */
  primaryCount: number;
  /** Product listings (product_categories rows) removed with the category. */
  linkCount: number;
  createdLabel: string;
  updatedLabel: string;
  /** Kit ranges: the rule that applies when none is set in the admin. */
  builtInRule: KitRuleValues | null;
}

/** A kit matching a kit range's saved rule (read-only list on the edit page). */
export interface MatchingKit {
  id: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
  /** Inc VAT, as shown in the shop. */
  price: number;
  inStock: boolean;
}
