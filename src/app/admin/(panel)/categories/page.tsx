import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { Plus } from "lucide-react";
import { CategoryTreeList } from "@/components/admin/categories/category-tree-list";
import { FlashToast } from "@/components/admin/flash-toast";
import { PageHeader } from "@/components/admin/page-header";
import { AdminToaster } from "@/components/admin/toast";
import { buttonVariants } from "@/components/ui/button";
import { loadCategoryRows, loadCategoryTree } from "@/lib/admin/categories/data";
import { requireAdmin } from "@/lib/admin/session";

export const metadata = { title: "Categories" };

function TreeSection({ id, title, description, action, children }: { id: string; title: string; description: string; action: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-xl bg-white ring-1 ring-black/10">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3.5">
        <div>
          <h2 id={`${id}-title`} className="text-[15px] font-semibold">
            {title}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export default async function AdminCategoriesPage(props: PageProps<"/admin/categories">) {
  await requireAdmin("categories");
  const searchParams = await props.searchParams;
  const rows = await loadCategoryRows();
  const { shop, kits } = await loadCategoryTree(rows);
  const deleted = typeof searchParams.deleted === "string" ? searchParams.deleted.slice(0, 120) : null;

  return (
    <>
      <AdminToaster />
      {deleted && (
        <Suspense>
          <FlashToast message={`Deleted ${deleted}.`} param="deleted" />
        </Suspense>
      )}
      <PageHeader
        title="Categories"
        description="How the shop is organised: the category pages, menus and breadcrumbs, and the kit ranges under CCTV Kits."
        actions={
          <>
            <Link href="/admin/categories/new?type=kit" className={buttonVariants({ variant: "outline" })}>
              <Plus /> New kit range
            </Link>
            <Link href="/admin/categories/new" className={buttonVariants()}>
              <Plus /> New category
            </Link>
          </>
        }
      />
      <div className="flex flex-col gap-6">
        <TreeSection
          id="shop-categories"
          title="Shop categories"
          description="Products are listed in their categories and every category above them. Counts include sub-categories; the arrows set the order within each parent."
          action={<span className="text-muted-foreground text-xs tabular-nums">{shop.length} categories</span>}
        >
          <CategoryTreeList rows={shop} emptyText="No shop categories yet." />
        </TreeSection>
        <TreeSection
          id="kit-ranges"
          title="Kit ranges"
          description="Ranges under CCTV Kits list ready-made kits by a rule (system, cameras, resolution, colour). Counts are the kits customers can see."
          action={<span className="text-muted-foreground text-xs tabular-nums">{kits.length} ranges</span>}
        >
          <CategoryTreeList rows={kits} emptyText="No kit ranges yet." />
        </TreeSection>
      </div>
    </>
  );
}
