import Link from "next/link";
import { ProductForm } from "@/components/admin/products/product-form";
import { requireAdmin } from "@/lib/admin/session";
import { getShopSettings } from "@/lib/settings/server";
import { cn } from "@/lib/utils";
import { emptyFormValues, loadBrands, loadCategoryOptions, loadGuideOptions } from "../_lib/data";
import { siteHost } from "../_lib/format";

export const metadata = { title: "New product" };

export default async function NewProductPage(props: PageProps<"/admin/products/new">) {
  await requireAdmin("products");
  const { type } = await props.searchParams;
  const isKit = type === "kit";
  const [categories, guides, brands, shop] = await Promise.all([
    loadCategoryOptions(),
    loadGuideOptions(),
    loadBrands(),
    getShopSettings(),
  ]);

  return (
    <>
      <div className="mb-4 inline-flex rounded-lg bg-border/60 p-0.5 text-sm" role="tablist" aria-label="What are you adding?">
        {[
          { href: "/admin/products/new", label: "Single product", active: !isKit },
          { href: "/admin/products/new?type=kit", label: "Ready-made kit", active: isKit },
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
      <ProductForm
        key={isKit ? "kit" : "product"}
        mode="create"
        initialValues={emptyFormValues(isKit)}
        categories={categories}
        guides={guides}
        brands={brands}
        siteHost={siteHost()}
        siteName={shop.store.name}
        titleTemplate={shop.seo.titleTemplate}
      />
    </>
  );
}
