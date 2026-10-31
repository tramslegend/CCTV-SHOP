// Shapes shared by the products admin pages (server) and its form components (client). No server imports here.

export const PRODUCT_STATUSES = ["active", "draft", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const AVAILABILITIES = ["in_stock", "backorder", "out_of_stock", "discontinued"] as const;
export type Availability = (typeof AVAILABILITIES)[number];

export const KIT_ROLES = ["recorder", "camera", "storage", "psu", "cable", "accessory", "other"] as const;
export type KitRole = (typeof KIT_ROLES)[number];

export const KIT_SYSTEMS = ["IP", "ANALOG"] as const;
export type KitSystem = (typeof KIT_SYSTEMS)[number];

export const STATUS_LABELS: Record<ProductStatus, string> = { active: "Active", draft: "Draft", archived: "Archived" };
export const STATUS_HINTS: Record<ProductStatus, string> = {
  active: "Visible in the shop and can be bought.",
  draft: "Hidden from the shop while you work on it.",
  archived: "Hidden from the shop and kept for records.",
};
export const AVAILABILITY_LABELS: Record<Availability, string> = {
  in_stock: "In stock",
  backorder: "Backorder",
  out_of_stock: "Out of stock",
  discontinued: "Discontinued",
};
export const ROLE_LABELS: Record<KitRole, string> = {
  recorder: "Recorder",
  camera: "Camera",
  storage: "Storage",
  psu: "Power supply",
  cable: "Cable",
  accessory: "Accessory",
  other: "Other",
};
export const SYSTEM_LABELS: Record<KitSystem, string> = { IP: "IP (PoE)", ANALOG: "Analogue (Turbo HD)" };

export interface CategoryOption {
  id: number;
  name: string;
  /** Names from the top-level category down to this one. */
  path: string[];
  parentId: number | null;
  isKitRange: boolean;
}

export interface GuideOption {
  slug: string;
  title: string;
}

/** A product as shown in pickers (related products, kit components). */
export interface ProductPick {
  id: string;
  name: string;
  sku: string;
  image: string | null;
  /** Ex-VAT. */
  price: number;
  status: ProductStatus;
  isKit: boolean;
}

export interface ImageValue {
  /** Client-side list key. */
  key: string;
  url: string;
  alt: string;
  /** Local preview while the upload is in flight. */
  uploading?: boolean;
}

export interface AttributeValue {
  key: string;
  name: string;
  value: string;
  /** Source attribute type (e.g. "TEXT"); preserved as is. */
  type?: string;
}

export interface ComponentValue {
  key: string;
  componentId: string | null;
  name: string;
  sku: string;
  role: KitRole;
  qty: string;
  imageUrl: string | null;
  /** Ex-VAT price of the linked product, for the parts total (display only). */
  price: number | null;
}

export interface KitValues {
  systemType: KitSystem;
  channelCount: string;
  cameraCount: string;
  resolutionMp: string;
  storageToken: string;
  storageCapacityTb: string;
}

/** Everything the product form edits. Numbers are kept as the strings typed; the server parses them. */
export interface ProductFormValues {
  name: string;
  slug: string;
  sku: string;
  brand: string;
  status: ProductStatus;
  badge: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  isContactSales: boolean;
  isCallForPrice: boolean;
  availability: Availability;
  trackStock: boolean;
  stock: string;
  weightGrams: string;
  primaryCategoryId: number | null;
  extraCategoryIds: number[];
  images: ImageValue[];
  shortDescription: string;
  description: string;
  attributes: AttributeValue[];
  related: ProductPick[];
  guides: string[];
  seoTitle: string;
  seoDescription: string;
  kit: KitValues | null;
  components: ComponentValue[];
}

export type FieldErrors = Record<string, string>;

export type ActionResult<T = undefined> =
  | ({ ok: true; message: string } & (T extends undefined ? object : { data: T }))
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export interface SavedProduct {
  id: string;
  slug: string;
}
