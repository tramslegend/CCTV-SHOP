import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBrand } from "@/components/sites/cctvmaster/listing/collections";
import { LandingPageView } from "@/components/sites/cctvmaster/listing/landing-page";
import { cardsFor } from "@/components/sites/cctvmaster/listing/listing-data";
import { ensureCatalog, getShopProducts } from "@/lib/cctvmaster/catalog";

export async function generateMetadata(props: PageProps<"/brands/[slug]">): Promise<Metadata> {
  await ensureCatalog();
  const brand = getBrand((await props.params).slug);
  if (!brand) return {};
  return { title: brand.metaTitle, description: brand.metaDescription };
}

export default async function BrandPage(props: PageProps<"/brands/[slug]">) {
  await ensureCatalog();
  const { slug } = await props.params;
  const brand = getBrand(slug);
  if (!brand) notFound();
  const name = brand.brand.toLowerCase();
  const slugs = getShopProducts()
    .filter((p) => p.brand?.trim().toLowerCase() === name)
    .map((p) => p.slug);
  return (
    <LandingPageView
      page={brand}
      basePath={`/brands/${slug}`}
      cards={cardsFor(slugs)}
      searchParams={await props.searchParams}
    />
  );
}
