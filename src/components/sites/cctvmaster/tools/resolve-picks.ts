import { getProduct } from "@/lib/cctvmaster/catalog";
import type { CameraPick, LensSpec, Pick } from "./tool-data";

// Server-side: turn the source's pick slugs into local products (skipping any the catalogue doesn't have).

export function resolvePicks(list: { slug: string; value: number }[]): Pick[] {
  return list.flatMap(({ slug, value }) => {
    const product = getProduct(slug);
    if (!product) return [];
    const price = product.isCallForPrice || product.isContactSales ? null : product.price;
    return [{ slug, name: product.name, price, value }];
  });
}

export function resolveCameraPicks(list: { slug: string; lens: LensSpec }[]): CameraPick[] {
  return list.flatMap(({ slug, lens }) => resolvePicks([{ slug, value: lens.min }]).map((pick) => ({ ...pick, lens })));
}
