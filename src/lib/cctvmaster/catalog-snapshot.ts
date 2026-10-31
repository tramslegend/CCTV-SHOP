// Builds the storefront's in-memory catalogue from the database, in the shapes the pages already use (types.ts).
// A shop of this size (a few thousand products) fits comfortably in memory; the snapshot is rebuilt only when
// catalog_state.version changes, i.e. after an admin edit.
import { db } from "@/db";
import { markdownHeadings } from "@/lib/content/markdown";
import type { BlogPost, Category, Crumb, Kit, KitNavNode, Product, ProductCard, Taxonomy } from "./types";

export interface BlogExtras {
  toc?: [string, string, number][];
  body?: Record<string, string>;
  faq?: [string, string][];
  products?: string[];
  related?: string[];
  tags?: string[];
  sources?: [string, string][];
  images?: string[];
}

export interface Snapshot {
  version: number;
  products: Product[];
  productIndex: Map<string, Product>;
  cards: Map<string, ProductCard>;
  categories: Category[];
  taxonomy: Taxonomy;
  posts: BlogPost[];
  blogExtras: Map<string, BlogExtras>;
  /** Article bodies written in the admin (markdown), by slug. Posts without one show their outline instead. */
  blogBodies: Map<string, string>;
  /** Slugs listed on /blog, in display order. */
  blogOrder: string[];
  settings: Map<string, unknown>;
}

/** "Wire & Cable" → "wire-&-cable", "Turbo HD" → "turbo-hd", "4MP" → "4mp". */
const pathSegment = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

const SCHEMA_AVAILABILITY: Record<string, string> = {
  in_stock: "InStock",
  backorder: "BackOrder",
  out_of_stock: "OutOfStock",
  discontinued: "Discontinued",
};

export async function readCatalogVersion(): Promise<number> {
  const row = await db.catalogState.findOne({ _id: 1 }, { projection: { version: 1 } });
  return row?.version ?? 0;
}

export async function buildSnapshot(version: number): Promise<Snapshot> {
  const [cats, prods, images, links, related, parts, posts, settingRows] = await Promise.all([
    db.categories.find().sort({ position: 1, _id: 1 }).toArray(),
    db.products.find({ status: "active" }).toArray(),
    db.productImages.find().sort({ productId: 1, position: 1 }).toArray(),
    db.productCategories.find().sort({ categoryId: 1, position: 1 }).toArray(),
    db.productRelated.find().sort({ productId: 1, position: 1 }).toArray(),
    db.kitComponents.find().sort({ kitId: 1, position: 1 }).toArray(),
    db.blogPosts.find({ status: "active" }).toArray(),
    db.settings.find().toArray(),
  ]);
  const settings = new Map(settingRows.map((r) => [r.key, r.value]));

  // ----- categories -----
  // A hidden category hides everything below it too (otherwise its children would surface as top-level categories).
  const rawCatById = new Map(cats.map((c) => [c.id, c]));
  const shownInShop = (c: (typeof cats)[number]) => {
    const seen = new Set<number>();
    for (let x: (typeof cats)[number] | undefined = c; x && !seen.has(x.id); x = x.parentId ? rawCatById.get(x.parentId) : undefined) {
      if (!x.visible) return false;
      seen.add(x.id);
    }
    return true;
  };
  const catById = new Map(cats.filter(shownInShop).map((c) => [c.id, c]));
  const chainOf = (id: number | null | undefined) => {
    const chain: (typeof cats)[number][] = [];
    for (let c = id ? catById.get(id) : undefined; c; c = c.parentId ? catById.get(c.parentId) : undefined) chain.unshift(c);
    return chain;
  };
  const crumbsFor = (chain: (typeof cats)[number][]): Crumb[] => [
    { name: "Home", href: "/" },
    ...(chain[0]?.isKitRange ? [] : [{ name: "Products", href: "/products" }]),
    ...chain.map((c) => ({ name: c.name, href: `/categories/${c.slug}` })),
  ];

  // ----- products -----
  const groupBy = <T, K>(rows: T[], key: (r: T) => K) => {
    const map = new Map<K, T[]>();
    for (const r of rows) map.set(key(r), [...(map.get(key(r)) ?? []), r]);
    return map;
  };
  const imagesBy = groupBy(images, (r) => r.productId);
  const relatedBy = groupBy(related, (r) => r.productId);
  const partsBy = groupBy(parts, (r) => r.kitId);
  const slugById = new Map(prods.map((p) => [p.id, p.slug]));

  const products: Product[] = prods.map((p) => {
    const chain = chainOf(p.primaryCategoryId);
    const imgs = imagesBy.get(p.id) ?? [];
    const kitMeta = p.kit as Omit<Kit, "components"> | null;
    const product: Product = {
      slug: p.slug,
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? undefined,
      currency: "GBP",
      category: chain[0]?.name,
      // `slug` is the short, name-based path segment ("cameras", "ip", "4mp") that kit and product helpers match on;
      // `href` is the category's page.
      categoryPath: chain.map((c) => ({ name: c.name, slug: pathSegment(c.name), href: `/categories/${c.slug}` })),
      images: imgs.map((i) => i.url),
      imageAlts: Object.fromEntries(imgs.filter((i) => i.alt).map((i) => [i.url, i.alt as string])),
      inStock: p.availability === "in_stock",
      isDiscontinued: p.availability === "discontinued",
      isContactSales: p.isContactSales,
      isCallForPrice: p.isCallForPrice,
      badge: p.badge ?? undefined,
      attributes: p.attributes,
      partNumbers: p.partNumbers ?? undefined,
      availability: SCHEMA_AVAILABILITY[p.availability],
      brand: p.brand ?? undefined,
      shortDescription: p.shortDescription ?? undefined,
      description: p.description ?? undefined,
      seoTitle: p.seoTitle ?? undefined,
      seoDescription: p.seoDescription ?? undefined,
      breadcrumbs: [...crumbsFor(chain), { name: p.name, href: `/products/${p.slug}` }],
      related: (relatedBy.get(p.id) ?? []).map((r) => slugById.get(r.relatedId)).filter((x): x is string => !!x),
      guides: p.guides,
    };
    if (kitMeta) {
      product.kit = {
        ...kitMeta,
        components: (partsBy.get(p.id) ?? []).map((c) => ({
          name: c.name,
          sku: c.sku ?? "",
          href: c.componentId && slugById.has(c.componentId) ? `/products/${slugById.get(c.componentId)}` : "",
          qty: c.qty,
          role: c.role,
          image: c.imageUrl ?? undefined,
        })),
      };
    }
    return product;
  });
  const productIndex = new Map(products.map((p) => [p.slug, p]));

  const cards = new Map<string, ProductCard>(
    prods.map((p) => {
      const product = productIndex.get(p.slug)!;
      return [
        p.slug,
        {
          slug: p.slug,
          name: p.name,
          sku: p.sku,
          category: product.category,
          price: p.price,
          compareAtPrice: product.compareAtPrice,
          isCallForPrice: p.isCallForPrice,
          isContactSales: p.isContactSales,
          imageUrl: product.images?.[0],
          image: product.images?.[0],
          badge: product.badge,
          inStock: product.inStock,
          decide: p.listing ?? undefined,
        },
      ];
    }),
  );

  const linksBy = groupBy(links, (r) => r.categoryId);
  const categories: Category[] = [...catById.values()].map((c) => {
    const chain = chainOf(c.id);
    const productSlugs = (linksBy.get(c.id) ?? []).map((l) => slugById.get(l.productId)).filter((x): x is string => !!x);
    return {
      slug: c.slug,
      title: c.title ?? c.name,
      metaDescription: c.metaDescription ?? undefined,
      breadcrumbs: crumbsFor(chain),
      total: productSlugs.length,
      facetScope: c.isKitRange ? undefined : chain.map((x) => x.name),
      products: productSlugs,
      description: c.description?.trim() || undefined,
      imageUrl: c.imageUrl ?? undefined,
      kitFilter: c.isKitRange && c.kitFilter ? c.kitFilter : undefined,
    };
  });

  const taxonomy: Taxonomy = {
    categoryTree: [...catById.values()]
      .filter((c) => !c.parentId && !c.isKitRange)
      .map((c, i) => ({ name: c.name, slug: c.slug, displayName: c.name, imageUrl: c.imageUrl ?? undefined, sizeRank: i })),
    kitNav: (settings.get("catalog.kitNav") as KitNavNode | undefined) ?? {
      slug: "cctv-kits",
      href: "/categories/cctv-kits",
      name: "CCTV Kits",
      kits: products.filter((p) => p.kit).length,
      axis: "root",
      children: [],
    },
    facetWords: (settings.get("catalog.facetWords") as Taxonomy["facetWords"] | undefined) ?? { groups: {}, options: {} },
  };

  // ----- blog -----
  const blogExtras = new Map<string, BlogExtras>();
  const blogBodies = new Map<string, string>();
  const blog: BlogPost[] = posts
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .map((p) => {
      const extras = (p.extras ?? {}) as BlogExtras;
      blogExtras.set(p.slug, extras);
      const body = p.body?.trim() ? p.body : null;
      if (body) blogBodies.set(p.slug, body);
      return {
        slug: p.slug,
        title: p.title,
        headline: p.title,
        excerpt: p.excerpt ?? undefined,
        datePublished: p.publishedAt?.toISOString().slice(0, 10),
        dateModified: (p.modifiedAt ?? p.publishedAt)?.toISOString().slice(0, 10),
        section: p.section ?? undefined,
        keywords: p.keywords ?? undefined,
        wordCount: p.wordCount ?? undefined,
        image: p.coverImage ?? undefined,
        images: extras.images ?? [],
        author: p.authorName ? { name: p.authorName, jobTitle: p.authorTitle ?? undefined, image: p.authorImage ?? undefined } : undefined,
        headings: body
          ? markdownHeadings(body)
              .filter((h) => h.level === 2)
              .map((h) => h.text)
          : (extras.toc ?? []).filter((t) => t[2] === 2).map((t) => t[1]),
        breadcrumbs: [
          { name: "Home", href: "/" },
          { name: "Blog", href: "/blog" },
          { name: p.title, href: `/blog/${p.slug}` },
        ],
      };
    });
  // Listing order: the position set in the admin, then newest first.
  const blogOrder = posts
    .filter((p) => p.listed)
    .sort(
      (a, b) =>
        a.position - b.position || (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0) || b.id - a.id,
    )
    .map((p) => p.slug);

  return { version, products, productIndex, cards, categories, taxonomy, posts: blog, blogExtras, blogBodies, blogOrder, settings };
}
