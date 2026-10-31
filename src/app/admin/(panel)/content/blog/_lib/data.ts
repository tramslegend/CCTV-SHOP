// Database reads for the blog admin (server only). Straight from the database, so drafts and archived posts are included.
import type { Filter } from "mongodb";
import { type BlogListState, BLOG_PAGE_SIZE } from "@/components/admin/content/blog-list-url";
import { POST_STATUSES, type PostFormMeta, type PostFormValues, type PostOption, type PostStatus } from "@/components/admin/content/types";
import type { ProductPick } from "@/components/admin/products/types";
import { contains, db, type Doc } from "@/db";
import type { BlogPostRow } from "@/db/schema";
import type { BlogExtras } from "@/lib/cctvmaster/catalog-snapshot";
import { newId } from "@/lib/content/blocks";
import { type PickedProduct, pickedStages } from "@/lib/homepage/admin";
import { formatDateTime, todayInUk, toDateInput } from "../../_lib/format";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseBlogListParams(sp: Record<string, string | string[] | undefined>): BlogListState {
  const status = one(sp.status);
  const listed = one(sp.listed);
  const page = Number(one(sp.page));
  return {
    q: one(sp.q).trim().slice(0, 120),
    status: (POST_STATUSES as readonly string[]).includes(status) ? (status as PostStatus) : "all",
    listed: listed === "listed" || listed === "unlisted" ? listed : "all",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/**
 * Listing order on /blog: the position set here, then newest first (as the shop sorts). MongoDB sorts null lowest, so
 * posts without a publish date come last among equal positions, as with Postgres' "desc nulls last".
 */
export const listingOrder = { position: 1, publishedAt: -1, _id: -1 } as const;

/** Rank (1 = first) of every listed post on /blog, counting drafts that are listed. */
export async function listedRanks(): Promise<Map<number, number>> {
  const rows = await db.blogPosts.find({ listed: true }, { projection: { _id: 0, id: 1 } }).sort(listingOrder).toArray();
  return new Map(rows.map((r, i) => [r.id, i + 1]));
}

interface PostListRow {
  id: number;
  slug: string;
  title: string;
  status: PostStatus;
  listed: boolean;
  coverImage: string | null;
  keywords: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  wordCount: number | null;
  hasBody: boolean;
}

export async function listPosts(state: BlogListState) {
  const base: Filter<Doc<BlogPostRow>> = {};
  if (state.q) base.$or = [{ title: contains(state.q) }, { slug: contains(state.q) }, { keywords: contains(state.q) }];
  if (state.listed !== "all") base.listed = state.listed === "listed";
  const where: Filter<Doc<BlogPostRow>> = state.status !== "all" ? { ...base, status: state.status } : base;

  const [rows, total, statusCounts, ranks] = await Promise.all([
    db.blogPosts
      .aggregate<PostListRow>([
        { $match: where },
        // Newest first: the publish date, or the creation date for posts without one.
        { $addFields: { sortDate: { $ifNull: ["$publishedAt", "$createdAt"] } } },
        { $sort: { sortDate: -1, _id: -1 } },
        { $skip: (state.page - 1) * BLOG_PAGE_SIZE },
        { $limit: BLOG_PAGE_SIZE },
        {
          $project: {
            _id: 0,
            id: 1,
            slug: 1,
            title: 1,
            status: 1,
            listed: 1,
            coverImage: 1,
            keywords: 1,
            publishedAt: 1,
            updatedAt: 1,
            wordCount: 1,
            // As Postgres trim() did: only spaces are trimmed.
            hasBody: { $gt: [{ $strLenCP: { $trim: { input: { $ifNull: ["$body", ""] }, chars: " " } } }, 0] },
          },
        },
      ])
      .toArray(),
    db.blogPosts.countDocuments(where),
    db.blogPosts.aggregate<{ _id: PostStatus; n: number }>([{ $match: base }, { $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
    listedRanks(),
  ]);
  const counts = { all: 0, draft: 0, active: 0, archived: 0 } as Record<PostStatus | "all", number>;
  for (const c of statusCounts) {
    counts[c._id] = c.n;
    counts.all += c.n;
  }
  return { rows: rows.map((r) => ({ ...r, rank: ranks.get(r.id) ?? null })), total, counts };
}

/** Every post, for the related-posts picker. */
export async function loadPostOptions(): Promise<PostOption[]> {
  return db.blogPosts
    .find<PostOption>({}, { projection: { _id: 0, slug: 1, title: 1, status: 1 } })
    .sort({ title: 1 })
    .toArray();
}

/** Product picks for slugs, in the given order (missing products are dropped). */
async function picksForSlugs(slugs: string[]): Promise<ProductPick[]> {
  if (!slugs.length) return [];
  const rows = await db.products.aggregate<PickedProduct>([{ $match: { slug: { $in: slugs } } }, ...pickedStages]).toArray();
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({ id: r.id, name: r.name, sku: r.sku, image: r.image, price: r.price, status: r.status, isKit: !!r.isKit }));
}

/** An outline post's headings and section summaries as markdown, for "Start from the outline". */
function outlineMarkdown(extras: BlogExtras): string | null {
  if (!extras.toc?.length) return null;
  return extras.toc
    .map(([id, text, level]) => {
      const summary = extras.body?.[id];
      return `${level === 3 ? "###" : "##"} ${text}${summary ? `\n\n${summary}` : ""}`;
    })
    .join("\n\n");
}

export function emptyPostValues(): PostFormValues {
  return {
    title: "",
    slug: "",
    excerpt: "",
    coverImage: null,
    section: "",
    keywords: "",
    tags: "",
    authorName: "",
    authorTitle: "",
    authorImage: null,
    publishedAt: todayInUk(),
    modifiedAt: "",
    status: "draft",
    listed: true,
    position: "1",
    body: "",
    faq: [],
    products: [],
    related: [],
    sources: [],
  };
}

export async function loadPostForm(id: number): Promise<{ values: PostFormValues; meta: PostFormMeta } | null> {
  const post = await db.blogPosts.findOne({ _id: id });
  if (!post) return null;
  const extras = (post.extras ?? {}) as BlogExtras;
  const relatedSlugs = extras.related ?? [];
  const [products, relatedRows, ranks, productLinks, postLinks] = await Promise.all([
    picksForSlugs(extras.products ?? []),
    relatedSlugs.length
      ? db.blogPosts.find<PostOption>({ slug: { $in: relatedSlugs } }, { projection: { _id: 0, slug: 1, title: 1, status: 1 } }).toArray()
      : Promise.resolve([] as PostOption[]),
    listedRanks(),
    // Products that list it as a helpful guide, and posts that list it as related.
    db.products.countDocuments({ guides: post.slug }),
    db.blogPosts.countDocuments({ "extras.related": post.slug }),
  ]);
  const relatedBySlug = new Map(relatedRows.map((r) => [r.slug, r]));
  const outline = post.body?.trim() ? null : outlineMarkdown(extras);

  return {
    values: {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      coverImage: post.coverImage,
      section: post.section ?? "",
      keywords: post.keywords ?? "",
      tags: (extras.tags ?? []).join(", "),
      authorName: post.authorName ?? "",
      authorTitle: post.authorTitle ?? "",
      authorImage: post.authorImage,
      publishedAt: toDateInput(post.publishedAt) || toDateInput(post.createdAt),
      modifiedAt: toDateInput(post.modifiedAt),
      status: post.status,
      listed: post.listed,
      position: post.listed ? String(ranks.get(post.id) ?? 1) : "1",
      body: post.body ?? "",
      faq: (extras.faq ?? []).map(([q, a]) => ({ id: newId("q"), q, a })),
      products,
      related: relatedSlugs.map((slug) => relatedBySlug.get(slug)).filter((r): r is PostOption => !!r),
      sources: (extras.sources ?? []).map(([title, url]) => ({ id: newId("s"), title, url })),
    },
    meta: {
      id: post.id,
      slug: post.slug,
      status: post.status,
      createdLabel: formatDateTime(post.createdAt),
      updatedLabel: formatDateTime(post.updatedAt),
      updatedAt: post.updatedAt.toISOString(),
      listedCount: ranks.size,
      outlineMarkdown: outline,
      outlineSections: outline ? (extras.toc?.length ?? 0) : 0,
      linkedFrom: { products: productLinks, posts: postLinks },
      storedWordCount: post.wordCount,
    },
  };
}
