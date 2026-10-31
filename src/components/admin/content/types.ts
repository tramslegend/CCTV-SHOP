// Shapes shared by the content admin pages (server) and their editors (client). No server imports here.
import type { ProductPick } from "@/components/admin/products/types";
import type { FaqItem, PageBlock } from "@/lib/content/blocks";
import type { PageSlug } from "@/lib/content/pages";

export type FieldErrors = Record<string, string>;

export type ActionResult<T = undefined> =
  | ({ ok: true; message: string } & (T extends undefined ? object : { data: T }))
  | { ok: false; message: string; fieldErrors?: FieldErrors };

// ---------- pages ----------

export type PageStatus = "active" | "draft";

export const PAGE_STATUS_LABELS: Record<PageStatus, string> = { active: "Published", draft: "Draft" };

export interface PageFormValues {
  title: string;
  intro: string;
  metaDescription: string;
  status: PageStatus;
  blocks: PageBlock[];
}

export interface PageEditorMeta {
  slug: PageSlug;
  /** A custom version is saved (published or draft). */
  saved: boolean;
  status: PageStatus | null;
  updatedAt: string | null;
  /** Pre-formatted on the server (avoids time-zone hydration differences). */
  updatedLabel: string | null;
}

// ---------- blog ----------

export const POST_STATUSES = ["draft", "active", "archived"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_STATUS_LABELS: Record<PostStatus, string> = { draft: "Draft", active: "Published", archived: "Archived" };
export const POST_STATUS_HINTS: Record<PostStatus, string> = {
  draft: "Hidden from the shop while you work on it. Its address shows “not found”.",
  active: "Live: the post's page works, and it's on /blog when listed.",
  archived: "Hidden from the shop and kept for your records.",
};

/** A post as offered in the related-posts picker. */
export interface PostOption {
  slug: string;
  title: string;
  status: PostStatus;
}

export interface SourceValue {
  id: string;
  title: string;
  url: string;
}

/** Everything the post form edits. Dates are yyyy-mm-dd; the position is kept as typed. */
export interface PostFormValues {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  section: string;
  keywords: string;
  /** Comma-separated. */
  tags: string;
  authorName: string;
  authorTitle: string;
  authorImage: string | null;
  publishedAt: string;
  modifiedAt: string;
  status: PostStatus;
  listed: boolean;
  position: string;
  body: string;
  faq: FaqItem[];
  products: ProductPick[];
  related: PostOption[];
  sources: SourceValue[];
}

export interface PostFormMeta {
  id: number;
  slug: string;
  status: PostStatus;
  createdLabel: string;
  updatedLabel: string;
  /** ISO time of the last save. */
  updatedAt: string;
  /** Number of listed posts (for the position hint). */
  listedCount: number;
  /** Outline of a post without a body, as markdown ("Start from the outline"); null when there's none. */
  outlineMarkdown: string | null;
  outlineSections: number;
  /** Products that link to this post as a "helpful guide", and posts that list it as related. */
  linkedFrom: { products: number; posts: number };
  /** Word count kept for posts without a body (their outline's original article). */
  storedWordCount: number | null;
}

export interface SavedPost {
  id: number;
  slug: string;
}
