import { HomepageEditor } from "@/components/admin/homepage/homepage-editor";
import { requireAdmin } from "@/lib/admin/session";
import { categoryChoices, productsByIds, readHomepage } from "@/lib/homepage/admin";
import { homepageLinks } from "@/lib/homepage/validation";
import { linkWarnings } from "@/lib/navigation/link-check";

export const metadata = { title: "Homepage" };

export default async function AdminHomepagePage() {
  await requireAdmin("content");
  const values = await readHomepage();
  const [categories, products, warnings] = await Promise.all([
    categoryChoices(),
    productsByIds([values.hero.kit.productId, ...values.popular.picks]),
    linkWarnings(homepageLinks(values)),
  ]);
  return <HomepageEditor initial={values} initialWarnings={warnings} categories={categories} products={products} />;
}
