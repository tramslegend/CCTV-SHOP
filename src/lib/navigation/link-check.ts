// Server-side check that internal links point at pages that exist: categories, products and blog posts are looked up in
// the catalogue snapshot, other paths in the list of shop routes and editable pages. Problems are warnings (saving still
// works): a link may be added before the page it points at. Server-only.
import { db } from "@/db";
import { ensureCatalog, getBlogPost, getCategory, getProduct } from "@/lib/cctvmaster/catalog";

/** Fixed routes of the storefront. */
const STATIC_ROUTES = new Set([
  "/",
  "/about",
  "/blog",
  "/business-cctv-systems",
  "/cart",
  "/categories",
  "/cctv-for",
  "/checkout",
  "/compare",
  "/contact",
  "/cookies",
  "/dashboard",
  "/dashboard/addresses",
  "/dashboard/notifications",
  "/dashboard/orders",
  "/dashboard/settings",
  "/dashboard/wishlist",
  "/delivery",
  "/faqs",
  "/forgot-password",
  "/guides",
  "/kit-builder",
  "/kit-builder/cctv",
  "/kits",
  "/login",
  "/parts",
  "/privacy",
  "/product-index",
  "/products",
  "/returns",
  "/reviews-policy",
  "/signup",
  "/terms",
  "/tools/cctv-lens-calculator",
  "/tools/cctv-storage-calculator",
  "/tools/poe-voltage-drop-calculator",
  "/trade",
  "/visit",
]);

/** Routes with a slug that can't be checked here (generated from data elsewhere). */
const UNCHECKED_PREFIXES = ["/brands/", "/collections/", "/cctv-for/", "/kits/browse/", "/dashboard/orders/"];

async function pageSlugs(): Promise<Set<string>> {
  try {
    const rows = await db.pages.find({}, { projection: { _id: 0, slug: 1 } }).toArray();
    return new Set(rows.map((r) => r.slug.replace(/^\/+/, "")));
  } catch {
    return new Set();
  }
}

/**
 * Warnings for internal links that don't lead anywhere, keyed like the form's fields ({ "footer.columns.0.links.2.href":
 * "…" }). External links, anchors and empty values are skipped.
 */
export async function linkWarnings(links: { path: string; href: string }[]): Promise<Record<string, string>> {
  await ensureCatalog();
  let pages: Set<string> | null = null;
  const out: Record<string, string> = {};
  for (const { path, href } of links) {
    const v = href.trim();
    if (!v.startsWith("/") || v.startsWith("//")) continue;
    const pathname = (v.split(/[?#]/)[0].replace(/\/+$/, "") || "/").toLowerCase();
    const [, first, second, ...rest] = pathname.split("/");
    let warning: string | null = null;
    if (first === "categories" && second && !rest.length) {
      if (!getCategory(second)) warning = `There's no visible category "${second}". Check the link, or the category's visibility under Categories.`;
    } else if (first === "products" && second && !rest.length) {
      if (!getProduct(second)) warning = `There's no active product "${second}". Check the link, or the product's status under Products.`;
    } else if (first === "blog" && second && !rest.length) {
      if (!getBlogPost(second)) warning = `There's no published blog post "${second}".`;
    } else if (!STATIC_ROUTES.has(pathname) && !UNCHECKED_PREFIXES.some((p) => pathname.startsWith(p))) {
      pages ??= await pageSlugs();
      const slug = pathname.replace(/^\/(pages\/)?/, "");
      if (!pages.has(slug)) warning = `No page was found at ${pathname} on the shop. Check the link.`;
    }
    if (warning) out[path] = warning;
  }
  return out;
}
