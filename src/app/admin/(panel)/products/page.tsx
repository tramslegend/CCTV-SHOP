import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, FileUp, PackageOpen, Plus } from "lucide-react";
import { FlashToast } from "@/components/admin/flash-toast";
import { PageHeader } from "@/components/admin/page-header";
import { AdminToaster } from "@/components/admin/toast";
import { listHref, type ListState } from "@/components/admin/products/list-url";
import { ProductsFilters } from "@/components/admin/products/products-filters";
import { type ProductTableRow, ProductsTable } from "@/components/admin/products/products-table";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/session";
import { cn } from "@/lib/utils";
import { listProducts, loadCategoryOptions, PAGE_SIZE, parseListParams } from "./_lib/data";
import { formatDateTime } from "./_lib/format";

export const metadata = { title: "Products" };

const n = (v: number) => v.toLocaleString("en-GB");

export default async function ProductsPage(props: PageProps<"/admin/products">) {
  await requireAdmin("products");
  const searchParams = await props.searchParams;
  const state: ListState = parseListParams(searchParams);
  const categories = await loadCategoryOptions();
  const { rows, total, counts } = await listProducts(state, categories);
  const pathById = new Map(categories.map((c) => [c.id, c.path]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total ? (state.page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, state.page * PAGE_SIZE);
  const deleted = typeof searchParams.deleted === "string" ? searchParams.deleted.slice(0, 120) : null;

  const tableRows: ProductTableRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    sku: r.sku,
    brand: r.brand,
    status: r.status,
    availability: r.availability,
    price: r.price,
    compareAtPrice: r.compareAtPrice,
    stock: r.stock,
    trackStock: r.trackStock,
    isContactSales: r.isContactSales,
    isCallForPrice: r.isCallForPrice,
    isKit: !!r.isKit,
    image: r.image,
    category: r.categoryId !== null ? (pathById.get(r.categoryId) ?? null) : null,
    updatedLabel: formatDateTime(r.updatedAt),
  }));

  const tabs = [
    { type: "all" as const, label: "All", count: counts.all },
    { type: "products" as const, label: "Products", count: counts.products },
    { type: "kits" as const, label: "Kits", count: counts.kits },
  ];

  return (
    <>
      <AdminToaster />
      {deleted && (
        <Suspense>
          <FlashToast message={`Deleted ${deleted}.`} param="deleted" />
        </Suspense>
      )}
      <PageHeader
        title="Products"
        description="Every product and ready-made kit in the shop. Drafts and archived items are hidden from customers."
        actions={
          <>
            <Link href="/admin/products/import" className={buttonVariants({ variant: "outline" })}>
              <FileUp /> Import
            </Link>
            <Link href="/admin/products/new?type=kit" className={buttonVariants({ variant: "outline" })}>
              <Plus /> Add kit
            </Link>
            <Link href="/admin/products/new" className={buttonVariants()}>
              <Plus /> Add product
            </Link>
          </>
        }
      />

      <nav aria-label="Product type" className="mb-4 flex gap-1 border-b">
        {tabs.map((t) => {
          const active = state.type === t.type;
          return (
            <Link
              key={t.type}
              href={listHref(state, { type: t.type })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active ? "border-zinc-900 text-zinc-950" : "border-transparent text-zinc-500 hover:text-zinc-900",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600")}>
                {n(t.count)}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mb-4">
        <ProductsFilters state={state} categories={categories} />
      </div>

      {rows.length ? (
        <ProductsTable key={`${state.page}-${state.type}`} rows={tableRows} state={state} />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-white px-6 py-16 text-center">
          <PackageOpen className="text-muted-foreground size-8" aria-hidden="true" />
          <p className="font-medium">{total && state.page > pages ? "This page is empty" : "No products match these filters"}</p>
          <p className="text-muted-foreground text-sm">Try a different search or clear the filters.</p>
          <Link href={total ? listHref(state, { page: 1 }) : "/admin/products"} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2" })}>
            {total ? "Back to the first page" : "Show all products"}
          </Link>
        </div>
      )}

      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
        <p className="text-muted-foreground tabular-nums">
          {total ? `Showing ${n(from)}–${n(to)} of ${n(total)}` : "No results"}
        </p>
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

function PageLink({ state, page, disabled, label, children }: { state: ListState; page: number; disabled: boolean; label: string; children: React.ReactNode }) {
  const className = buttonVariants({ variant: "outline", size: "sm" });
  if (disabled)
    return (
      <span aria-disabled="true" className={cn(className, "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  return (
    <Link href={listHref(state, { page })} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
