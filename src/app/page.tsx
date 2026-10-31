import type { ReactNode } from "react";
import { Hero } from "@/components/sites/cctvmaster/hero";
import { PopularProducts, ShopByCategory } from "@/components/sites/cctvmaster/shop-sections";
import { CtaBand } from "@/components/sites/cctvmaster/site-footer";
import { SiteShell } from "@/components/sites/cctvmaster/site-shell";
import { DeliveryPromise, LatestArticles, WhyUs } from "@/components/sites/cctvmaster/story-sections";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";
import type { SectionId } from "@/lib/homepage/schema";
import { categoryTiles, featuredKit, homepageSetting, latestPosts, popularCards } from "@/lib/homepage/storefront";
import { tokenValues } from "@/lib/homepage/text";
import { siteSetting } from "@/lib/settings/storefront";

// Homepage: the sections set at /admin/content/homepage, in their order, each shown only when switched on.
export default async function Home() {
  await ensureCatalog();
  const home = homepageSetting();
  const tokens = tokenValues(siteSetting("store"), siteSetting("delivery"));
  const shown = home.sections.filter((s) => s.enabled).map((s) => s.id);

  const render = async (id: SectionId): Promise<ReactNode> => {
    switch (id) {
      case "hero":
        return <Hero key={id} hero={home.hero} tokens={tokens} kit={featuredKit(home.hero.kit.productId)} />;
      case "categories":
        return <ShopByCategory key={id} section={home.categories} tiles={categoryTiles(home.categories)} tokens={tokens} />;
      case "popular":
        return <PopularProducts key={id} section={home.popular} cards={await popularCards(home.popular)} tokens={tokens} />;
      case "whyUs":
        return <WhyUs key={id} section={home.whyUs} tokens={tokens} />;
      case "promise":
        return <DeliveryPromise key={id} section={home.promise} tokens={tokens} />;
      case "articles":
        return <LatestArticles key={id} section={home.articles} posts={latestPosts(home.articles.count)} tokens={tokens} />;
      case "cta":
        return <CtaBand key={id} section={home.cta} tokens={tokens} />;
    }
  };

  // The hero sits on its own background; the other sections share the white page wrapper.
  const blocks: ReactNode[] = [];
  let run: ReactNode[] = [];
  const flush = () => {
    if (run.length) blocks.push(<div key={`wrap-${blocks.length}`} className="bg-white text-zinc-950">{run}</div>);
    run = [];
  };
  for (const id of shown) {
    const node = await render(id);
    if (id === "hero") {
      flush();
      blocks.push(node);
    } else run.push(node);
  }
  flush();

  return <SiteShell variant="home">{blocks}</SiteShell>;
}
