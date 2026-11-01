import type { ReactNode } from "react";
import { getSetting } from "@/lib/cctvmaster/catalog";
import { contentId, fillTokens, tokenValues } from "@/lib/homepage/text";
import { headerNav } from "@/lib/navigation/menu";
import { ANNOUNCEMENT_KEY, NAVIGATION_KEY, parseAnnouncement, parseNavigation } from "@/lib/navigation/schema";
import { mapHref, toShopInfo } from "@/lib/settings/format";
import { loadSiteSettings } from "@/lib/settings/storefront";
import { cn } from "@/lib/utils";
import { AnnouncementBar } from "./announcement-bar";
import { CookieBanner } from "./cookie-banner";
import { MobileNav } from "./mobile-nav";
import { ShopInfoProvider } from "./shop-info";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { TopBar } from "./top-bar";

// Page chrome shared by every route. The homepage uses the source's marketing wrapper; inner pages use the store one.
// The shop's name, logo and contact details come from Settings (catalogue snapshot) and reach client components as
// props, or through ShopInfoProvider for forms deeper in the page. The announcement banner, top bar (off unless switched
// on), header category bar and footer come from /admin/content/navigation (settings "navigation" and "announcement").
export async function SiteShell({ variant, children }: { variant: "home" | "store"; children: ReactNode }) {
  const { store, delivery, social } = await loadSiteSettings();
  const nav = parseNavigation(getSetting(NAVIGATION_KEY));
  const announcement = parseAnnouncement(getSetting(ANNOUNCEMENT_KEY));
  const tokens = tokenValues(store, delivery);
  const info = toShopInfo(store);
  const bannerText = fillTokens(announcement.text, tokens);
  const top = nav.topBar;
  return (
    <ShopInfoProvider value={info}>
      <CookieBanner />
      <div className="flex min-h-screen flex-col pb-16 md:pb-0">
        <div
          className={cn(
            variant === "home" ? "bg-canvas font-sans text-foreground" : "store-font bg-canvas flex min-h-screen flex-col",
          )}
        >
          {announcement.enabled && bannerText && (
            <AnnouncementBar
              id={contentId(`${bannerText}|${announcement.link.label}|${announcement.link.href}`)}
              text={bannerText}
              link={announcement.link}
              colour={announcement.colour}
              dismissible={announcement.dismissible}
            />
          )}
          {top.enabled && (
            <TopBar
              phone={top.showPhone ? info.phone : ""}
              phoneHref={top.showPhone ? info.phoneHref : ""}
              mapHref={top.showStore ? mapHref(store) : ""}
              deliverTo={fillTokens(top.deliverTo, tokens)}
              links={nav.topLinks.map((l) => ({ ...l, label: fillTokens(l.label, tokens) }))}
            />
          )}
          <SiteHeader brand={{ name: store.name, logoUrl: store.logoUrl }} nav={headerNav(nav)} />
          <main id="main-content" className={variant === "home" ? undefined : "flex-1"}>
            {children}
          </main>
          <SiteFooter store={store} social={social} footer={nav.footer} tokens={tokens} />
        </div>
        <MobileNav />
      </div>
    </ShopInfoProvider>
  );
}
