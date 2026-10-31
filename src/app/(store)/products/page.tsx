import type { Metadata } from "next";
import { productsCopy } from "@/components/sites/cctvmaster/listing/category-copy";
import { getShopCards } from "@/components/sites/cctvmaster/listing/listing-data";
import { ListingCopy } from "@/components/sites/cctvmaster/listing/listing-seo";
import { ListingView } from "@/components/sites/cctvmaster/listing/listing-view";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";
import { siteSetting } from "@/lib/settings/storefront";

export async function generateMetadata(props: PageProps<"/products">): Promise<Metadata> {
  await ensureCatalog();
  const search = (await props.searchParams).search;
  const q = (Array.isArray(search) ? search[0] : search)?.trim();
  if (q) return { title: `Search results for “${q}”`, robots: { index: false } };
  return {
    title: "NVR for IP Cameras: Compare Recorders, Drives and Cable",
    description:
      "An NVR (network video recorder) saves IP camera footage. Browse 54 recorders, including PoE models, then match channels and resolution to your cameras.",
  };
}

export default async function ProductsPage(props: PageProps<"/products">) {
  await ensureCatalog();
  const searchParams = await props.searchParams;
  return (
    <>
      <ListingView basePath="/products" searchParams={searchParams} cards={getShopCards()} headingTag="h1" breadcrumbBar />
      <ListingCopy copy={productsCopy(siteSetting("store").name)} />
    </>
  );
}
