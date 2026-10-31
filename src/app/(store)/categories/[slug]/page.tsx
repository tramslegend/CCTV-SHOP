import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KitCategoryPage } from "@/components/sites/cctvmaster/kits/kit-category-page";
import { categoryCopy, categoryGuides } from "@/components/sites/cctvmaster/listing/category-copy";
import {
  cardsFor,
  categoryCount,
  childCategories,
  isKitCategory,
  shopTopNodes,
  topCategoryOf,
} from "@/components/sites/cctvmaster/listing/listing-data";
import { ListingHeader } from "@/components/sites/cctvmaster/listing/listing-header";
import { ListingCopy, RelatedGuides } from "@/components/sites/cctvmaster/listing/listing-seo";
import { ListingView, plural } from "@/components/sites/cctvmaster/listing/listing-view";
import { MarkdownContent } from "@/components/sites/cctvmaster/product/markdown";
import { categoryName, ensureCatalog, getCategory } from "@/lib/cctvmaster/catalog";
import { siteSetting } from "@/lib/settings/storefront";

export async function generateMetadata(props: PageProps<"/categories/[slug]">): Promise<Metadata> {
  await ensureCatalog();
  const { slug } = await props.params;
  const category = getCategory(slug);
  if (!category) return {};
  return {
    title: category.title ?? categoryName(slug),
    description: category.metaDescription,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage(props: PageProps<"/categories/[slug]">) {
  await ensureCatalog();
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const category = getCategory(slug);
  if (!category) notFound();
  if (isKitCategory(category)) return <KitCategoryPage category={category} searchParams={searchParams} />;

  const name = categoryName(slug);
  const cards = cardsFor(category.products);
  const top = topCategoryOf(category);
  const isTop = !top || top.slug === slug;
  const kids = childCategories(slug);
  const others = isTop
    ? shopTopNodes()
        .filter((n) => n.slug !== slug)
        .map((n) => ({ name: n.name, href: n.href, count: categoryCount(n.slug) }))
        .filter((n) => n.count > 0)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    : [];
  const copy = categoryCopy(category, name, cards);
  // Intro written in the admin replaces the generated intro; the generated "How to choose" and FAQ stay below the listing.
  const intro = category.description;
  const shopName = siteSetting("store").name;

  return (
    <>
      <ListingHeader
        crumbs={category.breadcrumbs}
        title={category.title ?? name}
        description={
          isTop
            ? `${plural(cards.length, "product")} — trade-grade UK stock from ${shopName}.`
            : `${plural(cards.length, "product")} in our ${top?.name} range — trade-grade UK stock from ${shopName}.`
        }
        chipRows={[
          {
            label: `Shop ${name} by type`,
            variant: "primary",
            chips: kids.map((k) => ({ name: k.name, href: k.href, count: k.count })),
          },
          {
            label: "Other categories",
            variant: "secondary",
            chips: others.length ? [...others, { name: "All categories →", href: "/categories", dashed: true }] : [],
          },
        ]}
      />
      {intro ? (
        <div className="mx-auto w-full max-w-7xl px-4 pt-5 pb-6 sm:px-6">
          <MarkdownContent source={intro} className="max-w-3xl" />
        </div>
      ) : null}
      <ListingView
        basePath={`/categories/${slug}`}
        searchParams={searchParams}
        cards={cards}
        order={category.products}
        showFacets
      />
      {copy ? <ListingCopy copy={intro ? { ...copy, heading: undefined, intro: [] } : copy} /> : null}
      <RelatedGuides guides={categoryGuides(slug)} />
    </>
  );
}
