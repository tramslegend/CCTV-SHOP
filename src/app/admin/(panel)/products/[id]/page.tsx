import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/products/product-form";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { getShopSettings } from "@/lib/settings/server";
import { loadBrands, loadCategoryOptions, loadGuideOptions, loadProductForm } from "../_lib/data";
import { formatDateTime, siteHost } from "../_lib/format";

export async function generateMetadata(props: PageProps<"/admin/products/[id]">): Promise<Metadata> {
  await requireAdmin("products");
  const { id } = await props.params;
  const product = await db.products.findOne({ _id: id }, { projection: { name: 1 } });
  return { title: product ? `Edit ${product.name.slice(0, 60)}` : "Product not found" };
}

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  await requireAdmin("products");
  const { id } = await props.params;
  const categories = await loadCategoryOptions();
  const [form, guides, brands, shop] = await Promise.all([
    loadProductForm(id, categories),
    loadGuideOptions(),
    loadBrands(),
    getShopSettings(),
  ]);
  if (!form) notFound();
  const { values, meta } = form;

  return (
    <ProductForm
      // A successful save changes updatedAt: the form remounts with the saved values as its new baseline.
      key={meta.updatedAt}
      mode="edit"
      initialValues={values}
      meta={{ ...meta, createdLabel: formatDateTime(meta.createdAt), updatedLabel: formatDateTime(meta.updatedAt) }}
      categories={categories}
      guides={guides}
      brands={brands}
      siteHost={siteHost()}
        siteName={shop.store.name}
        titleTemplate={shop.seo.titleTemplate}
    />
  );
}
