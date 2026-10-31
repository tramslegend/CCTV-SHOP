import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/categories/category-form";
import { CategoryProductsEditor } from "@/components/admin/categories/category-products-editor";
import { MatchingKits } from "@/components/admin/categories/matching-kits";
import { buildCategoryOptions, descendantIds } from "@/components/admin/products/category-tree";
import {
  loadCategoryForm,
  loadCategoryProducts,
  loadCategoryRows,
  loadKitFacts,
  loadMatchingKits,
  shopHref,
} from "@/lib/admin/categories/data";
import { categoryIdSchema } from "@/lib/admin/categories/validation";
import { requireAdmin } from "@/lib/admin/session";

const parseId = (raw: string) => {
  const parsed = categoryIdSchema.safeParse(Number(raw));
  return parsed.success ? parsed.data : null;
};

export async function generateMetadata(props: PageProps<"/admin/categories/[id]">): Promise<Metadata> {
  await requireAdmin("categories");
  const id = parseId((await props.params).id);
  const rows = id ? await loadCategoryRows() : [];
  const row = rows.find((r) => r.id === id);
  return { title: row ? `Edit ${row.name.slice(0, 60)}` : "Category not found" };
}

export default async function EditCategoryPage(props: PageProps<"/admin/categories/[id]">) {
  await requireAdmin("categories");
  const id = parseId((await props.params).id);
  if (!id) notFound();
  const rows = await loadCategoryRows();
  const form = await loadCategoryForm(rows, id);
  if (!form) notFound();
  const row = rows.find((r) => r.id === id)!;
  const parent = row.parentId !== null ? rows.find((r) => r.id === row.parentId) : undefined;
  const options = buildCategoryOptions(rows);

  const [products, kits, matching] = await Promise.all([
    row.isKitRange ? null : loadCategoryProducts(rows, id),
    row.isKitRange ? loadKitFacts() : [],
    row.isKitRange ? loadMatchingKits(row) : null,
  ]);

  return (
    <CategoryForm
      mode="edit"
      initialValues={form.values}
      meta={form.meta}
      options={options}
      descendantIds={descendantIds(options, id)}
      parentHidden={!!parent && shopHref(rows, parent) === null}
      kits={kits}
    >
      {products && <CategoryProductsEditor categoryId={id} initial={products} />}
      {matching && <MatchingKits total={matching.total} kits={matching.kits} shopHref={form.meta.shopHref} />}
    </CategoryForm>
  );
}
