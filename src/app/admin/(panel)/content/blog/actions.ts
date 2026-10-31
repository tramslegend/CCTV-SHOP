"use server";

// Blog post mutations. Every write: requireAdmin("content") → zod validation → database writes in one transaction →
// activity log entry with a concise diff → bumpCatalogVersion() so the shop reloads its catalogue snapshot.
import { redirect } from "next/navigation";
import type { ClientSession } from "mongodb";
import { z } from "zod";
import type { ActionResult, FieldErrors, PostFormValues, SavedPost } from "@/components/admin/content/types";
import { db, escapeRegex, insert, stripId, transaction } from "@/db";
import type { BlogPostRow } from "@/db/schema";
import { bumpCatalogVersion, logActivity, requireAdmin } from "@/lib/admin/session";
import type { BlogExtras } from "@/lib/cctvmaster/catalog-snapshot";
import { countWords } from "@/lib/content/markdown";
import { fieldErrorsOf, type PostInput, postInputSchema } from "@/lib/content/validation";
import { todayInUk } from "../_lib/format";
import { listingOrder } from "./_lib/data";

type PostRow = BlogPostRow;
type Tx = ClientSession;
type Actor = Awaited<ReturnType<typeof requireAdmin>>["user"];
type Json = Record<string, unknown>;

/** Position stored on unlisted posts (the /blog listing only orders listed ones). */
const UNLISTED_POSITION = 1000;

const fail = (message: string, fieldErrors?: FieldErrors) => ({ ok: false as const, message, fieldErrors });
const idSchema = z.number().int().positive();
const day = (v: string) => new Date(`${v}T00:00:00Z`);
const isoDay = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

// ---------- activity-log diffs ----------

const LONG_TEXT = new Set(["body", "excerpt"]);

function diff(before: Json, after: Json): Json {
  const out: Json = {};
  for (const key of Object.keys(after)) {
    const a = before[key] ?? null;
    const b = after[key] ?? null;
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (LONG_TEXT.has(key)) {
      const len = (x: unknown) => (typeof x === "string" ? x.length : 0);
      out[key] = `edited (${len(a).toLocaleString("en-GB")} → ${len(b).toLocaleString("en-GB")} characters)`;
    } else out[key] = { from: a, to: b };
  }
  return out;
}

function auditView(p: Pick<PostRow, "title" | "slug" | "excerpt" | "body" | "coverImage" | "section" | "keywords" | "authorName" | "authorTitle" | "authorImage" | "status" | "listed" | "publishedAt" | "modifiedAt">, extras: BlogExtras, rank: number | null): Json {
  return {
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    body: p.body,
    coverImage: p.coverImage,
    section: p.section,
    keywords: p.keywords,
    tags: extras.tags ?? [],
    author: [p.authorName, p.authorTitle].filter(Boolean).join(", ") || null,
    authorImage: p.authorImage,
    status: p.status,
    listed: p.listed,
    position: p.listed ? rank : null,
    publishedAt: isoDay(p.publishedAt),
    modifiedAt: isoDay(p.modifiedAt),
    faq: `${extras.faq?.length ?? 0} questions`,
    products: extras.products ?? [],
    related: extras.related ?? [],
    sources: `${extras.sources?.length ?? 0} sources`,
  };
}

// ---------- listing order ----------

/** Places the post at `position` (1 = first) among listed posts and renumbers them 0, 1, 2… */
async function placeInListing(tx: Tx, postId: number, position: number) {
  const others = await db.blogPosts
    .find({ listed: true, _id: { $ne: postId } }, { projection: { _id: 0, id: 1, position: 1 }, session: tx })
    .sort(listingOrder)
    .toArray();
  const order = others.map((o) => o.id);
  order.splice(Math.min(Math.max(position - 1, 0), order.length), 0, postId);
  const current = new Map(others.map((o) => [o.id, o.position]));
  const changes = order.map((id, i) => ({ id, pos: i })).filter((c) => c.id === postId || current.get(c.id) !== c.pos);
  if (!changes.length) return;
  // Only the position: renumbering isn't an edit of the other posts, so their updatedAt stays.
  await db.blogPosts.bulkWrite(
    changes.map((c) => ({ updateOne: { filter: { _id: c.id }, update: { $set: { position: c.pos } } } })),
    { session: tx },
  );
}

async function currentRank(postId: number): Promise<number | null> {
  const rows = await db.blogPosts.find({ listed: true }, { projection: { _id: 0, id: 1 } }).sort(listingOrder).toArray();
  const i = rows.findIndex((r) => r.id === postId);
  return i >= 0 ? i + 1 : null;
}

// ---------- links to a post from products and other posts ----------

/** Replaces (or, with `to` null, removes) a post slug in products' "helpful guides" and posts' related lists. */
async function relinkSlug(tx: Tx, from: string, to: string | null) {
  // Every occurrence is replaced (or removed) in place, order kept. Like the old raw SQL, updatedAt isn't touched.
  if (to === null) {
    await db.products.updateMany({ guides: from }, { $pull: { guides: from } }, { session: tx });
    await db.blogPosts.updateMany({ "extras.related": from }, { $pull: { "extras.related": from } }, { session: tx });
  } else {
    await db.products.updateMany({ guides: from }, { $set: { "guides.$[x]": to } }, { arrayFilters: [{ x: from }], session: tx });
    await db.blogPosts.updateMany(
      { "extras.related": from },
      { $set: { "extras.related.$[x]": to } },
      { arrayFilters: [{ x: from }], session: tx },
    );
  }
}

// ---------- create / update ----------

async function checkReferences(v: PostInput, selfId: number | null, selfSlugs: string[]) {
  const errors: FieldErrors = {};
  const productIds = v.products.map((p) => p.id);
  const relatedSlugs = v.related.map((r) => r.slug);
  const [slugTaken, productRows, postRows] = await Promise.all([
    db.blogPosts.findOne({ slug: v.slug, ...(selfId ? { _id: { $ne: selfId } } : {}) }, { projection: { _id: 1 } }),
    productIds.length
      ? db.products.find<{ id: string; slug: string }>({ _id: { $in: productIds } }, { projection: { _id: 0, id: 1, slug: 1 } }).toArray()
      : Promise.resolve([]),
    relatedSlugs.length
      ? db.blogPosts.find<{ slug: string }>({ slug: { $in: relatedSlugs } }, { projection: { _id: 0, slug: 1 } }).toArray()
      : Promise.resolve([]),
  ]);
  if (slugTaken) errors.slug = "Another post already uses this URL slug.";
  const productSlug = new Map(productRows.map((r) => [r.id, r.slug]));
  v.products.forEach((p, i) => {
    if (!productSlug.has(p.id)) errors[`products.${i}`] = "This product no longer exists.";
  });
  const posts = new Set(postRows.map((r) => r.slug));
  v.related.forEach((r, i) => {
    if (selfSlugs.includes(r.slug)) errors[`related.${i}`] = "A post can't be related to itself.";
    else if (!posts.has(r.slug)) errors[`related.${i}`] = "This post no longer exists.";
  });
  return { errors, productSlug };
}

async function savePost(user: Actor, id: number | null, raw: unknown): Promise<ActionResult<SavedPost>> {
  const parsed = postInputSchema.safeParse(raw);
  if (!parsed.success) return fail("Some fields need attention. Check the highlighted fields.", fieldErrorsOf(parsed.error));
  const v = parsed.data;

  const existing = id ? await db.blogPosts.findOne({ _id: id }) : null;
  if (id && !existing) return fail("This post no longer exists. It may have been deleted.");
  const { errors, productSlug } = await checkReferences(v, id, [v.slug, existing?.slug ?? ""].filter(Boolean));
  if (Object.keys(errors).length) return fail("Some fields need attention. Check the highlighted fields.", errors);

  const previousExtras = ((existing?.extras ?? {}) as BlogExtras) ?? {};
  // The outline (toc, section summaries) and image variants are kept: the outline shows again if the body is cleared.
  const extras: BlogExtras = {
    ...previousExtras,
    faq: v.faq.filter((f) => f.q && f.a).map((f) => [f.q, f.a] as [string, string]),
    products: v.products.map((p) => productSlug.get(p.id)!).filter(Boolean),
    related: v.related.map((r) => r.slug),
    tags: v.tags,
    sources: v.sources.filter((src) => src.title && src.url).map((src) => [src.title, src.url] as [string, string]),
  };
  const hadBody = !!existing?.body?.trim();
  const wordCount = v.body ? countWords(v.body) : hadBody ? null : (existing?.wordCount ?? null);
  const row = {
    title: v.title,
    slug: v.slug,
    excerpt: v.excerpt,
    body: v.body,
    extras: extras as Record<string, unknown>,
    coverImage: v.coverImage,
    section: v.section,
    keywords: v.keywords,
    authorName: v.authorName,
    authorTitle: v.authorName ? v.authorTitle : null,
    authorImage: v.authorName ? v.authorImage : null,
    status: v.status,
    listed: v.listed,
    wordCount,
    publishedAt: day(v.publishedAt),
    modifiedAt: v.modifiedAt ? day(v.modifiedAt) : null,
  };

  const rankBefore = existing?.listed ? await currentRank(existing.id) : null;
  const reorder = v.listed && (!existing || !existing.listed || rankBefore !== v.position);
  const before = existing ? auditView(existing, previousExtras, rankBefore) : {};
  const after = auditView(row, extras, v.listed ? v.position : null);
  if (existing && !reorder && v.listed) after.position = rankBefore;
  const changes = existing ? diff(before, after) : null;
  if (existing && changes && !Object.keys(changes).length) return { ok: true, message: "No changes to save.", data: { id: existing.id, slug: existing.slug } };

  const postId = await transaction(async (tx) => {
    let targetId: number;
    if (existing) {
      await db.blogPosts.updateOne(
        { _id: existing.id },
        { $set: { ...row, ...(v.listed ? {} : { position: UNLISTED_POSITION }), updatedAt: new Date() } },
        { session: tx },
      );
      targetId = existing.id;
    } else {
      const [created] = await insert("blogPosts", { ...row, position: v.listed ? 0 : UNLISTED_POSITION }, { session: tx });
      targetId = created.id;
    }
    if (reorder) await placeInListing(tx, targetId, v.position);
    if (existing && existing.slug !== v.slug) await relinkSlug(tx, existing.slug, v.slug);
    return targetId;
  });

  if (existing) await logActivity(user, "post.update", "blog_post", postId, changes ?? {});
  else
    await logActivity(user, "post.create", "blog_post", postId, {
      title: v.title,
      slug: v.slug,
      status: v.status,
      listed: v.listed,
      ...(v.listed ? { position: v.position } : {}),
    });
  await bumpCatalogVersion();

  const live = v.status === "active";
  const message = existing
    ? live
      ? existing.status === "active"
        ? "Post saved."
        : "Post published."
      : "Post saved. It isn't visible in the shop."
    : live
      ? `Post published${v.listed ? " on /blog" : " (unlisted: reachable by its address only)"}.`
      : "Draft created. Publish it when it's ready.";
  return { ok: true, message, data: { id: postId, slug: v.slug } };
}

export async function createPost(input: PostFormValues): Promise<ActionResult<SavedPost>> {
  const { user } = await requireAdmin("content");
  return savePost(user, null, input);
}

export async function updatePost(id: number, input: PostFormValues): Promise<ActionResult<SavedPost>> {
  const { user } = await requireAdmin("content");
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown post.");
  return savePost(user, parsedId.data, input);
}

// ---------- duplicate / delete ----------

/** First free slug of `${base}-copy`, `${base}-copy-2`, … */
async function freeCopySlug(base: string) {
  const stem = `${base}-copy`;
  const taken = new Set(
    (
      await db.blogPosts
        .find({ $or: [{ slug: stem }, { slug: { $regex: `^${escapeRegex(stem)}-` } }] }, { projection: { _id: 0, slug: 1 } })
        .toArray()
    ).map((r) => r.slug),
  );
  if (!taken.has(stem)) return stem;
  for (let n = 2; ; n++) if (!taken.has(`${stem}-${n}`)) return `${stem}-${n}`;
}

/** Copies a post as an unlisted draft dated today (nothing changes on /blog until it's published and listed). */
export async function duplicatePost(id: number): Promise<ActionResult<SavedPost>> {
  const { user } = await requireAdmin("content");
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown post.");
  const source = await db.blogPosts.findOne({ _id: parsedId.data });
  if (!source) return fail("This post no longer exists.");
  const slug = await freeCopySlug(source.slug.slice(0, 180));
  const rest: Partial<PostRow> = { ...stripId(source) };
  delete rest.id;
  delete rest.createdAt;
  delete rest.updatedAt;
  const [created] = await insert("blogPosts", {
    ...(rest as Omit<PostRow, "id" | "createdAt" | "updatedAt">),
    slug,
    title: `${source.title} (copy)`.slice(0, 200),
    status: "draft",
    listed: false,
    position: UNLISTED_POSITION,
    publishedAt: day(todayInUk()),
    modifiedAt: null,
  });
  await logActivity(user, "post.duplicate", "blog_post", created.id, { from: source.id, fromSlug: source.slug, slug, status: "draft" });
  await bumpCatalogVersion();
  return { ok: true, message: "Copied as an unlisted draft.", data: { id: created.id, slug } };
}

export async function deletePost(id: number): Promise<ActionResult> {
  const { user } = await requireAdmin("content");
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown post.");
  const post = await db.blogPosts.findOne({ _id: parsedId.data });
  if (!post) return fail("This post no longer exists.");
  await transaction(async (tx) => {
    await db.blogPosts.deleteOne({ _id: post.id }, { session: tx });
    // Products' "helpful guides" and other posts' related lists stop pointing at it.
    await relinkSlug(tx, post.slug, null);
  });
  await logActivity(user, "post.delete", "blog_post", post.id, { title: post.title, slug: post.slug, status: post.status, listed: post.listed });
  await bumpCatalogVersion();
  redirect(`/admin/content/blog?deleted=${encodeURIComponent(post.title.slice(0, 80))}`);
}
