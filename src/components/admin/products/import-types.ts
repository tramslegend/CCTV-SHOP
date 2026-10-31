// Spreadsheet import of products: the columns and the shapes the import endpoint returns. Client-safe.
import type { ProductStatus } from "./types";

export type ImportColumnKey =
  | "sku"
  | "name"
  | "price"
  | "compareAtPrice"
  | "costPrice"
  | "status"
  | "availability"
  | "stock"
  | "brand"
  | "category"
  | "extraCategories"
  | "images"
  | "shortDescription"
  | "description"
  | "specs"
  | "badge"
  | "weightGrams"
  | "callForPrice"
  | "contactSales"
  | "slug"
  | "seoTitle"
  | "seoDescription";

export interface ImportColumn {
  key: ImportColumnKey;
  /** Header written in the template and the export. */
  header: string;
  /** Other headers accepted for this column (compared without case, spaces or punctuation). */
  aliases: string[];
  help: string;
  required?: "always" | "new";
}

/** Columns in template order. Only sku is required in every file; name and price are needed for new products. */
export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "sku", header: "sku", aliases: ["productcode", "code", "partnumber"], required: "always", help: "Your product code, unique per product. A SKU already in the shop updates that product; a new SKU adds a product." },
  { key: "name", header: "name", aliases: ["title", "productname", "product"], required: "new", help: "Product name as customers see it." },
  { key: "price", header: "price_ex_vat", aliases: ["price", "priceexcvat", "netprice"], required: "new", help: "Selling price excluding VAT, e.g. 49.99. The shop adds 20% VAT." },
  { key: "compareAtPrice", header: "compare_at_price_ex_vat", aliases: ["compareatprice", "wasprice", "rrp"], help: "Optional “was” price excluding VAT. Must be higher than the price." },
  { key: "costPrice", header: "cost_price_ex_vat", aliases: ["costprice", "cost"], help: "Optional: what you pay, excluding VAT. Never shown to customers." },
  { key: "status", header: "status", aliases: [], help: "active (on sale), draft (hidden) or archived. New products are draft when left blank." },
  { key: "availability", header: "availability", aliases: ["stockstatus"], help: "in_stock, backorder, out_of_stock or discontinued. New products are in_stock when left blank." },
  { key: "stock", header: "stock", aliases: ["quantity", "qty", "stocklevel", "stockquantity"], help: "Quantity in stock (turns on stock tracking). Write untracked to stop tracking." },
  { key: "brand", header: "brand", aliases: ["manufacturer", "make"], help: "Brand or manufacturer." },
  { key: "category", header: "category", aliases: ["maincategory", "primarycategory"], help: "Main category as a path, e.g. Cameras > IP Cameras. Missing categories are created." },
  { key: "extraCategories", header: "extra_categories", aliases: ["othercategories", "additionalcategories"], help: "Other categories to list the product in, separated by |." },
  { key: "images", header: "images", aliases: ["image", "imageurl", "imageurls", "imagelinks", "photos"], help: "Image web addresses separated by |; the first is the main image. They're downloaded into the shop." },
  { key: "shortDescription", header: "short_description", aliases: ["summary", "shortdesc"], help: "One or two sentences shown near the price." },
  { key: "description", header: "description", aliases: ["longdescription", "body"], help: "Full description. Markdown is allowed (## headings, - lists, **bold**)." },
  { key: "specs", header: "specs", aliases: ["specifications", "attributes", "features"], help: "Specifications as Name: Value, one per line or separated by |, e.g. Resolution: 4MP | Lens: 2.8mm." },
  { key: "badge", header: "badge", aliases: ["label", "tag"], help: "Optional short label on the product card, e.g. New or Best seller." },
  { key: "weightGrams", header: "weight_grams", aliases: ["weight", "weightg"], help: "Weight in grams, e.g. 350." },
  { key: "callForPrice", header: "call_for_price", aliases: [], help: "yes to hide the price and ask customers to call. Default no." },
  { key: "contactSales", header: "contact_sales", aliases: [], help: "yes to replace Add to basket with a request-a-quote button. Default no." },
  { key: "slug", header: "slug", aliases: ["url", "urlslug", "handle"], help: "Optional web address name, e.g. 4mp-turret-camera. Made from the name when left blank." },
  { key: "seoTitle", header: "seo_title", aliases: ["metatitle"], help: "Optional title for search engines." },
  { key: "seoDescription", header: "seo_description", aliases: ["metadescription"], help: "Optional description for search engines." },
];

/** "Price (ex VAT)" → "priceexvat": how headers are compared. */
export const headerKey = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");

export type ImportAction = "create" | "update" | "error";

export interface ImportPreviewRow {
  /** Spreadsheet row number (the header is row 1). */
  line: number;
  sku: string;
  name: string;
  action: ImportAction;
  status: ProductStatus | null;
  /** Ex VAT. */
  price: number | null;
  category: string | null;
  images: number;
  errors: string[];
  notes: string[];
}

export interface ImportPreview {
  ok: true;
  kind: "preview";
  rows: ImportPreviewRow[];
  columns: string[];
  ignoredColumns: string[];
  newCategories: string[];
  counts: Record<ImportAction, number>;
}

export type ImportOutcome = "created" | "updated" | "unchanged" | "failed";

export interface ImportResultRow {
  line: number;
  sku: string;
  name: string;
  outcome: ImportOutcome;
  productId: string | null;
  message: string | null;
  warnings: string[];
}

export interface ImportResult {
  ok: true;
  kind: "result";
  rows: ImportResultRow[];
  newCategories: string[];
  counts: Record<ImportOutcome, number>;
}

export type ImportResponse = ImportPreview | ImportResult | { ok: false; error: string };

/** Largest file the import accepts (Vercel caps request bodies at about 4.5 MB). */
export const IMPORT_MAX_BYTES = 4 * 1024 * 1024;
/** Most rows one file may hold; bigger catalogues are imported in parts. */
export const IMPORT_MAX_ROWS = 1000;
