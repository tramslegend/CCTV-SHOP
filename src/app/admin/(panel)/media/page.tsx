import Link from "next/link";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { ImportButton } from "@/components/admin/media/import-button";
import { MediaGrid } from "@/components/admin/media/media-grid";
import { MediaSearch } from "@/components/admin/media/media-search";
import { MediaUploader } from "@/components/admin/media/media-uploader";
import { MEDIA_PAGE_SIZE, type MediaFilter, type MediaListState, mediaListHref } from "@/components/admin/media/types";
import { PageHeader } from "@/components/admin/page-header";
import { AdminToaster } from "@/components/admin/toast";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/session";
import { directUploadsEnabled } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { listMedia, parseMediaParams } from "./_lib/data";

export const metadata = { title: "Media" };

const n = (v: number) => v.toLocaleString("en-GB");

export default async function AdminMediaPage(props: PageProps<"/admin/media">) {
  await requireAdmin("media");
  const state = parseMediaParams(await props.searchParams);
  const { items, total, counts } = await listMedia(state);
  const pages = Math.max(1, Math.ceil(total / MEDIA_PAGE_SIZE));
  const from = total ? (state.page - 1) * MEDIA_PAGE_SIZE + 1 : 0;
  const to = Math.min(total, state.page * MEDIA_PAGE_SIZE);

  const tabs: { filter: MediaFilter; label: string; count: number }[] = [
    { filter: "all", label: "All", count: counts.all },
    { filter: "used", label: "In use", count: counts.used },
    { filter: "unused", label: "Unused", count: counts.unused },
  ];

  return (
    <>
      <AdminToaster />
      <PageHeader
        title="Media"
        description="Every image the shop uses or has uploaded. Click an image to edit its alt text, see where it's used or delete it."
        actions={<ImportButton />}
      />

      <MediaUploader mode={directUploadsEnabled() ? "blob" : "server"} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <nav aria-label="Filter images" className="flex gap-1 border-b sm:flex-1">
          {tabs.map((t) => {
            const active = state.filter === t.filter;
            return (
              <Link
                key={t.filter}
                href={mediaListHref(state, { filter: t.filter })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                  {n(t.count)}
                </span>
              </Link>
            );
          })}
        </nav>
        <MediaSearch state={state} />
      </div>

      {items.length ? (
        <MediaGrid items={items} />
      ) : (
        <EmptyState state={state} total={total} pages={pages} libraryEmpty={counts.all === 0 && !state.q} />
      )}

      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
        <p className="text-muted-foreground tabular-nums">{total ? `Showing ${n(from)}–${n(to)} of ${n(total)}` : "No results"}</p>
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

function EmptyState({ state, total, pages, libraryEmpty }: { state: MediaListState; total: number; pages: number; libraryEmpty: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-white px-6 py-16 text-center">
      <ImageOff className="text-muted-foreground size-8" aria-hidden="true" />
      {libraryEmpty ? (
        <>
          <p className="font-medium">The library is empty</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Upload images above, or use “Import existing images” to list the pictures your products, kits, categories and blog posts already use.
          </p>
        </>
      ) : (
        <>
          <p className="font-medium">{total && state.page > pages ? "This page is empty" : "No images match"}</p>
          <p className="text-muted-foreground text-sm">Try a different search or filter.</p>
          <Link href={total ? mediaListHref(state, { page: 1 }) : "/admin/media"} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2" })}>
            {total ? "Back to the first page" : "Show all images"}
          </Link>
        </>
      )}
    </div>
  );
}

function PageLink({ state, page, disabled, label, children }: { state: MediaListState; page: number; disabled: boolean; label: string; children: React.ReactNode }) {
  const className = buttonVariants({ variant: "outline", size: "sm" });
  if (disabled)
    return (
      <span aria-disabled="true" className={cn(className, "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  return (
    <Link href={mediaListHref(state, { page })} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
