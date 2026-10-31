import { VAT_RATE } from "@/lib/cctvmaster/money";
import { addressLine, vatPercent } from "@/lib/settings/format";
import type { StoreSettings } from "@/lib/settings/schema";
import type { LegalBlock, LegalSection } from "./page-parts";

// Legal pages: the source's headings and structure, with short summaries written for this clone. The shop's own facts
// (names, company number, addresses, contact details, VAT rate) come from Settings, so the sections are built per
// request from `LegalFacts`; anything not set is left out.

export interface LegalFacts {
  /** Trading name. */
  name: string;
  /** Registered company name (the trading name when not set). */
  legalName: string;
  /** One-line trading address, or "". */
  address: string;
  email: string;
  phone: string;
  companyNumber: string;
  registeredOffice: string;
  vatPercent: number;
}

export const legalFacts = (store: StoreSettings): LegalFacts => ({
  name: store.name,
  legalName: store.legalName || store.name,
  address: addressLine(store.address),
  email: store.email,
  phone: store.phone,
  companyNumber: store.companyNumber,
  registeredOffice: store.registeredOffice,
  vatPercent: vatPercent(VAT_RATE),
});

const p = (text: string): LegalBlock => ({ type: "p", text });

/** "Email …" lead-in, or the contact page when no email address is set. */
const emailLead = (f: LegalFacts) => (f.email ? `Email ${f.email}` : "Contact us through the [contact page](/contact)");

/** Name and address lines (each only when set). */
const nameBlocks = (f: LegalFacts): LegalBlock[] => [f.legalName, f.address].filter(Boolean).map(p);

/** Email and phone lines (each only when set). */
const contactBlocks = (f: LegalFacts): LegalBlock[] =>
  [f.email && `Email: ${f.email}`, f.phone && `Phone: ${f.phone}`].filter((t): t is string => !!t).map(p);

export const privacySections = (f: LegalFacts): LegalSection[] => [
  {
    title: "About this policy",
    blocks: [
      {
        type: "p",
        text: `This policy sets out what personal information ${f.name} collects when you browse or buy, why we need it and how we look after it.`,
      },
    ],
  },
  {
    title: "What we collect",
    blocks: [
      {
        type: "p",
        text: "Only what an order, account or enquiry needs: your name, any business name, delivery and billing address, email address, phone number and payment details.",
      },
    ],
  },
  {
    title: "What we use it for",
    blocks: [
      {
        type: "p",
        text: "Processing and delivering orders, running your account, answering your questions, sending occasional product news you can opt out of, and keeping the records the law requires.",
      },
    ],
  },
  {
    title: "Who we share it with",
    blocks: [
      {
        type: "p",
        text: "Nobody buys your data from us. Couriers and payment processors receive only what they need to do their part, and we disclose information when the law obliges us to.",
      },
    ],
  },
  {
    title: "Keeping it safe",
    blocks: [
      {
        type: "p",
        text: "Technical and organisational safeguards protect your information against unauthorised access, loss and misuse.",
      },
    ],
  },
  {
    title: "Your rights",
    blocks: [
      {
        type: "p",
        text: "Under UK data protection law you can request a copy of your data, have it corrected or erased, and object to or restrict some uses of it. Contact us to make a request.",
      },
    ],
  },
  {
    title: "Cookies",
    blocks: [
      {
        type: "p",
        text: "Cookies keep the site working and remember your settings. The [Cookie Policy](/cookies) explains each type.",
      },
    ],
  },
  {
    title: "Our site activity log, question by question",
    blocks: [
      { type: "p", text: "Separately from analytics, we keep a log of events on this site. In short:" },
      { type: "h3", text: "Why keep a log at all?" },
      {
        type: "p",
        text: "To investigate problems such as disputed orders, suspected account takeovers, fraud and automated copying of our catalogue.",
      },
      { type: "h3", text: "What goes into it?" },
      {
        type: "p",
        text: "Your device type, operating system and browser, your IP address, the pages you open with timestamps, and actions such as quote requests, basket changes and orders.",
      },
      { type: "h3", text: "Does it know who I am?" },
      {
        type: "p",
        text: "Only while you are signed in. Otherwise entries are tied to a random identifier stored in your browser rather than to your name or contact details.",
      },
      { type: "h3", text: "What’s never in it?" },
      {
        type: "p",
        text: "Form contents, keystrokes, scrolling, mouse movement, card numbers, security codes and passwords. Query strings are cut from logged addresses because they can carry sign-in or reset links.",
      },
      { type: "h3", text: "How long do you keep it?" },
      {
        type: "p",
        text: "**180 days**, then entries are deleted automatically. A few security events are copied to a separate audit log that is kept longer in case it is needed for a legal claim.",
      },
      { type: "h3", text: "Who can see it?" },
      {
        type: "p",
        text: `Only named ${f.name} staff who have been given access for security, fraud checks or support. It is never sold or passed to advertisers.`,
      },
      { type: "h3", text: "What gives you the right to keep it?" },
      {
        type: "p",
        text: "When you are signed out, your **consent** from the cookie banner, with no answer treated as a no. When you are signed in, our **legitimate interests** in account and payment security, fraud prevention and resolving order disputes.",
      },
      { type: "h3", text: "What can I do about it?" },
      {
        type: "p",
        text: `Ask for a copy or deletion, object where we rely on legitimate interests, or withdraw analytics consent in your browser’s cookie settings ${f.email ? `by emailing [${f.email}](mailto:${f.email})` : "by contacting us through the [contact page](/contact)"}. You can also complain to the ICO at [ico.org.uk](https://ico.org.uk).`,
      },
    ],
  },
];

/** Shown below the policy body on the source, outside the prose column. */
export const privacyExtras = [
  {
    id: "privacy-google-customer-reviews",
    title: "Google Customer Reviews",
    text: "If you opt in after ordering, Google receives your email address, order number, delivery country and estimated delivery date so it can send you a short survey about the purchase.",
  },
  {
    id: "privacy-openai-measurement",
    title: "Advertising measurement",
    text: "If you accept all cookies, an OpenAI measurement pixel helps us see whether advertising in ChatGPT leads to purchases, using browser and ad-attribution identifiers together with purchase and order details.",
  },
];

export const cookieSections: LegalSection[] = [
  {
    title: "What cookies are",
    blocks: [
      {
        type: "p",
        text: "Small text files your browser saves when you visit a website. Some of our features depend on them.",
      },
    ],
  },
  {
    title: "How we use them",
    blocks: [
      {
        type: "p",
        text: "To run the site, keep you signed in, remember your settings and understand how visitors use our pages.",
      },
    ],
  },
  {
    title: "The kinds we use",
    blocks: [
      { type: "h3", text: "Essential cookies" },
      { type: "p", text: "Needed for signing in, holding your basket and security, so they are always on." },
      { type: "h3", text: "Analytics cookies" },
      { type: "p", text: "Tell us anonymously which pages are used and how, so we can improve them." },
      { type: "h3", text: "Preference cookies" },
      { type: "p", text: "Remember choices such as language or region for your next visit." },
    ],
  },
  {
    title: "Managing cookies",
    blocks: [
      {
        type: "p",
        text: "You can block or delete cookies in your browser settings, but blocking essential ones may stop sign-in or checkout from working.",
      },
    ],
  },
  {
    title: "Cookies from other companies",
    blocks: [
      {
        type: "p",
        text: "Some cookies are set by third-party services that run on our pages, such as analytics tools and payment providers.",
      },
    ],
  },
];

export const termsSections = (f: LegalFacts): LegalSection[] => [
  {
    id: "legal-acceptance",
    title: "Using our site",
    blocks: [
      {
        type: "p",
        text: `These terms cover using the ${f.name} website and buying from us. Please read them before you order; if you don’t accept them, please don’t use our services.`,
      },
      { type: "p", text: "Nothing here reduces your statutory rights as a consumer, and those rights win if anything conflicts." },
    ],
  },
  {
    id: "legal-about-us",
    title: "Who we are",
    blocks: [
      ...nameBlocks(f),
      ...(f.companyNumber || f.registeredOffice
        ? [
            p(
              [
                f.companyNumber && `Registered in England and Wales, company number ${f.companyNumber}.`,
                f.registeredOffice && `Registered office: ${f.registeredOffice}.`,
              ]
                .filter(Boolean)
                .join(" "),
            ),
          ]
        : []),
      ...contactBlocks(f),
    ],
  },
  {
    id: "legal-orders",
    title: "Your order",
    blocks: [
      {
        type: "p",
        text: "An order is your offer to buy. The contract is formed when we confirm dispatch, not when you check out or receive an acknowledgement.",
      },
      {
        type: "p",
        text: "Orders depend on stock. If an item is unavailable, or we find a price or description error before dispatch, we may decline the order and refund you in full.",
      },
    ],
  },
  {
    id: "legal-pricing",
    title: "Prices and VAT",
    blocks: [
      p(`Prices are in pounds sterling and include VAT at ${f.vatPercent}%.`),
      {
        type: "p",
        text: "Any delivery charge appears as a separate line before you pay. Prices may change, but never for an order we have already accepted.",
      },
    ],
  },
  {
    id: "legal-delivery",
    title: "Delivery",
    blocks: [
      {
        type: "p",
        text: "Delivery times shown are estimates. Without an agreed date, we deliver without undue delay and no later than 30 days after the contract is made.",
      },
      {
        type: "p",
        text: "Risk passes to you on delivery; for consumers, ownership and risk pass when you or your nominee take physical possession.",
      },
    ],
  },
  {
    id: "legal-returns-summary",
    title: "Returns and refunds",
    blocks: [
      {
        type: "p",
        text: "Consumers have 14 days to cancel a distance purchase, plus separate rights for faulty or misdescribed goods. Business returns need our approval before they are sent.",
      },
      { type: "p", text: "Full details are on our [Returns & Refunds](/returns) page, which forms part of these terms." },
    ],
  },
  {
    id: "legal-liability",
    title: "Our liability",
    blocks: [
      {
        type: "p",
        text: "We don’t limit liability where the law forbids it, including breaches of consumer rights, fraud, and negligence causing death or personal injury.",
      },
      {
        type: "p",
        text: "Otherwise we are not liable for indirect or consequential loss, or for lost profit, revenue, business or data arising from our goods or this website.",
      },
      { type: "p", text: "For business buyers, our liability on any order is capped at the price paid for those goods." },
    ],
  },
  {
    id: "legal-governing-law",
    title: "The law that applies",
    blocks: [
      {
        type: "p",
        text: "These terms are governed by the law of England and Wales and disputes go to its courts, though consumers elsewhere in the UK may use their local courts.",
      },
    ],
  },
  {
    id: "legal-complaints",
    title: "Complaints",
    blocks: [
      {
        type: "p",
        text: `${emailLead(f)}. We’ll acknowledge your complaint and explain how we intend to resolve it.`,
      },
    ],
  },
];

export const returnsSections = (f: LegalFacts): LegalSection[] => [
  {
    id: "legal-overview",
    title: "About this page",
    blocks: [
      {
        type: "p",
        text: `How to return goods bought from ${f.name} and when refunds are paid. It sits alongside our [Terms & Conditions](/terms).`,
      },
      {
        type: "p",
        text: "If you buy for yourself rather than for a business, you are a consumer and keep the legal rights below whatever else this page says. Business buyers follow the business terms noted in each section.",
      },
    ],
  },
  {
    id: "legal-consumer-cancel",
    title: "Changed your mind? You have 14 days",
    blocks: [
      {
        type: "p",
        text: "Because you bought at a distance, you can cancel for any reason within 14 days. The period starts the day after the goods reach you or someone you nominate.",
      },
      { type: "p", text: "You can also cancel at any point before the goods arrive." },
    ],
  },
  {
    id: "legal-consumer-how",
    title: "How to cancel",
    blocks: [
      {
        type: "p",
        text: `Tell us clearly within the 14 days, ${[f.email && `by email to ${f.email}`, f.address && `by post to ${f.address}`].filter(Boolean).join(" or ") || "through our [contact page](/contact)"}. An order number speeds things up but isn’t required.`,
      },
      { type: "p", text: "You may use the statutory model cancellation form below; it is optional:" },
      {
        type: "ul",
        items: [
          `To ${[f.legalName, f.address, f.email].filter(Boolean).join(", ")}:`,
          "I hereby give notice that I cancel my contract of sale of the following goods:",
          "Ordered on / received on:",
          "Name of consumer:",
          "Address of consumer:",
          "Signature of consumer (only if this form is notified on paper):",
          "Date:",
        ],
      },
    ],
  },
  {
    id: "legal-consumer-return-goods",
    title: "Sending it back",
    blocks: [
      {
        type: "p",
        text: "Post the goods back within 14 days of cancelling. Return postage is yours unless the item is faulty, damaged or not as described, in which case we pay.",
      },
      {
        type: "p",
        text: "Examine items only as you could in a shop. If extra handling reduces their value, we may deduct the difference from your refund.",
      },
    ],
  },
  {
    id: "legal-consumer-refund",
    title: "Getting your money back",
    blocks: [
      {
        type: "p",
        text: "We refund within 14 days of receiving the goods, or of your proof of postage if sooner, to your original payment method at no charge.",
      },
      {
        type: "p",
        text: "The refund covers the goods and our standard delivery charge; if you chose a dearer delivery option, only the standard amount comes back.",
      },
      { type: "p", text: "There is never a restocking fee for cancelling within 14 days." },
    ],
  },
  {
    id: "legal-consumer-exclusions",
    title: "Things you can’t cancel",
    blocks: [
      { type: "p", text: "The cancellation right doesn’t cover:" },
      {
        type: "ul",
        items: [
          "Items made to your specification or personalised, such as cable cut to a length you requested or a system configured for you.",
          "Sealed goods that can’t be returned once opened for health or hygiene reasons.",
          "Sealed software, audio or video once the seal is broken.",
          "Goods that become inseparably mixed with other items after delivery.",
        ],
      },
    ],
  },
  {
    id: "legal-consumer-faulty",
    title: "If something’s faulty, arrives damaged or isn’t as described",
    blocks: [
      {
        type: "p",
        text: "Under the Consumer Rights Act 2015 goods must be of satisfactory quality, fit for purpose and as described. These rights are separate from, and in addition to, your 14 days to cancel.",
      },
      {
        type: "p",
        text: "You can reject faulty goods for a full refund within 30 days of delivery. After that, ask for a repair or replacement; if neither works, you can choose a price reduction or a refund.",
      },
      {
        type: "p",
        text: `We cover the return costs for faulty, damaged or misdescribed items. ${emailLead(f)} and we’ll arrange collection or repay reasonable postage.`,
      },
    ],
  },
  {
    id: "legal-damage-shortages",
    title: "Damaged or missing items",
    blocks: [
      {
        type: "p",
        text: "Please check deliveries on arrival and report damage, shortages or wrong items as soon as you reasonably can, ideally within 48 hours, so we can claim from the courier.",
      },
      {
        type: "p",
        text: "For business buyers, notice within 48 hours is a condition of any transit claim. For consumers it is only a request and doesn’t affect your rights.",
      },
    ],
  },
  {
    id: "legal-how-to-return",
    title: "How to send something back",
    blocks: [
      {
        type: "p",
        text: `${emailLead(f)} with your order number and what you are returning. We’ll confirm where to send it and, for business returns, issue an RMA number.`,
      },
      {
        type: "p",
        text: "Pack items securely and keep proof of postage. Goods remain your responsibility until they reach us, so use a tracked service for anything valuable.",
      },
    ],
  },
  {
    id: "legal-contact",
    title: "Get in touch",
    blocks: [
      ...nameBlocks(f),
      ...contactBlocks(f),
      {
        type: "p",
        text: "Unhappy with how a return was handled? Tell us and we’ll review it. Consumers may also have the option of court action or an alternative dispute resolution (ADR) scheme.",
      },
    ],
  },
];
