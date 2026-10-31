// Copy shown under the product listings. The section structure and headings follow the source;
// the wording is our own, and below the top level it is generated from the catalogue data.
import { getBlogPost, getProduct } from "@/lib/cctvmaster/catalog";
import { formatGBP } from "@/lib/cctvmaster/money";
import type { Category, ProductCard } from "@/lib/cctvmaster/types";
import { CATEGORIES_WITHOUT_COPY, CATEGORY_GUIDES, CATEGORY_HEADINGS } from "./category-guides";
import { chipValues, childCategories, facetGroups, priceRange, topBrands, topCategoryOf } from "./listing-data";
import type { GuideLink, PageCopy } from "./listing-seo";

/** Copy under /products; `shopName` is the shop name from Settings. */
export const productsCopy = (shopName: string): PageCopy => ({
  heading: `${shopName}: the full range at a glance`,
  intro: [
    "Every item here is sold on its own, so you can plan a new system part by part or replace a single piece of an existing one. The shop covers **Cameras**, **Recorders** (DVR and NVR), **Storage**, **Wire & Cable**, **Connectors**, **Accessories** such as brackets and junction boxes, networking switches and routers, and an **Intrusion** range with door access and alarm hardware.",
  ],
  choose: [
    {
      label: "Camera type",
      text: "Turbo HD cameras run over coax, while IP cameras use a network cable that can also carry power (PoE). Pick the type your recorder supports.",
    },
    {
      label: "Recorder match",
      text: "a DVR pairs with Turbo HD/analogue cameras and an NVR with IP cameras. Choose a channel count above the number of cameras you plan to fit.",
    },
    {
      label: "Resolution",
      text: "more megapixels give more detail but also fill drives faster, so balance picture quality against storage.",
    },
    {
      label: "Storage",
      text: "hard drives are sold separately; size them by camera count, resolution and the number of days you want to keep.",
    },
    {
      label: "Cabling and connectors",
      text: "IP and PoE systems need Cat5e/Cat6 and RJ45 plugs, while coax systems use RG59 or shotgun cable with BNC connectors.",
    },
    {
      label: "Mounting",
      text: "check the bracket or junction box is listed for your camera model and suits the wall or pole it goes on.",
    },
  ],
  outro: "Night-time performance differs from model to model, so check each product's specification before you order.",
  faqHeading: "Frequently asked questions",
  faqs: [
    {
      q: "What's the difference between a DVR and an NVR?",
      a: "A DVR is built for coax cameras (Turbo HD and other analogue HD formats). An NVR works with IP cameras over a network and can often power them through PoE. Buy the recorder that matches your cameras.",
    },
    {
      q: "Do I need a separate hard drive for my recorder?",
      a: "Usually, yes. Most recorders are sold without a drive, so add one from the Storage range sized for how many cameras you have and how long you want to keep footage.",
    },
  ],
});

const TOP_COPY: Record<string, PageCopy> = {
  accessories: {
    intro: [
      "The parts that finish an installation: power supplies and distribution boxes, camera brackets and junction boxes, connectors and baluns, HDMI extenders, monitors and lockable cabinets for the recorder.",
    ],
    choose: [
      { label: "Power supply amperage", text: "add up the current every camera draws and leave some headroom on top." },
      {
        label: "Distribution vs single adapter",
        text: "one plug-in adapter suits a single camera; a fused distribution box is tidier for several.",
      },
      {
        label: "Mounting and junction boxes",
        text: "choose the box made for your camera's base so the cable joints stay dry.",
      },
      { label: "Monitor size and panel type", text: "match the screen to the viewing distance and the recorder's video output." },
      { label: "Extending signal", text: "HDMI extenders and baluns carry video further than a standard lead." },
    ],
    outro: "Not sure a part fits your camera or recorder? Ask us before you order.",
    faqHeading: "Accessories — frequently asked questions",
    faqs: [
      {
        q: "What size power supply do I need for my CCTV cameras?",
        a: "Add up the amps of every camera on the supply (it's on each camera's spec sheet) and pick a unit rated comfortably above the total.",
      },
    ],
  },
  cameras: {
    heading: "Cameras",
    intro: [
      "Turret, bullet and pan-tilt-zoom cameras for homes and small businesses, from 2MP up to 8MP (4K). The range includes IP models that run over a network cable and Turbo HD models that use coax.",
      "Many cameras add a white light to infrared so they can record in colour after dark, and several have a built-in microphone. Use the filters above to narrow the list by night vision, smart alerts, sound, style and connection.",
    ],
    choose: [
      {
        label: "Recording system compatibility",
        text: "IP cameras need an NVR and network cable; Turbo HD cameras need a DVR and coax. Check what you already have.",
      },
      { label: "Resolution", text: "higher resolution helps when you need to zoom into faces or number plates." },
      {
        label: "Night vision type",
        text: "infrared gives black-and-white images at night; dual-light and colour models keep colour on.",
      },
      { label: "Audio", text: "choose a model with a microphone if you want sound with the video." },
      { label: "Housing rating", text: "for outdoor mounting, look for IP66 or IP67 weather protection." },
    ],
    faqHeading: "Cameras — frequently asked questions",
    faqs: [
      {
        q: "What is the difference between PoE and TVI/AHD/CVI cameras?",
        a: "PoE cameras are IP cameras: one network cable carries power and video to an NVR. TVI, AHD and CVI cameras send HD video over coax to a DVR.",
      },
      {
        q: "Do these cameras record in colour at night?",
        a: "Models listed with colour night vision or colour on motion can. Infrared-only models switch to black and white in the dark.",
      },
      {
        q: "Which cameras have a built-in microphone?",
        a: "Use the Sound filter: it shows the cameras with a built-in mic or two-way audio.",
      },
    ],
  },
  "data-comm-networking": {
    intro: [
      "Network gear for CCTV: PoE switches that power IP cameras, plus routers, extenders and adapters that link the recorder to the rest of the network.",
      "A PoE switch is the simplest way to add cameras beyond the ports on the back of an NVR.",
    ],
    choose: [
      { label: "PoE or not", text: "PoE ports power the cameras through the data cable, so no separate supply is needed." },
      { label: "Speed", text: "gigabit ports leave headroom when many high-resolution cameras share one uplink." },
      { label: "Port count", text: "plan one port per camera plus an uplink, and leave a spare or two." },
      { label: "PoE reach", text: "standard Ethernet reaches 100m; extenders can take a run further." },
      { label: "Mounting", text: "desktop units suit a shelf; rack-mount switches go in a cabinet." },
      { label: "Mobile connectivity", text: "a 4G router gives remote viewing on sites without broadband." },
    ],
    faqHeading: "Data Comm & Networking — frequently asked questions",
    faqs: [
      {
        q: "Do I need a PoE switch for my CCTV cameras?",
        a: "Only if your recorder hasn't enough PoE ports for every camera, or the cameras are far from it. Otherwise plug them straight into the NVR.",
      },
      {
        q: "What's the difference between Fast Ethernet and Gigabit switches?",
        a: "Fast Ethernet ports run at up to 100Mbps and Gigabit ports at up to 1,000Mbps. Gigabit is the safer choice for larger or 4K systems.",
      },
    ],
  },
  intrusion: {
    intro: [
      "Door access and intrusion hardware to sit alongside CCTV: magnetic locks, keypads and fob readers, exit buttons, face-recognition terminals, video intercoms and wireless alarm detectors.",
    ],
    choose: [
      { label: "Holding force", text: "heavier or busier doors need a maglock with a higher kg rating." },
      { label: "Voltage", text: "check the lock and controller run on the same supply, usually 12V DC." },
      { label: "Indoor vs outdoor", text: "external doors and gates need weatherproof locks and readers." },
      { label: "Credential type", text: "choose between PIN, RFID fob or card, fingerprint and face recognition." },
      { label: "Exit method", text: "pair every locked door with a push-to-exit or no-touch button." },
    ],
    outro: "Check fire-safety rules before fitting a lock to an escape route.",
    faqHeading: "Intrusion — frequently asked questions",
    faqs: [
      {
        q: "What size maglock do I need?",
        a: "Go by the door: light internal doors are fine with a smaller lock, while heavy or external doors need a stronger rating.",
      },
      {
        q: "Can I use a maglock on an outside gate?",
        a: "Yes, if the lock is rated for outdoor use and the gate closes squarely against the plate.",
      },
      {
        q: "What's the difference between the RFID fobs on offer?",
        a: "They run at different frequencies, 125kHz or 13.56MHz, and must match the reader you fit.",
      },
    ],
  },
  recorders: {
    heading: "What are CCTV recorders?",
    intro: [
      "A recorder stores the footage from every camera and lets you watch live or play back from the app. DVRs work with coax cameras; NVRs work with IP cameras over the network.",
    ],
    choose: [
      { label: "Match recorder type to your cameras", text: "DVR for Turbo HD/analogue, NVR for IP." },
      { label: "Check channel count", text: "every camera needs a channel, so leave room to add more later." },
      { label: "Hybrid flexibility", text: "many DVRs can also take a few IP cameras alongside coax ones." },
      { label: "Look for PoC support", text: "Power over Coax runs camera power down the video cable." },
      { label: "AI features vary", text: "AcuSense-type models alert only on people and vehicles." },
      { label: "Resolution support", text: "make sure the recorder handles your cameras' megapixels." },
    ],
    faqHeading: "Recorders — frequently asked questions",
    faqs: [
      {
        q: "What's the difference between an NVR and a DVR?",
        a: "An NVR records IP cameras over a network; a DVR records coax cameras. The cameras decide which one you need.",
      },
      {
        q: "Can I mix analogue and IP cameras on one recorder?",
        a: "Hybrid DVRs accept some IP channels alongside coax ones. Check the IP channel count in the specification.",
      },
    ],
  },
  storage: {
    intro: [
      "Hard drives and memory cards for CCTV recorders and cameras, from 500GB up to 18TB, including surveillance drives designed to write footage around the clock.",
      "The right size depends on how many cameras you run, their resolution and how many days of recording you want to keep.",
    ],
    choose: [
      { label: "Capacity", text: "more cameras, higher resolution or longer retention all need more terabytes." },
      { label: "Drive type", text: "surveillance drives are made for non-stop writing; desktop drives are not." },
      { label: "Form factor", text: "recorders take 3.5-inch SATA drives; cameras take microSD cards." },
      { label: "Recording style", text: "motion-only recording uses far less space than continuous recording." },
    ],
    outro: "Use the CCTV storage calculator to estimate the size you need.",
    faqHeading: "Storage — frequently asked questions",
    faqs: [
      {
        q: "What size hard drive do I need for CCTV?",
        a: "Work it out from camera count, resolution and the days you want to keep. A small home system often fits on 1–4TB; larger or 4K systems need more.",
      },
      {
        q: "Can I use a normal PC hard drive in my DVR or NVR?",
        a: "It will work, but a surveillance drive is built for 24/7 writing and usually lasts longer in a recorder.",
      },
      {
        q: "What's the difference between the hard drives and the microSD card?",
        a: "Hard drives go inside the recorder and hold the whole system's footage. A microSD card fits in a single camera as local backup.",
      },
    ],
  },
  "wire-cable": {
    intro: [
      "Cable for every kind of CCTV run: Cat5e, Cat6 and Cat6A for IP and PoE cameras, RG59 and shotgun cable for coax systems, plus patch leads, splitters and power leads.",
    ],
    choose: [
      { label: "Cable type", text: "network cable for IP cameras, coax for Turbo HD/analogue." },
      { label: "Indoor vs outdoor", text: "external runs need UV-stable, weatherproof sheathing." },
      { label: "Solid copper vs CCA", text: "pure copper carries PoE power further than copper-clad aluminium." },
      { label: "Length", text: "measure the route with spare for drops and terminations." },
      { label: "Power splitters", text: "split one supply between several cameras close to each other." },
      { label: "Analogue setups", text: "shotgun cable carries video and power in one pull." },
    ],
    outro: "Measure each run before ordering so a single reel covers it without joints.",
    faqHeading: "Wire & Cable — frequently asked questions",
    faqs: [
      {
        q: "What's the difference between Cat5e and Cat6 cable?",
        a: "Both carry PoE and HD camera streams. Cat6 is built to a higher specification for faster networks; Cat5e is plenty for most CCTV runs.",
      },
      {
        q: "Can I use indoor cable outdoors?",
        a: "Avoid it: indoor sheathing breaks down in sunlight and damp. Use cable sold as external grade.",
      },
    ],
  },
  others: {
    heading: 'What\'s in the "Others" range',
    intro: [
      "Things that don't fit a CCTV category but are useful on site or in the office: packing supplies, tools and hardware, magnets, printer ink and supplies, smart-home gadgets and a few food and drink lines.",
      "Browse by type with the chips above or search for a specific item.",
    ],
    choose: [
      { label: "Access control", text: "door hardware is also listed under Intrusion." },
      { label: "Smart accessories", text: "check the app and Wi-Fi band each IoT device needs." },
      { label: "Lighting", text: "compare brightness and fitting before you order." },
      { label: "Computing", text: "make sure the connector types match your devices." },
      { label: "Office supplies", text: "printer ink is listed by printer model." },
      { label: "Plumbing and tools", text: "match the size or fitting to the job." },
    ],
    outro: "Can't find something? Ask us and we'll check what we can source.",
    faqHeading: "Others — frequently asked questions",
    faqs: [
      {
        q: "Is the magnetic lock strong enough for an external door?",
        a: "Check the holding force and weather rating on the product page and compare them with your door.",
      },
      {
        q: "Will the WiFi roller shutter receiver work with my existing shutter motor?",
        a: "It depends on the motor's wiring and voltage. Check the product's specification, or ask us before you buy.",
      },
    ],
  },
};

const list = (items: string[]) =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Copy for a category page: hand-written at the top level, generated from the products below it. */
export function categoryCopy(category: Category, name: string, cards: ProductCard[]): PageCopy | undefined {
  if (TOP_COPY[category.slug]) return TOP_COPY[category.slug];
  if (CATEGORIES_WITHOUT_COPY.has(category.slug) || !cards.length) return undefined;
  const top = topCategoryOf(category)?.name ?? "shop";
  const brands = topBrands(cards);
  const prices = priceRange(cards);
  const inStock = cards.filter((c) => getProduct(c.slug)?.availability !== "BackOrder").length;

  const intro = [
    `Here you'll find **${count(cards.length, "product")}** from our ${top} range listed under ${name}` +
      (brands.length ? `, with stock from ${list(brands)}.` : ".") +
      (prices
        ? prices.min === prices.max
          ? ` The price is ${formatGBP(prices.min)} including VAT.`
          : ` Prices run from ${formatGBP(prices.min)} to ${formatGBP(prices.max)} including VAT.`
        : ""),
  ];

  const choose: PageCopy["choose"] = [];
  const kids = childCategories(category.slug);
  if (kids.length > 1) choose.push({ label: "Type", text: list(kids.map((k) => `${k.name} (${k.count})`)) + "." });
  for (const group of facetGroups(cards, {})) {
    choose.push({
      label: group.label,
      text: list(group.options.map((o) => `${o.label.toLowerCase()} on ${count(o.count, "model")}`)) + ".",
    });
  }
  const chipKeys = new Map<string, string>();
  for (const card of cards) for (const chip of card.decide?.chips ?? []) chipKeys.set(chip.key, chip.label);
  if (!facetGroupsShown(cards)) {
    for (const [key, label] of chipKeys) {
      const values = chipValues(cards, key, 4);
      if (values.length) choose.push({ label, text: list(values.map(([v, n]) => `${v} (${n})`)) + "." });
      if (choose.length >= 5) break;
    }
  }
  if (prices && prices.min !== prices.max)
    choose.push({ label: "Budget", text: `from ${formatGBP(prices.min)} up to ${formatGBP(prices.max)} inc. VAT.` });
  choose.push({
    label: "Availability",
    text: inStock === cards.length ? "every item here is listed as available." : `${inStock} of ${cards.length} are listed as available.`,
  });

  const faqs: PageCopy["faqs"] = [
    {
      q: `How many ${name} products do you sell?`,
      a: `${count(cards.length, "product")} at the moment, ${inStock} of them listed as available to order now.`,
    },
  ];
  if (prices)
    faqs.push({
      q: `How much do ${name} products cost?`,
      a:
        prices.min === prices.max
          ? `${formatGBP(prices.min)} including VAT.`
          : `From ${formatGBP(prices.min)} to ${formatGBP(prices.max)} including VAT; sort the list to compare.`,
    });
  if (brands.length)
    faqs.push({ q: `Which brands are in this range?`, a: `Mainly ${list(brands)}; open a product to see its full specification.` });

  return {
    heading: CATEGORY_HEADINGS[category.slug],
    intro,
    choose,
    outro: "Not sure which one fits your system? Our UK team can check compatibility before you order.",
    faqHeading: `${name} — frequently asked questions`,
    faqs,
  };
}

const facetGroupsShown = (cards: ProductCard[]) => facetGroups(cards, {}).length > 0;

/** Blog posts the source links as "Related guides" for a category. */
export function categoryGuides(slug: string): GuideLink[] {
  return (CATEGORY_GUIDES[slug] ?? [])
    .map((s) => getBlogPost(s))
    .filter((p) => !!p)
    .map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt }));
}
