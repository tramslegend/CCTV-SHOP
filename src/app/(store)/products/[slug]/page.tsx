import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { metaDescription } from "@/components/sites/cctvmaster/product/copy";
import { ProductPage } from "@/components/sites/cctvmaster/product/product-page";
import { ensureCatalog, getProduct } from "@/lib/cctvmaster/catalog";
import { siteSetting } from "@/lib/settings/storefront";

// Rendered on request: no generateStaticParams, so the 1,905 product pages are not prerendered at build time.

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  await ensureCatalog();
  const { slug } = await props.params;
  const product = getProduct(slug);
  if (!product) return { title: "Product not found" };
  // SEO fields set in the admin win; the SEO title is used as the whole <title> (no " | <shop name>" suffix).
  const description = product.seoDescription || metaDescription(product);
  const image = product.images?.[0];
  return {
    title: product.seoTitle ? { absolute: product.seoTitle } : product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.seoTitle || product.name,
      description,
      siteName: siteSetting("store").name,
      images: image ? [{ url: image, alt: product.imageAlts?.[image] ?? product.name }] : undefined,
    },
  };
}

export default async function Page(props: PageProps<"/products/[slug]">) {
  await ensureCatalog();
  const { slug } = await props.params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <ProductPage product={product} />;
}
