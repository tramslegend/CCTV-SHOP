// Header category bar, top-bar links, footer and announcement banner, stored in the `settings` table under the keys
// "navigation" and "announcement" and edited at /admin/content/navigation. Neutral defaults and lenient parsing, as in
// src/lib/settings/schema.ts. Client-safe (no server imports).
import { z } from "zod";
import {
  type FeaturePoint,
  type LinkSetting,
  storedBool,
  storedFeaturePoint,
  storedLink,
  storedList,
  storedText,
} from "@/lib/homepage/schema";

export const NAVIGATION_KEY = "navigation";
export const ANNOUNCEMENT_KEY = "announcement";

/** One top-level category in the header bar. */
export interface HeaderItemSetting {
  slug: string;
  show: boolean;
  /** Small picture next to the name; the category's own image when empty. */
  icon: string;
  /** Opens a menu of the category's subcategories (when it has any) instead of going straight to its page. */
  menu: boolean;
  /** Menu links (by href) left out of the menu. */
  hidden: string[];
  /** Picture per menu link (by href), overriding the subcategory's own image. */
  icons: Record<string, string>;
}

export interface FooterColumn {
  title: string;
  links: LinkSetting[];
}

export const PAYMENT_MARKS = [
  { id: "visa", label: "Visa", mark: "VISA" },
  { id: "mastercard", label: "Mastercard", mark: "MC" },
  { id: "amex", label: "Amex", mark: "AMEX" },
  { id: "maestro", label: "Maestro", mark: "MAESTRO" },
  { id: "paypal", label: "PayPal", mark: "PAYPAL" },
  { id: "applepay", label: "Apple Pay", mark: "APPLE PAY" },
  { id: "googlepay", label: "Google Pay", mark: "G PAY" },
  { id: "klarna", label: "Klarna", mark: "KLARNA" },
] as const;
export type PaymentMarkId = (typeof PAYMENT_MARKS)[number]["id"];
const PAYMENT_IDS = PAYMENT_MARKS.map((m) => m.id) as [PaymentMarkId, ...PaymentMarkId[]];

/** The black strip above the header. */
export interface TopBarSettings {
  enabled: boolean;
  /** The shop's phone number (Settings → Store details), when one is set. */
  showPhone: boolean;
  /** "Our Store" map link (Settings → Store details), when there's an address or map link. */
  showStore: boolean;
  /** Shown as "Deliver to …" (e.g. "Spain", "Worldwide"); empty = not shown. Tokens such as {shop} allowed. */
  deliverTo: string;
}

export interface NavigationSettings {
  /**
   * Header bar, in order. Top-level categories not listed here (e.g. added later) are shown after these, with their
   * own image and a menu.
   */
  header: HeaderItemSetting[];
  topBar: TopBarSettings;
  /** Links on the right of the black top bar. */
  topLinks: LinkSetting[];
  footer: {
    highlights: FeaturePoint[];
    columns: FooterColumn[];
    /** Payment marks shown, in PAYMENT_MARKS order. */
    payments: PaymentMarkId[];
    /** Small line at the bottom left; tokens such as {place} and {year} allowed. Empty = not shown. */
    bottomText: string;
  };
}

export const ANNOUNCEMENT_COLOURS = ["emerald", "dark", "blue", "amber", "red", "light"] as const;
export type AnnouncementColour = (typeof ANNOUNCEMENT_COLOURS)[number];

export const ANNOUNCEMENT_COLOUR_LABELS: Record<AnnouncementColour, string> = {
  emerald: "Green",
  dark: "Charcoal",
  blue: "Blue",
  amber: "Amber",
  red: "Red",
  light: "Pale green",
};

/** Banner classes per colour (shared by the storefront and the admin preview). */
export const ANNOUNCEMENT_STYLES: Record<AnnouncementColour, string> = {
  emerald: "bg-emerald-700 text-white",
  dark: "bg-zinc-800 text-white",
  blue: "bg-sky-700 text-white",
  amber: "bg-amber-300 text-zinc-950",
  red: "bg-red-700 text-white",
  light: "bg-emerald-50 text-emerald-950 border-b border-emerald-100",
};

export interface AnnouncementSettings {
  enabled: boolean;
  text: string;
  link: LinkSetting;
  colour: AnnouncementColour;
  /** Shoppers can close it; it stays closed in their browser until the text or link changes. */
  dismissible: boolean;
}

export const LIMITS = { header: 20, topLinks: 4, highlights: 3, columns: 5, columnLinks: 15 } as const;

// ---------- neutral defaults ----------

export const DEFAULT_NAVIGATION: NavigationSettings = {
  header: [],
  topBar: { enabled: false, showPhone: true, showStore: true, deliverTo: "" },
  topLinks: [
    { label: "Delivery", href: "/delivery" },
    { label: "Contact us", href: "/contact" },
  ],
  footer: {
    highlights: [
      { icon: "truck", title: "Quick dispatch", detail: "Order before {cutoff} on working days" },
      { icon: "shield", title: "Easy returns", detail: "14 days to change your mind" },
      { icon: "lock", title: "Secure checkout", detail: "Your payment is protected" },
    ],
    columns: [
      {
        title: "Shop",
        links: [
          { label: "All products", href: "/products" },
          { label: "Categories", href: "/categories" },
          { label: "Products A–Z", href: "/product-index" },
        ],
      },
      {
        title: "Account",
        links: [
          { label: "Sign in", href: "/login" },
          { label: "Create account", href: "/signup" },
          { label: "My orders", href: "/dashboard/orders" },
          { label: "Cart", href: "/cart" },
        ],
      },
      {
        title: "Help",
        links: [
          { label: "Contact us", href: "/contact" },
          { label: "Delivery", href: "/delivery" },
          { label: "Returns", href: "/returns" },
          { label: "FAQs", href: "/faqs" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Terms of sale", href: "/terms" },
          { label: "Privacy", href: "/privacy" },
          { label: "Cookies", href: "/cookies" },
        ],
      },
    ],
    payments: ["visa", "mastercard"],
    bottomText: "",
  },
};

export const DEFAULT_ANNOUNCEMENT: AnnouncementSettings = {
  enabled: false,
  text: "",
  link: { label: "", href: "" },
  colour: "emerald",
  dismissible: true,
};

// ---------- lenient parsing ----------

const strict = (max: number) => z.string().transform((s) => s.trim().slice(0, max));
const nonEmpty = (max: number) => strict(max).pipe(z.string().min(1));

const storedImageMap = z
  .record(z.string(), z.string())
  .catch({})
  .transform((m) => Object.fromEntries(Object.entries(m).filter(([k, v]) => k && v.trim()).slice(0, 200)));

const storedHeaderItem = z.object({
  slug: nonEmpty(200),
  show: storedBool(true),
  icon: storedText("", 2000),
  menu: storedBool(true),
  hidden: storedList(nonEmpty(500), 200, []),
  icons: storedImageMap,
});

const storedNavLink = z.object({ label: nonEmpty(60), href: nonEmpty(500) });

const D = DEFAULT_NAVIGATION;

const storedNavigation = z
  .object({
    header: storedList(storedHeaderItem, 100, D.header).transform((items) => {
      const seen = new Set<string>();
      return items.filter((i) => !seen.has(i.slug) && seen.add(i.slug));
    }),
    topBar: z
      .object({
        enabled: storedBool(D.topBar.enabled),
        showPhone: storedBool(D.topBar.showPhone),
        showStore: storedBool(D.topBar.showStore),
        deliverTo: storedText(D.topBar.deliverTo, 40),
      })
      .catch(D.topBar),
    topLinks: storedList(storedNavLink, LIMITS.topLinks, D.topLinks),
    footer: z
      .object({
        highlights: storedList(storedFeaturePoint, LIMITS.highlights, D.footer.highlights),
        columns: storedList(
          z.object({ title: strict(60).catch(""), links: storedList(storedNavLink, LIMITS.columnLinks, []) }),
          LIMITS.columns,
          D.footer.columns,
        ),
        payments: storedList(z.enum(PAYMENT_IDS), PAYMENT_IDS.length, D.footer.payments).transform((ids) =>
          PAYMENT_IDS.filter((id) => ids.includes(id)),
        ),
        bottomText: storedText(D.footer.bottomText, 200),
      })
      .catch(D.footer),
  })
  .catch(D);

const storedAnnouncement = z
  .object({
    enabled: storedBool(false),
    text: storedText("", 200),
    link: storedLink(DEFAULT_ANNOUNCEMENT.link),
    colour: z.enum(ANNOUNCEMENT_COLOURS).catch("emerald"),
    dismissible: storedBool(true),
  })
  .catch(DEFAULT_ANNOUNCEMENT);

export function parseNavigation(raw: unknown): NavigationSettings {
  const parsed = storedNavigation.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_NAVIGATION;
}

export function parseAnnouncement(raw: unknown): AnnouncementSettings {
  const parsed = storedAnnouncement.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_ANNOUNCEMENT;
}
