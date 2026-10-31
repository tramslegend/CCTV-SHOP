// Where an image is used. Images are referenced by URL (there are no links to `media`), from:
//   product_images.url, kit_components.image_url, categories.image_url, blog_posts.cover_image / author_image,
//   order_items.image_url (past orders keep the picture they were placed with), and inside text: product and category
//   descriptions (markdown), blog post bodies and structured extras, page blocks and settings values (e.g. a logo).
//
// Two forms of the same scan:
//  - collectRefs(): every reference in the shop as url → places ("kind:id") — image URLs inside text are extracted with
//    a regular expression (by the database for text fields, here for JSON values, which are searched as JSON text).
//    Cheap enough to run on every library page (one pass over each collection), used for the "used in" counts and the
//    used / unused filter.
//  - findUsage(url): the exact places one URL appears, with names and links. Text fields are searched for the URL as
//    a substring, so it never misses a reference the extraction might; deletion is checked with this one.
import type { Document } from "mongodb";
import type { MediaUsage, UsageEntry } from "@/components/admin/media/types";
import { db } from "@/db";

/**
 * Image URLs inside free text / JSON: absolute (https://…) or site-relative (/…), ending in an image extension. One
 * pattern for the database (PCRE) and JavaScript: the longest match from the leftmost start, as Postgres evaluated the
 * former pattern, with the whitespace characters written out so both engines agree.
 */
const IMAGE_URL_PATTERN = String.raw`(?:https?://|/)[^\][ \t\n\x0b\f\r"'()<>]+\.(?:jpe?g|png|webp|avif|gif)`;
const IMAGE_URL_RE = new RegExp(IMAGE_URL_PATTERN, "gi");

const imageUrlsIn = (text: string) => [...text.matchAll(IMAGE_URL_RE)].map((m) => m[0]);
/** A JSON value as the text that is searched (the old value::text). */
const jsonText = (value: unknown) => JSON.stringify(value ?? null);

/** Text fields joined with spaces, missing ones as "" (the old coalesce(a, '') || ' ' || coalesce(b, '')). */
const joinedText = (fields: string[]): Document => ({
  $concat: fields.flatMap((f, i) => [...(i ? [" "] : []), { $ifNull: [`$${f}`, ""] }]),
});
/** "kind:id", the place a reference belongs to (ids as text, the old id::text). */
const placeOf = (kind: string, id: string | Document): Document => ({ $concat: [`${kind}:`, id] });
const idText = { $toString: "$_id" };

/** References held in a URL field, when it's set. */
const urlField = (field: string, kind: string, id: string | Document): Document[] => [
  { $match: { [field]: { $ne: null } } },
  { $project: { _id: 0, url: `$${field}`, ref: placeOf(kind, id) } },
];

/** References inside text fields: every image URL the pattern finds. */
const urlsInText = (fields: string[], kind: string, id: string | Document): Document[] => [
  {
    $project: {
      _id: 0,
      url: { $map: { input: { $regexFindAll: { input: joinedText(fields), regex: IMAGE_URL_PATTERN, options: "i" } }, in: "$$this.match" } },
      ref: placeOf(kind, id),
    },
  },
  { $unwind: "$url" },
];

/** Every image URL referenced in the shop with the places ("kind:id") using it. `withOrders` adds past order lines. */
async function collectRefs({ withOrders = true }: { withOrders?: boolean } = {}): Promise<Map<string, Set<string>>> {
  const union = (coll: string, pipeline: Document[]) => ({ $unionWith: { coll, pipeline } });
  const [grouped, posts, pages, settings] = await Promise.all([
    db.productImages
      .aggregate<{ _id: string; refs: string[] }>([
        { $project: { _id: 0, url: 1, ref: placeOf("product", "$productId") } },
        union(db.kitComponents.collectionName, urlField("imageUrl", "product", "$kitId")),
        union(db.categories.collectionName, urlField("imageUrl", "category", idText)),
        union(db.blogPosts.collectionName, urlField("coverImage", "post", idText)),
        union(db.blogPosts.collectionName, urlField("authorImage", "post", idText)),
        union(db.products.collectionName, urlsInText(["description", "shortDescription"], "product", "$_id")),
        union(db.categories.collectionName, urlsInText(["description"], "category", idText)),
        union(db.blogPosts.collectionName, urlsInText(["body"], "post", idText)),
        ...(withOrders ? [union(db.orderItems.collectionName, urlField("imageUrl", "order", { $toString: "$orderId" }))] : []),
        { $group: { _id: "$url", refs: { $addToSet: "$ref" } } },
      ])
      .toArray(),
    // JSON values can't be searched as text by the database: they're scanned here.
    db.blogPosts
      .find({ extras: { $ne: null } })
      .project<{ ref: string; extras: unknown }>({ _id: 0, ref: placeOf("post", idText), extras: 1 })
      .toArray(),
    db.pages.find().project<{ ref: string; blocks: unknown }>({ _id: 0, ref: placeOf("page", idText), blocks: 1 }).toArray(),
    db.settings.find().project<{ ref: string; value: unknown }>({ _id: 0, ref: placeOf("setting", "$_id"), value: 1 }).toArray(),
  ]);
  const refs = new Map(grouped.map((g) => [g._id, new Set(g.refs)]));
  const add = (urls: string[], ref: string) => {
    for (const url of urls) {
      const places = refs.get(url);
      if (places) places.add(ref);
      else refs.set(url, new Set([ref]));
    }
  };
  for (const p of posts) add(imageUrlsIn(jsonText(p.extras)), p.ref);
  for (const p of pages) add(imageUrlsIn(jsonText(p.blocks)), p.ref);
  for (const s of settings) add(imageUrlsIn(jsonText(s.value)), s.ref);
  return refs;
}

/** Number of distinct places using each image URL (the "used in" counts; past orders included). */
export async function usageCounts(): Promise<Map<string, number>> {
  const refs = await collectRefs();
  return new Map([...refs].map(([url, places]) => [url, places.size]));
}

/** Distinct image URLs referenced by the catalogue and content (not past orders), for "Import existing images". */
export async function referencedImageUrls(): Promise<string[]> {
  const refs = await collectRefs({ withOrders: false });
  return [...refs.keys()].filter((url) => !!url).sort();
}

const LISTED_ORDERS = 10;

/** Whether the text fields (joined with spaces) contain `url` (the old strpos(…) > 0). */
const textContains = (fields: string[], url: string) => ({ $expr: { $gte: [{ $indexOfCP: [joinedText(fields), { $literal: url }] }, 0] } });

/** The product each group (`_id` = product id) belongs to, as `product` (groups of missing products are dropped). */
const productStages: Document[] = [
  {
    $lookup: {
      from: db.products.collectionName,
      localField: "_id",
      foreignField: "_id",
      pipeline: [{ $project: { name: 1, sku: 1 } }],
      as: "product",
    },
  },
  { $unwind: "$product" },
];

/** Blog posts using `url`, with where they use it. */
async function postsUsing(url: string) {
  const withExtras = await db.blogPosts
    .find({ extras: { $ne: null } })
    .project<{ id: number; extras: unknown }>({ _id: 0, id: 1, extras: 1 })
    .toArray();
  const inExtras = new Set(withExtras.filter((p) => jsonText(p.extras).includes(url)).map((p) => p.id));
  const rows = await db.blogPosts
    .find({ $or: [{ coverImage: url }, { authorImage: url }, textContains(["body"], url), { _id: { $in: [...inExtras] } }] })
    .project<{ id: number; title: string; slug: string; coverImage: string | null; authorImage: string | null; body: string | null }>({
      _id: 0,
      id: 1,
      title: 1,
      slug: 1,
      coverImage: 1,
      authorImage: 1,
      body: 1,
    })
    .sort({ title: 1 })
    .toArray();
  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    cover: p.coverImage === url,
    author: p.authorImage === url,
    body: (p.body ?? "").includes(url),
    extras: inExtras.has(p.id),
  }));
}

/** Past orders with a line showing `url`: how many, and the latest few. */
async function ordersUsing(url: string) {
  const ids = await db.orderItems.distinct("orderId", { imageUrl: url });
  const latest = ids.length
    ? await db.orders
        .find({ _id: { $in: ids } })
        .project<{ id: number; number: string }>({ _id: 0, id: 1, number: 1 })
        .sort({ _id: -1 })
        .limit(LISTED_ORDERS)
        .toArray()
    : [];
  return { latest, count: ids.length };
}

/** Every place `url` is used, with labels and links. Past orders are counted and the latest few listed. */
export async function findUsage(url: string): Promise<MediaUsage> {
  const [productImages, kitImages, descriptions, categories, posts, pages, settings, orders] = await Promise.all([
    db.productImages
      .aggregate<{ id: string; name: string; sku: string; n: number }>([
        { $match: { url } },
        { $group: { _id: "$productId", n: { $sum: 1 } } },
        ...productStages,
        { $project: { _id: 0, id: "$product._id", name: "$product.name", sku: "$product.sku", n: 1 } },
        { $sort: { name: 1 } },
      ])
      .toArray(),
    db.kitComponents
      .aggregate<{ id: string; name: string; sku: string; names: string[] }>([
        { $match: { imageUrl: url } },
        { $group: { _id: "$kitId", names: { $addToSet: "$name" } } },
        ...productStages,
        { $project: { _id: 0, id: "$product._id", name: "$product.name", sku: "$product.sku", names: 1 } },
        { $sort: { name: 1 } },
      ])
      .toArray()
      // Distinct component names in order, as string_agg(distinct …) gave them.
      .then((rows) => rows.map(({ names, ...k }) => ({ ...k, components: [...names].sort().join(", ") }))),
    db.products
      .find(textContains(["description", "shortDescription"], url))
      .project<{ id: string; name: string; sku: string; slug: string }>({ _id: 0, id: 1, name: 1, sku: 1, slug: 1 })
      .sort({ name: 1 })
      .toArray(),
    db.categories
      .find({ $or: [{ imageUrl: url }, textContains(["description"], url)] })
      .project<{ id: number; name: string; slug: string; imageUrl: string | null }>({ _id: 0, id: 1, name: 1, slug: 1, imageUrl: 1 })
      .sort({ name: 1 })
      .toArray()
      .then((rows) => rows.map(({ imageUrl, ...c }) => ({ ...c, image: imageUrl === url }))),
    postsUsing(url),
    db.pages
      .find()
      .project<{ id: number; title: string; slug: string; blocks: unknown }>({ _id: 0, id: 1, title: 1, slug: 1, blocks: 1 })
      .sort({ title: 1 })
      .toArray()
      .then((rows) => rows.filter((p) => jsonText(p.blocks).includes(url))),
    db.settings
      .find()
      .project<{ key: string; value: unknown }>({ _id: 0, key: 1, value: 1 })
      .sort({ _id: 1 })
      .toArray()
      .then((rows) => rows.filter((s) => jsonText(s.value).includes(url))),
    ordersUsing(url),
  ]);

  const entries: UsageEntry[] = [];
  const seenProducts = new Set<string>();
  for (const p of productImages) {
    seenProducts.add(p.id);
    entries.push({
      kind: "product",
      id: p.id,
      label: p.name,
      detail: `${p.sku} · product image${p.n > 1 ? ` (${p.n}×)` : ""}`,
      href: `/admin/products/${encodeURIComponent(p.id)}`,
      publicHref: null,
    });
  }
  for (const k of kitImages)
    entries.push({
      kind: "kit",
      id: k.id,
      label: k.name,
      detail: `${k.sku} · kit component picture (${k.components})`,
      href: `/admin/products/${encodeURIComponent(k.id)}`,
      publicHref: null,
    });
  for (const p of descriptions)
    entries.push({
      kind: "product",
      id: p.id,
      label: p.name,
      detail: `${p.sku} · ${seenProducts.has(p.id) ? "also in the description" : "in the description"}`,
      href: `/admin/products/${encodeURIComponent(p.id)}`,
      publicHref: `/products/${p.slug}`,
    });
  for (const c of categories)
    entries.push({
      kind: "category",
      id: String(c.id),
      label: c.name,
      detail: c.image ? "Category image" : "In the category description",
      href: "/admin/categories",
      publicHref: `/categories/${c.slug}`,
    });
  for (const p of posts) {
    const where = [p.cover && "cover image", p.author && "author photo", p.body && "article body", p.extras && "structured data images"].filter(Boolean);
    entries.push({
      kind: "post",
      id: String(p.id),
      label: p.title,
      detail: `Blog post · ${where.join(", ")}`,
      href: `/admin/content/blog/${p.id}`,
      publicHref: `/blog/${p.slug}`,
    });
  }
  for (const p of pages)
    entries.push({
      kind: "page",
      id: String(p.id),
      label: p.title,
      detail: `Page content (/${p.slug})`,
      href: `/admin/content/pages/${p.slug}`,
      publicHref: `/${p.slug}`,
    });
  for (const s of settings)
    entries.push({ kind: "setting", id: s.key, label: `Store settings (${s.key})`, detail: "Setting value", href: "/admin/settings", publicHref: null });
  for (const o of orders.latest)
    entries.push({ kind: "order", id: String(o.id), label: `Order ${o.number}`, detail: "Past order line", href: `/admin/orders/${o.id}`, publicHref: null });

  return { entries, orderCount: orders.count };
}

/** Number of distinct places using the image (a product counts once however it uses it; each past order counts). */
export function usageTotal(u: MediaUsage): number {
  const places = new Set(u.entries.filter((e) => e.kind !== "order").map((e) => `${e.kind === "kit" ? "product" : e.kind}:${e.id}`));
  return places.size + u.orderCount;
}
