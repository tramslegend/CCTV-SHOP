import { ImageOff } from "lucide-react";
import { getBlogPost, getCards, getProduct } from "@/lib/cctvmaster/catalog";
import type { BlogPost, KitComponent, Product } from "@/lib/cctvmaster/types";
import { siteSetting } from "@/lib/settings/storefront";
import { BreadcrumbBar } from "./breadcrumb-bar";
import { BuyBox, availabilityOf } from "./buy-box";
import { kitDescription, productDescription, productFaqs } from "./copy";
import { GalleryActions } from "./gallery-actions";
import { KitBox } from "./kit-box";
import { kitPickers, kitSaving, recordingDays } from "./kit-logic";
import { DescriptionSection, FaqSection, PartNumbersSection, SpecificationsSection } from "./product-details";
import { ProductGuides, ProductReviews } from "./product-extras";
import { ProductGallery } from "./product-gallery";
import { BackToProducts, RelatedProducts } from "./related-products";
import { TrustTiles } from "./trust-tiles";

const pageExists = (slug: string) => !!getProduct(slug);

const partHref = (part: KitComponent) => {
  const slug = part.href.replace(/^\/products\//, "");
  return pageExists(slug) ? `/products/${slug}` : undefined;
};

/** Product detail page for regular products and ready-made kits (server component). */
export function ProductPage({ product }: { product: Product }) {
  const kit = product.kit;
  const days = kit ? recordingDays(kit, product.sku) : undefined;
  const images = (product.images ?? []).map((src, i) => ({
    src,
    alt: product.imageAlts?.[src] ?? `${product.name} - Image ${i + 1}`,
    thumbAlt: product.imageAlts?.[src] ?? `${product.name} thumbnail ${i + 1}`,
  }));
  const related = getCards(product.related ?? []).filter((c) => c.slug !== product.slug);
  const guides = (product.guides ?? []).map(getBlogPost).filter((p): p is BlogPost => !!p);
  const leaf = product.categoryPath?.at(-1);
  const viewAll = leaf?.href ?? (leaf?.slug ? `/categories/${leaf.slug}` : "/products");
  const backorder = availabilityOf(product) === "backorder";
  const delivery = siteSetting("delivery");

  return (
    <>
      <div className="bg-background min-h-screen">
        <BreadcrumbBar crumbs={product.breadcrumbs} />
        <div className="mx-auto w-full max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="animate-in fade-in slide-in-from-left-4 min-w-0 space-y-4 duration-500 ease-out">
              {images.length ? (
                <ProductGallery images={images} />
              ) : (
                <div className="text-muted-foreground flex aspect-square items-center justify-center rounded-xl border border-border bg-surface">
                  <ImageOff className="h-10 w-10" aria-label="No image available" />
                </div>
              )}
              <GalleryActions
                item={{ slug: product.slug, name: product.name, price: product.price, image: product.images?.[0] }}
              />
              <TrustTiles delivery={delivery} className="hidden lg:block" />
            </div>
            <BuyBox
              product={product}
              saving={kit ? kitSaving(kit, product.price) : undefined}
              pickers={kit ? kitPickers(kit, product.sku, pageExists) : []}
              delivery={delivery}
            />
          </div>

          <div className="fc-rise mt-10 space-y-8 [animation-delay:500ms] sm:mt-14">
            {kit && <KitBox kit={kit} sku={product.sku} days={days} partHref={partHref} />}
            <DescriptionSection
              blocks={kit ? kitDescription(product, kit, days) : productDescription(product)}
              markdown={product.description}
            />
            <SpecificationsSection attributes={product.attributes ?? []} />
            <PartNumbersSection partNumbers={product.partNumbers} />
            {!kit && <FaqSection faqs={productFaqs(product, backorder, delivery)} />}
          </div>

          <RelatedProducts cards={related} viewAllHref={viewAll} />
          <BackToProducts />
        </div>
      </div>
      <ProductGuides posts={guides} />
      <ProductReviews name={product.name} />
    </>
  );
}
