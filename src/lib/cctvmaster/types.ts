// Shapes of the catalogue data in data/cctvmaster/*.json (written by scripts/scrape-cctvmaster.mjs).
// Prices are ex-VAT; use withVat() from ./money for display.

export interface Crumb {
  name: string;
  href: string;
}

export interface CategoryRef {
  name: string;
  slug?: string;
  href?: string;
}

export interface Attribute {
  name: string;
  type?: string;
  value: string;
}

export interface DecideChip {
  key: string;
  label: string;
  value: string;
}

/** Listing-card summary the source shows on category pages ("4MP turret camera · colour at night"). */
export interface Decide {
  kind: string;
  title: string;
  maker?: string;
  chips: DecideChip[];
  goodFor?: string;
  goodForLabel?: string;
  compare?: boolean;
  /** Filter values per facet group, e.g. { style: ["turret"], resolution: ["4"] }. */
  facets?: Record<string, string[]>;
}

export interface ProductCard {
  slug: string;
  name: string;
  sku?: string;
  category?: string;
  price: number;
  compareAtPrice?: number;
  isCallForPrice?: boolean;
  isContactSales?: boolean;
  /** Local image path. Category listings use imageUrl; related-product lists use image. */
  imageUrl?: string;
  image?: string;
  badge?: string;
  inStock?: boolean;
  decide?: Decide;
  channelCategories?: { name: string; full_path: string[] }[];
}

export interface KitComponent {
  name: string;
  sku: string;
  href: string;
  qty: number;
  role: "recorder" | "camera" | "storage" | "psu" | "cable" | "accessory" | "other" | string;
  image?: string;
}

export interface KitCamera {
  sku: string;
  name: string;
  qty: number;
  image?: string;
}

/** Another kit in the same family (same recorder; different camera count, mix or storage). */
export interface KitSibling {
  sku: string;
  href: string;
  price: number;
  pricingMode?: string;
  storageToken?: string;
  storageCapacityTb?: number;
  storageDrives?: number;
  storageDriveName?: string;
  recordingDays?: number;
  cameraMix?: string;
  cameras?: KitCamera[];
  cameraCount?: number;
  family?: string;
  availability?: number;
  isCurrent?: boolean;
  indexable?: boolean;
}

export interface Kit {
  kitClass: string;
  /** "ANALOG" (Turbo HD over coax) or "IP" (PoE). */
  systemType: "ANALOG" | "IP" | string;
  cameraCount: number;
  channelCount: number;
  resolutionMp?: number;
  storage?: { token: string; capacityTb: number; resolvedName?: string; drives: number };
  bundleSaving?: { partsTotal: number; percent: number };
  components: KitComponent[];
  family?: string;
  siblings?: KitSibling[];
  customiseHref?: string;
  pricingMode?: string;
  /** "in-stock" | "backorder" | … */
  stockState?: string;
  priceBand?: string;
  backorderCart?: boolean;
}

export interface Product {
  slug: string;
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  category?: string;
  categoryPath?: CategoryRef[];
  images?: string[];
  /** Alt text keyed by local image path. */
  imageAlts?: Record<string, string>;
  inStock?: boolean;
  isDiscontinued?: boolean;
  isContactSales?: boolean;
  isCallForPrice?: boolean;
  badge?: string;
  attributes?: Attribute[];
  partNumbers?: Record<string, string>;
  /** schema.org availability: InStock, BackOrder, OutOfStock, … */
  availability?: string;
  brand?: string;
  /** One-sentence kit summary (only kept when short). */
  shortDescription?: string;
  /** Description written in the admin (markdown). When empty the product page shows a summary generated from data. */
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  breadcrumbs: Crumb[];
  /** Slugs of "You may also like" products; resolve with getCards(). */
  related?: string[];
  /** Slugs of blog posts shown as "Helpful guides for this item". */
  guides?: string[];
  kit?: Kit;
}

export interface Category {
  slug: string;
  /** Page h1 on the source. */
  title?: string;
  metaDescription?: string;
  breadcrumbs: Crumb[];
  total: number;
  facetScope?: string[];
  /** Product slugs in the source's default order (empty for kit categories; derive those from kit data). */
  products: string[];
  /** Intro copy written in the admin (markdown), shown at the top of the category page. */
  description?: string;
  imageUrl?: string;
  /** Kit ranges: the rule set in the admin (kit filter keys such as system, cameras, res, colour). */
  kitFilter?: Record<string, string | number>;
}

export interface BlogPost {
  slug: string;
  title: string;
  headline?: string;
  excerpt?: string;
  datePublished?: string;
  dateModified?: string;
  section?: string;
  keywords?: string;
  wordCount?: number;
  image?: string;
  images?: string[];
  author?: { name: string; jobTitle?: string; image?: string };
  /** Section headings (h2) of the article, in order. */
  headings?: string[];
  breadcrumbs?: Crumb[];
}

export interface KitNavNode {
  slug: string;
  href: string;
  name: string;
  kits: number;
  axis: string;
  children?: KitNavNode[];
}

export interface Taxonomy {
  categoryTree: { name: string; slug: string; displayName?: string; imageUrl?: string; sizeRank?: number }[];
  kitNav: KitNavNode;
  facetWords: { groups: Record<string, string>; options: Record<string, Record<string, string>> };
}

export interface CategoryNode {
  slug: string;
  name: string;
  href: string;
  parent?: string;
  children: string[];
  /** Number of products in this category and its descendants. */
  count: number;
}

export interface SearchSuggestions {
  categories: { name: string; href: string }[];
  products: { name: string; href: string; image?: string; price: string }[];
}
