import Link from "next/link";
import { CategoryForm } from "@/components/admin/categories/category-form";
import { buildCategoryOptions } from "@/components/admin/products/category-tree";
import { loadCategoryRows, loadKitFacts, shopHref } from "@/lib/admin/categories/data";
import { ANY_RULE } from "@/lib/admin/categories/kit-rule";
import type { CategoryFormValues } from "@/lib/admin/categories/types";
import { KIT_ROOT_SLUG } from "@/lib/admin/categories/validation";
import { requireAdmin } from "@/lib/admin/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "New category" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function NewCategoryPage(props: PageProps<"/admin/categories/new">) {
  await requireAdmin("categories");
  const searchParams = await props.searchParams;
  const rows = await loadCategoryRows();
  // "Add sub-category" links pass ?parent=<id>; the new category takes that parent's type.
  const parentRow = rows.find((r) => r.id === Number(first(searchParams.parent)));
  const isKit = parentRow ? parentRow.isKitRange : first(searchParams.type) === "kit";
  const parentId = parentRow?.id ?? (isKit ? (rows.find((r) => r.slug === KIT_ROOT_SLUG)?.id ?? null) : null);
  const kits = isKit ? await loadKitFacts() : [];
  const parent = rows.find((r) => r.id === parentId);

  const initialValues: CategoryFormValues = {
    name: "",
    slug: "",
    parentId,
    title: "",
    metaDescription: "",
    description: "",
    imageUrl: null,
    visible: true,
    isKitRange: isKit,
    kitRule: isKit ? ANY_RULE : null,
  };

  return (
    <>
      <div className="mb-4 inline-flex rounded-lg bg-border/60 p-0.5 text-sm" role="tablist" aria-label="What are you adding?">
        {[
          { href: "/admin/categories/new", label: "Shop category", active: !isKit },
          { href: "/admin/categories/new?type=kit", label: "Kit range", active: isKit },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={t.active}
            className={cn("rounded-md px-3 py-1 font-medium", t.active ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <CategoryForm
        key={`${isKit ? "kit" : "shop"}-${parentId ?? "top"}`}
        mode="create"
        initialValues={initialValues}
        options={buildCategoryOptions(rows)}
        parentHidden={!!parent && shopHref(rows, parent) === null}
        kits={kits}
      />
    </>
  );
}
