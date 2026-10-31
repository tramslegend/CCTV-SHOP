// "Import current content" in the page editor: the built-in content of each information page as editable blocks.
// Server-only (called from a server action). It mirrors the copy in the page routes under src/app/(store) — headings
// and the short summaries written for this shop — and writes shop details as placeholders ({{store.phone}} …) so the
// imported page keeps following Settings. Details that aren't set are left out, as on the built-in pages.
import { cookieSections, type LegalFacts, privacyExtras, privacySections, returnsSections, termsSections } from "@/components/sites/cctvmaster/content/legal-copy";
import type { LegalSection } from "@/components/sites/cctvmaster/content/page-parts";
import { VAT_RATE } from "@/lib/cctvmaster/money";
import { addressLine, deliveryFacts, mapHref, vatPercent } from "@/lib/settings/format";
import type { ShopSettings } from "@/lib/settings/schema";
import { newId, type PageBlock, type TokenKey } from "./blocks";
import type { PageSlug } from "./pages";

export interface ImportedPage {
  title: string;
  intro: string;
  metaDescription: string;
  blocks: PageBlock[];
}

const T = (key: TokenKey) => `{{${key}}}`;

const heading = (text: string, level: 2 | 3 = 2): PageBlock => ({ id: newId(), type: "heading", text, level });
const text = (markdown: string): PageBlock => ({ id: newId(), type: "text", markdown });
const faq = (items: { q: string; a: string }[]): PageBlock => ({ id: newId(), type: "faq", items: items.map((i) => ({ id: newId("q"), ...i })) });
const facts = (items: { label: string; value: string; note: string }[]): PageBlock => ({
  id: newId(),
  type: "facts",
  items: items.map((i) => ({ id: newId("f"), ...i })),
});
const callout = (title: string, body: string, linkLabel = "", linkHref = ""): PageBlock => ({
  id: newId(),
  type: "callout",
  tone: "note",
  title,
  body,
  linkLabel,
  linkHref,
});

/** Shop details as placeholders where set, empty where not (so the built-in "if set" wording is kept). */
function details({ store }: ShopSettings) {
  const has = (v: string) => !!v.trim();
  return {
    name: T("store.name"),
    phone: has(store.phone) ? T("store.phone") : "",
    phoneIntl: has(store.phone) ? T("store.phoneIntl") : "",
    email: has(store.email) ? T("store.email") : "",
    address: addressLine(store.address) ? T("store.address") : "",
    city: has(store.address.city) ? T("store.city") : "",
    map: mapHref(store) ? T("store.mapUrl") : "",
  };
}

function legalFactsWithTokens(settings: ShopSettings): LegalFacts {
  const d = details(settings);
  const { store } = settings;
  return {
    name: d.name,
    legalName: T("store.legalName"),
    address: d.address,
    email: d.email,
    phone: d.phone,
    companyNumber: store.companyNumber.trim() ? T("store.companyNumber") : "",
    registeredOffice: store.registeredOffice.trim() ? T("store.registeredOffice") : "",
    vatPercent: vatPercent(VAT_RATE),
  };
}

/** Legal sections → a heading per section, then its paragraphs and lists as text blocks. */
function legalBlocks(sections: LegalSection[]): PageBlock[] {
  const out: PageBlock[] = [];
  for (const section of sections) {
    out.push(heading(section.title));
    let buffer: string[] = [];
    const flush = () => {
      if (buffer.length) out.push(text(buffer.join("\n\n")));
      buffer = [];
    };
    for (const b of section.blocks) {
      if (b.type === "h2" || b.type === "h3") {
        flush();
        out.push(heading(b.text, b.type === "h3" ? 3 : 2));
      } else if (b.type === "ul") buffer.push(b.items.map((i) => `- ${i}`).join("\n"));
      else buffer.push(b.text);
    }
    flush();
  }
  return out;
}

const ABOUT_CATEGORIES = [
  { label: "Cameras", href: "/categories/cameras" },
  { label: "Recorders", href: "/categories/recorders" },
  { label: "CCTV kits, with a recorder, cameras and cabling picked to work together", href: "/kits" },
  { label: "Storage", href: "/categories/storage" },
  { label: "Wire and cable", href: "/categories/wire-cable" },
  { label: "Data comm and networking", href: "/categories/data-comm-networking" },
  { label: "Intrusion", href: "/categories/intrusion" },
  { label: "Accessories", href: "/categories/accessories" },
];

const BUILDERS: Record<PageSlug, (settings: ShopSettings) => ImportedPage> = {
  about: (settings) => {
    const t = details(settings);
    const contact = [t.phone && `call ${t.phone}`, t.email && `email ${t.email}`].filter(Boolean);
    const reach = contact.length ? `${contact.join(", ")} or use the [contact page](/contact).` : "Use the [contact page](/contact).";
    return {
      title: `About ${t.name}`,
      intro: `${t.name} is an online CCTV and security equipment shop based in ${t.city || "the UK"}. Homeowners, small businesses and installers all buy from us, at public prices that are the same for every customer.`,
      metaDescription: `${t.name} sells CCTV cameras, recorders and kits to homeowners, small businesses and installers, at the same public prices for everyone.`,
      blocks: [
        heading("Who we sell to"),
        text("There’s no account or trade relationship to set up first. Everyone shops the same range at the same published prices, and guest checkout takes any major debit or credit card."),
        heading("What we stock"),
        text(`The shop is organised into these categories:\n\n${ABOUT_CATEGORIES.map((c) => `- [${c.label}](${c.href})`).join("\n")}`),
        text(
          "There are also ranges for [video door entry](/collections/video-door-entry) and [door access control](/collections/access-control), a [Hikvision range](/brands/hikvision), a [kit builder](/kit-builder/cctv) and a [storage calculator](/tools/cctv-storage-calculator). Product pages list the key specifications, so you can check a part suits your setup before you order.",
        ),
        heading("What we do and don’t do"),
        text("We supply equipment only — installation is for you or your own installer to arrange. Unsure whether a camera will work with your existing recorder? Send us the recorder’s model number and we’ll check."),
        heading("How buying works"),
        text(
          `Add items to your basket and pay by card at checkout. Delivery is a single charge per order (see the [delivery page](/delivery)). Collection from our ${t.city ? `${t.city} ` : ""}counter is arranged by phone rather than at checkout, and returns are explained on the [returns page](/returns).`,
        ),
        faq([
          ...(t.address ? [{ q: `Where is ${t.name} based?`, a: `We're at ${t.address}.` }] : []),
          { q: "Can installers and businesses buy from you?", a: "Yes, at the same public prices as everyone else. For a project quote, volume pricing or a purchase order, [contact us](/contact)." },
          { q: "Do you install the equipment you sell?", a: "No. We supply the equipment; fitting is arranged by you or your own installer." },
          { q: `How do I contact ${t.name}?`, a: reach.charAt(0).toUpperCase() + reach.slice(1) },
        ]),
        callout(
          "Buying regularly or for a project?",
          "Our prices are already public, so there’s nothing to unlock. If you quote jobs or buy for several sites, the trade page explains how we can help.",
          "See trade options",
          "/trade",
        ),
      ],
    };
  },

  delivery: (settings) => {
    const t = details(settings);
    const d = deliveryFacts(settings.delivery);
    const fee = T("delivery.fee");
    const threshold = T("delivery.freeFrom");
    const cutoff = T("delivery.cutoff");
    const transit = T("delivery.transit");
    const stats = d.alwaysFree
      ? [
          { label: "Delivery anywhere in the UK", value: "Free", note: "On every order, VAT included" },
          { label: "Arrives", value: transit, note: "After dispatch, by tracked service" },
          { label: "Sent the same day", value: `Order by ${cutoff}`, note: "Mon to Fri, on items in stock" },
        ]
      : [
          { label: "Delivery anywhere in the UK", value: fee, note: "One charge per order, VAT included" },
          { label: "Free delivery", value: `${threshold} or more`, note: "Taken off in your basket (VAT included)" },
          { label: "Sent the same day", value: `Order by ${cutoff}`, note: "Mon to Fri, on items in stock" },
        ];
    const pickup = [
      t.address ? `Our counter is at **${t.address}**. ` : "",
      `Collection isn’t offered at checkout, so ${t.phoneIntl ? `call **${t.phoneIntl}**` : "contact us"} first and we’ll check your order is picked and waiting — no wasted trip for something still on its way to us.`,
      `\n\n${t.map ? `[Directions](${t.map}) · ` : ""}[Opening times and what to bring](/visit)`,
    ].join("");
    return {
      title: "Delivery & collection",
      intro: "What delivery costs, when your order leaves us and how to collect it yourself — all shown before you pay.",
      metaDescription: d.alwaysFree
        ? `CCTV delivery anywhere in the UK is free. In-stock orders before ${cutoff} Mon–Fri ship same day.`
        : `CCTV delivery anywhere in the UK is ${fee} per order, free from ${T("delivery.freeFromShort")}, VAT included. In-stock orders before ${cutoff} Mon–Fri ship same day.`,
      blocks: [
        facts(stats),
        callout("Pick it up from us", pickup),
        heading("Your questions"),
        faq([
          {
            q: "How much does delivery cost?",
            a: d.alwaysFree
              ? "Nothing: delivery to any UK address is free, whatever the order comes to."
              : `A flat ${fee} per order to any UK address, VAT included, and nothing once your order reaches ${threshold}. The charge covers the whole order and is shown before you pay.`,
          },
          {
            q: "When will my order be sent?",
            a: `In-stock items ordered before ${cutoff} on a weekday leave the same working day and usually arrive ${transit} later. Later or weekend orders go out the next working day, and back-ordered items follow as soon as they arrive.`,
          },
          {
            q: "Can I pick up my order instead of paying for delivery?",
            a: `Yes. Collection is arranged by phone rather than at checkout — ${t.phoneIntl ? `call ${t.phoneIntl}` : "contact us"} and we’ll confirm your order is ready${t.address ? ` at ${t.address}` : ""} before you travel.`,
          },
          {
            q: "Does it cost more to get to Northern Ireland, or to the Highlands and Islands in Scotland?",
            a: d.alwaysFree
              ? "No. Delivery is free to every UK address. For the Channel Islands or the Isle of Man, please contact us before ordering."
              : `No. Every UK address pays the same ${fee}, or nothing from ${threshold}. For the Channel Islands or the Isle of Man, please contact us before ordering.`,
          },
          {
            q: "What if my order turns up damaged, or it’s the wrong thing?",
            a: "Tell us promptly and we’ll put it right at our expense, return postage included. Separately, you can cancel an online or phone order within 14 days without giving a reason.",
          },
        ]),
        text(
          `Changed your mind, or has something turned up faulty? Have a look at [our returns page](/returns)${t.email ? ` or email [${t.email}](mailto:${t.email})` : " or [get in touch](/contact)"}.`,
        ),
      ],
    };
  },

  faqs: (settings) => {
    const t = details(settings);
    const d = deliveryFacts(settings.delivery);
    const link = (label: string, href: string) => ` [${label}](${href})`;
    return {
      title: "Frequently asked questions",
      intro: "Quick answers on ordering, delivery, returns and whether things work together.",
      metaDescription: "Quick answers about ordering, delivery, returns and whether parts work together.",
      blocks: [
        heading("Ordering & paying"),
        faq([
          { q: "Do I have to open an account?", a: "No — guest checkout works. An account is optional and simply lets you track orders, download invoices and reorder quickly." },
          { q: "How can I pay?", a: "By any major debit or credit card (Visa, Mastercard or Amex) through our secure checkout. Payment is taken when the order is placed." },
          { q: "Do your prices include VAT?", a: `Yes. Prices on the site include UK VAT at ${T("vat.rate")}, and checkout itemises the VAT before you pay.` },
        ]),
        heading("Delivery & collection"),
        faq([
          {
            q: "How much will delivery be, and when does my order go out?",
            a: `${d.alwaysFree ? "UK delivery is free on every order" : `UK delivery is ${T("delivery.fee")} per order and free from ${T("delivery.freeFrom")} (VAT included)`}. In-stock orders placed before ${T("delivery.cutoff")}, Monday to Friday, are dispatched the same working day.${link("Delivery costs and cut-off", "/delivery")}`,
          },
          {
            q: "Can I pick my order up?",
            a: `Yes, from our counter${t.address ? ` on ${t.address}` : ""}. Order online, then ${t.phone ? `call ${t.phone}` : "contact us"} so we can confirm it’s ready before you travel.${link("Where to collect from", "/delivery")}`,
          },
        ]),
        heading("Returns & warranty"),
        faq([
          {
            q: "Can I send something back?",
            a: `Yes. As a consumer you can cancel most online orders within 14 days of delivery, and you have separate rights if an item is faulty.${link("Returns & refunds", "/returns")}`,
          },
          {
            q: "What if something’s faulty?",
            a: `Send us your order number and a short description of the fault. Under the Consumer Rights Act 2015 you’re entitled to a repair, replacement or refund, depending on when the fault appears.${link("Get in touch", "/contact")}`,
          },
          { q: "Is there a warranty?", a: "Warranty cover depends on the product and manufacturer, so check the product page. Your statutory rights apply either way." },
        ]),
        heading("Will it work together?"),
        faq([
          {
            q: "Will this camera work with the recorder I already have?",
            a: `It depends on whether your system is IP or analogue HD, and on the brand. Send us your recorder’s model number and we’ll confirm before you buy.${link("Ask us to check", "/contact")}`,
          },
          { q: "Do you sell complete kits?", a: `Yes — matched sets of recorder, cameras and cabling, sold alongside the individual parts.${link("Browse products", "/products")}` },
        ]),
        text("Can’t find it? [Contact support](/contact) — real engineers, UK hours."),
      ],
    };
  },

  "reviews-policy": (settings) => {
    const t = details(settings);
    const reach = [t.email && `email ${t.email}`, t.phone && `call ${t.phone}`].filter(Boolean).join(" or ") || "use our contact page";
    const section = (title: string, paragraphs: string[]) => [heading(title), text(paragraphs.join("\n\n"))];
    return {
      title: "Our reviews policy",
      intro: `How ${t.name} collects, checks and publishes product reviews — and whether writing one earns you anything.`,
      metaDescription: "Who can leave a review here, how reviews get checked and put live, and whether you get anything for writing one.",
      blocks: [
        ...section("Who can leave a review", [
          `Reviews are open only to people who bought the product from ${t.name}. After your purchase we email a private review link, or you can review from the order in your account once it has been dispatched.`,
          "Every customer receives the same request, worded the same way — we don’t pick who to ask based on how happy we expect them to be.",
        ]),
        ...section("Good or bad, every review goes up", [
          "Low star ratings and critical comments are published as written, without editing.",
          "A review is held for a manual check only if it contains contact details or links, abusive language, or text that isn’t made of real words.",
        ]),
        ...section("Do you get anything for reviewing?", [
          "No. There are no discounts, credit or prize-draw entries in return for a review.",
          "The same applies to reviews you leave on Google, Trustpilot or any other site.",
        ]),
        ...section("When we reply", ["We may respond publicly to a review, but a reply will never offer anything in exchange for changing or removing it."]),
        ...section("Leaving a review or making a complaint", [
          "A review shares your opinion with other shoppers; a complaint asks us to fix something. You can do either or both, and raising a problem never stops you reviewing.",
          `To raise a problem, ${reach}. Your rights are set out on our returns page.`,
        ]),
        ...section("Spotted a fake review?", [`If a review looks fake or seems to break these rules, ${reach} and tell us which one — we’ll investigate.`]),
        ...section("Google and Trustpilot", [
          "We may also invite you to review us on Google or Trustpilot. Reviews from other websites, marketplaces included, are never copied onto our product pages.",
        ]),
        text("Something wrong with an order? Our [returns page](/returns) explains what happens next, or you can [get in touch](/contact)."),
      ],
    };
  },

  trade: (settings) => {
    const t = details(settings);
    const reachUs = [t.phone && `call ${t.phone}`, t.email && `email ${t.email}`].filter(Boolean).join(" or ") || "contact us";
    return {
      title: `Trade accounts at ${t.name}`,
      intro: "For small businesses, electricians, installers and facilities teams buying more than the odd camera. Apply below and we’ll reply within one working day.",
      metaDescription: `${t.name} keeps one public price for everyone, so there's no separate trade price list to unlock.`,
      blocks: [
        text("Prices stay public and identical for every customer. A trade account changes how you buy rather than what you pay: whole-job quotes, purchase orders and VAT invoices for your records."),
        heading("What you get with a trade account"),
        heading("Quotes for whole jobs", 3),
        text("Send a spec or drawing and get the whole job priced on one schedule, held for 30 days."),
        heading("Purchase orders and VAT invoices", 3),
        text("Order against your PO number and receive a full VAT invoice, without paying by card each time."),
        heading("Someone who knows you", 3),
        text("One named contact who knows your jobs, on the phone or by email every working day."),
        heading("Stock checked before you set off", 3),
        text("We check the actual shelf, not just the website, before you travel to collect."),
        heading("Who a trade account is for"),
        text("Installers, electricians, facilities teams and small businesses that buy CCTV regularly — for example if you quote jobs for clients, look after several sites, or build systems into a wider service."),
        heading("Pricing stays public"),
        text("Everyone pays the same published price, so you can see exactly what you’ll pay in the shop before committing. The account adds service around that price rather than a hidden price list."),
        heading("Quotes, volume pricing and purchase orders"),
        text(`For a project quote, volume pricing or ordering on a PO, ${reachUs} with an outline of the job.`),
        heading("Common questions"),
        faq([
          { q: "Do trade customers get different prices from the public?", a: "No — there is one public price for everyone. For bigger jobs, ask about a project quote or volume pricing." },
          {
            q: "Can I check that an item is in stock before I travel to collect it?",
            a: t.phone
              ? `Yes. Call ${t.phone} first and we’ll check the shelf and have your order picked before you arrive.`
              : "Yes. Contact us first and we’ll check the shelf and have your order picked before you arrive.",
          },
          {
            q: "Can I order on a purchase order instead of paying by card?",
            a: `Get in touch${t.phone ? ` on ${t.phone}` : ""}${t.phone && t.email ? " or" : ""}${t.email ? ` at ${t.email}` : ""} and we’ll set that up with you.`,
          },
          { q: "Can you check whether products will work with my existing system?", a: "Yes. Send the model numbers of your recorder and the product you’re considering and we’ll confirm compatibility." },
        ]),
      ],
    };
  },

  visit: (settings) => {
    const t = details(settings);
    const call = t.phoneIntl ? `call ${t.phoneIntl}` : "contact us";
    return {
      title: `Find ${t.name}${t.city ? ` in ${t.city}` : ""}`,
      intro: `${t.city ? `A ${t.city} counter` : "A shop counter"} with public prices and UK stock — give us a ring before you travel.`,
      metaDescription: `Visit the ${t.name} counter${t.city ? ` in ${t.city}` : ""} — browse cameras, recorders and kits in person.${t.phone ? ` Call ${t.phone} first to confirm stock before travelling.` : ""}`,
      blocks: [
        text(`Collecting an order? Collection isn’t an option at checkout, so it’s arranged by phone: ${call} and we’ll confirm your order is picked and waiting before you leave.`),
        heading("Before you travel"),
        text(
          [
            `- Place your order online, then ${call}.`,
            "- Have your order number to hand.",
            "- Wait for us to confirm it’s ready to collect.",
            "- If anything is due in on our next delivery, we’ll tell you before you set off.",
          ].join("\n") + "\n\nWant to know something is in stock before you come? Ask — we check the shelf, not just the website.",
        ),
        ...(t.address
          ? [heading("Where to find us"), text(`${t.address}. The [delivery and collection page](/delivery) has more on collecting.`)]
          : []),
        heading("Areas we serve"),
        text(
          `Collection is from our ${t.city ? `${t.city} ` : ""}address, and we deliver anywhere in the UK at one flat rate. For the Channel Islands or the Isle of Man, contact us before ordering.`,
        ),
        faq([
          {
            q: "Can I pick up my order instead of paying for delivery?",
            a: `Yes. Collection is set up by phone, not at checkout — ${t.phoneIntl ? `ring ${t.phoneIntl}` : "contact us"} before you travel and we’ll have it ready.`,
          },
          { q: "Can I choose collection at checkout?", a: "No. Place your order online as normal, then call us to arrange collection." },
          { q: "Can you check whether an item is in stock before I make the trip?", a: "Yes. Ask and we’ll check the shelf itself, not just the website." },
          { q: "Do I need an account to collect an order?", a: "No. Guest checkout is fine; an account just adds order tracking and invoice downloads." },
        ]),
        callout("Directions, opening times and what to bring", "The delivery and collection page covers everything for the trip.", "See delivery and collection", "/delivery"),
      ],
    };
  },

  guides: () => ({
    title: "CCTV help and guides",
    intro: "Help with choosing, sizing and fitting CCTV, sorted by topic. They're written around the kit we actually sell, and the free calculators do the sums for you.",
    metaDescription: "CCTV buying guide for homes and small businesses: check compatibility, storage and night vision before you buy, with free sizing calculators.",
    blocks: [],
  }),

  contact: (settings) => ({
    title: "Get In Touch",
    intro: "Questions about a product? Need help speccing a system? Talk to a human — we're happy to help, even if you're just figuring things out.",
    metaDescription: `Contact ${details(settings).name} — help choosing a system, orders, returns and warranty claims.`,
    blocks: [],
  }),

  returns: (settings) => ({
    title: "Returns & Refunds",
    intro: "",
    metaDescription: "How to send something back to us, and when you’ll get your money back.",
    blocks: legalBlocks(returnsSections(legalFactsWithTokens(settings))),
  }),

  privacy: (settings) => ({
    title: "Privacy Policy",
    intro: "",
    metaDescription: `How ${T("store.name")} collects, uses and protects your personal data, and your rights under UK GDPR.`,
    blocks: [
      ...legalBlocks(privacySections(legalFactsWithTokens(settings))),
      ...privacyExtras.flatMap((extra) => [heading(extra.title), text(extra.text)]),
    ],
  }),

  terms: (settings) => ({
    title: "Terms & Conditions",
    intro: "",
    metaDescription: `Terms of sale from ${T("store.name")}: prices, delivery, cancellation rights and payment.`,
    blocks: legalBlocks(termsSections(legalFactsWithTokens(settings))),
  }),

  cookies: () => ({
    title: "Cookie Policy",
    intro: "",
    metaDescription: `The cookies ${T("store.name")} uses — essential, analytics and preferences — and how to manage them.`,
    blocks: legalBlocks(cookieSections),
  }),
};

/** The page's built-in content as editable blocks, with shop details as placeholders. */
export function importBuiltInPage(slug: PageSlug, settings: ShopSettings): ImportedPage {
  return BUILDERS[slug](settings);
}
