import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollection } from "@/components/sites/cctvmaster/listing/collections";
import { LandingPageView } from "@/components/sites/cctvmaster/listing/landing-page";
import { cardsFor } from "@/components/sites/cctvmaster/listing/listing-data";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";

export async function generateMetadata(props: PageProps<"/collections/[slug]">): Promise<Metadata> {
  await ensureCatalog();
  const collection = getCollection((await props.params).slug);
  if (!collection) return {};
  return { title: collection.metaTitle, description: collection.metaDescription };
}

export default async function CollectionPage(props: PageProps<"/collections/[slug]">) {
  await ensureCatalog();
  const { slug } = await props.params;
  const collection = getCollection(slug);
  if (!collection) notFound();
  return (
    <LandingPageView
      page={collection}
      basePath={`/collections/${slug}`}
      cards={cardsFor(collection.products)}
      searchParams={await props.searchParams}
    />
  );
}
