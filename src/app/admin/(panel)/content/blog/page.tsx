import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Newspaper, Plus } from "lucide-react";
import { BlogFilters } from "@/components/admin/content/blog-filters";
import { BLOG_PAGE_SIZE, type BlogListState, blogListHref } from "@/components/admin/content/blog-list-url";
import { PostStatusBadge } from "@/components/admin/content/status";
import { FlashToast } from "@/components/admin/flash-toast";
import { PageHeader } from "@/components/admin/page-header";
import { AdminToaster } from "@/components/admin/toast";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/session";
import { readingMinutes } from "@/lib/content/markdown";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDay } from "../_lib/format";
import { listPosts, parseBlogListParams } from "./_lib/data";

export const metadata = { title: "Blog" };

const n = (v: number) => v.toLocaleString("en-GB");

export default async function AdminBlogPage(props: PageProps<"/admin/content/blog">) {
  await requireAdmin("content");
  const searchParams = await props.searchParams;
  const state = parseBlogListParams(searchParams);
  const { rows, total, counts } = await listPosts(state);
  const pages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  const from = total ? (state.page - 1) * BLOG_PAGE_SIZE + 1 : 0;
  const to = Math.min(total, state.page * BLOG_PAGE_SIZE);
  const deleted = typeof searchParams.deleted === "string" ? searchParams.deleted.slice(0, 120) : null;

  const tabs = [
    { status: "all" as const, label: "All", count: counts.all },
    { status: "active" as const, label: "Published", count: counts.active },
    { status: "draft" as const, label: "Drafts", count: counts.draft },
    { status: "archived" as const, label: "Archived", count: counts.archived },
  ];

  return (
    <>
      <AdminToaster />
      {deleted && (
        <Suspense>
          <FlashToast message={`Deleted “${deleted}”.`} param="deleted" />
        </Suspense>
      )}
      <nav className="text-muted-foreground mb-2 flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        <Link href="/admin/content" className="hover:text-zinc-950">
          Content
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="text-zinc-950">Blog</span>
      </nav>
      <PageHeader
        title="Blog"
        description="Buying guides and articles. Drafts and archived posts are hidden from the shop; unlisted posts are left off /blog but their address works."
        actions={
          <>
            <a href="/blog" target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
              View /blog <ExternalLink />
            </a>
            <Link href="/admin/content/blog/new" className={buttonVariants()}>
              <Plus /> New post
            </Link>
          </>
        }
      />

      <nav aria-label="Post status" className="mb-4 flex gap-1 overflow-x-auto border-b">
        {tabs.map((t) => {
          const active = state.status === t.status;
          return (
            <Link
              key={t.status}
              href={blogListHref(state, { status: t.status })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "border-zinc-900 text-zinc-950" : "border-transparent text-zinc-500 hover:text-zinc-900",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600")}>{n(t.count)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mb-4">
        <BlogFilters state={state} />
      </div>

      {rows.length ? (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-black/10">
          <table className="w-full text-sm">
            <thead className="border-b bg-zinc-50/70 text-left text-xs text-zinc-600">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Post
                </th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">
                  Status
                </th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">
                  On /blog
                </th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">
                  Published
                </th>
                <th scope="col" className="hidden px-4 py-2.5 font-medium xl:table-cell">
                  Last saved
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="group relative hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="relative block h-10 w-16 shrink-0 overflow-hidden rounded-md border bg-zinc-100">
                        {r.coverImage ? (
                          <Image src={r.coverImage} alt="" fill sizes="64px" className="object-cover" />
                        ) : (
                          <FileText className="text-muted-foreground absolute inset-0 m-auto size-4" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/admin/content/blog/${r.id}`} className="line-clamp-1 font-medium after:absolute after:inset-0 hover:underline">
                          {r.title}
                        </Link>
                        <p className="text-muted-foreground truncate text-xs">
                          /blog/{r.slug}
                          {" · "}
                          {r.hasBody ? `${readingMinutes(r.wordCount)} min read` : "Outline"}
                        </p>
                        <div className="mt-1 flex gap-1.5 md:hidden">
                          <PostStatusBadge status={r.status} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <PostStatusBadge status={r.status} />
                  </td>
                  <td className="text-muted-foreground hidden px-3 py-3 text-xs tabular-nums lg:table-cell">
                    {r.listed ? (r.rank ? `#${n(r.rank)}` : "Listed") : "Unlisted"}
                  </td>
                  <td className="text-muted-foreground hidden px-3 py-3 text-xs whitespace-nowrap tabular-nums sm:table-cell">
                    {r.publishedAt ? formatDay(r.publishedAt) : "—"}
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 text-xs whitespace-nowrap tabular-nums xl:table-cell">{formatDateTime(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-white px-6 py-16 text-center">
          <Newspaper className="text-muted-foreground size-8" aria-hidden="true" />
          <p className="font-medium">{total && state.page > pages ? "This page is empty" : "No posts match these filters"}</p>
          <p className="text-muted-foreground text-sm">Try a different search or clear the filters.</p>
          <Link href={total ? blogListHref(state, { page: 1 }) : "/admin/content/blog"} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2" })}>
            {total ? "Back to the first page" : "Show all posts"}
          </Link>
        </div>
      )}

      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
        <p className="text-muted-foreground tabular-nums">{total ? `Showing ${n(from)}–${n(to)} of ${n(total)}, newest first` : "No results"}</p>
        {pages > 1 && (
          <nav aria-label="Pagination" className="flex items-center gap-1">
            <PageLink state={state} page={state.page - 1} disabled={state.page <= 1} label="Previous page">
              <ChevronLeft /> Previous
            </PageLink>
            <span className="text-muted-foreground px-2 tabular-nums">
              Page {n(state.page)} of {n(pages)}
            </span>
            <PageLink state={state} page={state.page + 1} disabled={state.page >= pages} label="Next page">
              Next <ChevronRight />
            </PageLink>
          </nav>
        )}
      </div>
    </>
  );
}

function PageLink({ state, page, disabled, label, children }: { state: BlogListState; page: number; disabled: boolean; label: string; children: React.ReactNode }) {
  const className = buttonVariants({ variant: "outline", size: "sm" });
  if (disabled)
    return (
      <span aria-disabled="true" className={cn(className, "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  return (
    <Link href={blogListHref(state, { page })} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
