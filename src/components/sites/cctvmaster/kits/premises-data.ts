// Content for /business-cctv-systems, /cctv-for and /cctv-for/[slug].
// Headings, band titles, questions and link labels follow the source; the explanatory copy is our own short summary.

export interface PremisesBand {
  cameras: number;
  title: string;
  blurb: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface LinkItem {
  label: string;
  href: string;
}

export interface PremisesGuide {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  /** Hub card: camera range, one-line summary and a practical tip. */
  range: string;
  summary: string;
  tip: string;
  bands: PremisesBand[];
  guideHeading: string;
  guide: string[];
  faqs: Faq[];
  keepReading: LinkItem[];
  buildLabel?: string;
}

export const BUSINESS = {
  title: "Business CCTV systems for UK shops, offices and warehouses",
  metaTitle: "Business CCTV Systems: Kits Sized to Your Shop or Office",
  metaDescription:
    "Hikvision and Dahua CCTV kits for businesses, each bundling compatible cameras, recorder, hard drive and cabling for shops, offices and warehouses.",
  intro:
    "Ready-made systems with the cameras, recorder, hard drive and cabling chosen to work together, grouped by the size of site they suit. Pick a band below, or let the finder narrow it down for you.",
  bands: [
    {
      cameras: 4,
      title: "Small shop, café or office",
      blurb: "Enough for the door, the counter, the back room and the rear exit, recorded on one drive.",
    },
    {
      cameras: 8,
      title: "Retail unit, restaurant or clinic",
      blurb: "Room for every entrance, the main floor, the car park and an office, with channels left for later.",
    },
    {
      cameras: 16,
      title: "Warehouse, yard or multi-floor site",
      blurb: "For loading bays, long boundaries and internal routes, where the drive size matters as much as the cameras.",
    },
  ] satisfies PremisesBand[],
  guideHeading: "How to size a CCTV system for a business",
  guideSections: [
    {
      heading: "",
      body: "List the places you need to see — doors, tills, stock, the yard — and count one camera per view. Floor area tells you very little; the number of ways in tells you a lot.",
    },
    {
      heading: "Cameras: resolution and night performance",
      body: "4MP is enough to recognise someone at a door; 4K lets you zoom into a wide shot afterwards. How a camera copes after dark usually matters more than its megapixels, so look for colour night vision or a good infrared range.",
    },
    {
      heading: "Recorder and storage: how long you keep footage",
      body: "Choose a recorder with a few more channels than you need today. The drive decides how many days you keep: more cameras or higher resolution means fewer days on the same disk.",
      link: { pre: "Work out the drive size with our", label: "storage calculator", href: "/tools/cctv-storage-calculator" },
    },
    {
      heading: "The legal side: signage, purpose and retention",
      body: "Business CCTV falls under UK data-protection law. Put up signs, write down why you record and how long you keep it, and only keep footage as long as that reason needs.",
      link: { pre: "For the detail, read the", label: "ICO's video surveillance guidance", href: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/cctv-and-video-surveillance/" },
    },
    {
      heading: "PoE IP or Turbo HD?",
      body: "On a new site, network (PoE) cameras need one cable each and give the most flexibility. If coax is already in the walls from an old system, a Turbo HD kit reuses it and saves the rewiring.",
    },
    {
      heading: "What happens after you order",
      body: "Kits ship from UK stock with the cables and power they need. If you would like the system checked first, send us a list of views and we will confirm the parts before you pay.",
      link: { pre: "Buying regularly? See our", label: "business and trade accounts", href: "/trade" },
    },
  ],
  faqs: [
    {
      q: "What is the best CCTV system for a business?",
      a: "For most sites a PoE network kit with 4MP or 4K cameras is a safe default. If you are replacing an older coax system, a Turbo HD kit keeps the existing cable.",
    },
    {
      q: "How much does CCTV cost for a business?",
      a: "It depends on the number of cameras, their resolution, how many days you keep and who fits it. Every kit card shows its full price including VAT.",
    },
    {
      q: "Can an employer legally watch staff on CCTV in the UK?",
      a: "Only for a clear, documented reason such as security, with staff told beforehand and signs on display. Avoid private areas entirely.",
    },
    {
      q: "Which CCTV camera is best for commercial use?",
      a: "Turrets are the all-rounder; bullets suit long views; motorised PTZ cameras are for large open areas someone actively watches.",
    },
    {
      q: "How long should a business keep CCTV footage?",
      a: "There is no fixed legal period — keep it as long as your stated purpose needs. Many businesses settle on around a month.",
    },
    {
      q: "Do I need a professional installer, or can I fit a kit myself?",
      a: "A PoE kit is a reasonable DIY job if you can run cable and fix brackets. Larger or multi-building sites are usually worth an installer.",
    },
  ] satisfies Faq[],
  keepReading: [
    { label: "CCTV by premises type — shops, warehouses, offices, sites, schools, pubs and farms", href: "/cctv-for" },
    { label: "How many cameras a small business needs — the sizing guide", href: "/blog/best-small-business-cctv-system-uk" },
    { label: "All CCTV kits", href: "/kits" },
    { label: "NVRs and DVRs", href: "/categories/recorders" },
    { label: "Security cameras", href: "/categories/cameras" },
  ] satisfies LinkItem[],
};

export const HUB = {
  title: "CCTV by premises type",
  metaTitle: "CCTV by Premises Type: UK Sector Guides",
  metaDescription:
    "CCTV guides by type of premises — shops, offices, warehouses, schools, farms, pubs and building sites — with suggested kits for each.",
  intro:
    "The building decides how many cameras you need, not the budget. Each guide below suggests a camera count for that kind of site and shows ready-made kits that fit it.",
  closingHeading: "Choosing the guide that fits your site",
  closing: [
    "Start with the guide closest to your premises; the camera counts and kit bands carry over well to similar sites.",
    "Not listed — a garage, a care home, a church? Use the nearest match, or read the general advice on",
  ],
  keepReading: [
    { label: "Business CCTV systems", href: "/business-cctv-systems" },
    { label: "All CCTV kits", href: "/kits" },
    { label: "Build a system for your site", href: "/kit-builder/cctv" },
    { label: "CCTV storage calculator", href: "/tools/cctv-storage-calculator" },
  ] satisfies LinkItem[],
};

const BUSINESS_LINK = { label: "Business CCTV systems", href: "/business-cctv-systems" };

export const GUIDES: PremisesGuide[] = [
  {
    slug: "shops",
    title: "CCTV for shops and retail units",
    metaTitle: "CCTV for Shops: Retail Camera Kits & Rules",
    metaDescription:
      "CCTV kits for retail: till, entrance, stockroom & rear exit. 4-camera systems in stock. London shop or UK delivery. ICO-compliant.",
    intro:
      "Most single shops need four views: the till, the front door, the stockroom and the back exit. Below are kits sized for that, plus a larger band for bigger units.",
    range: "4 and 8 cameras",
    summary: "Where the till, door and stockroom cameras go, and the rules on signs and staff.",
    tip: "Aim the till camera at the customer's side of the counter, not straight down from the ceiling.",
    bands: [
      { cameras: 4, title: "Single unit: till, door, stockroom, rear exit", blurb: "One camera for each of the four places a small shop most needs to see." },
      { cameras: 8, title: "Aisles, delivery bay and back office", blurb: "Adds the shop floor, deliveries and the office once the unit grows." },
    ],
    guideHeading: "How to cover a shop with CCTV",
    guide: [
      "Plan by views rather than square metres. A small shop is usually covered by four cameras; larger units add aisles, the delivery door and the office.",
      "Point the entrance camera into the shop so faces are lit from the front rather than silhouetted against the window.",
      "If an old coax system is already wired in, a Turbo HD kit can reuse that cable and save a lot of disruption.",
      "Never put cameras in changing rooms or toilets, and tell staff about the system before it goes live.",
    ],
    faqs: [
      { q: "How many CCTV cameras does a small shop need?", a: "Four covers most single units: till, door, stockroom and rear exit. Add more for extra entrances or a yard." },
      { q: "Can I put a CCTV camera in a fitting room?", a: "No. Changing rooms are private areas and must not be recorded." },
      { q: "Do I have to register with the ICO for CCTV in my shop?", a: "If the cameras record identifiable people for your business, you will normally need to pay the data protection fee. Check the ICO's self-assessment." },
      { q: "Should a shop buy Turbo HD or IP?", a: "Reuse existing coax with Turbo HD; on a fresh fit-out, choose IP (PoE) for one cable per camera." },
      { q: "How long should a shop keep CCTV footage?", a: "As long as your stated purpose needs — often around 30 days. Each kit card shows roughly how many days it keeps." },
      { q: "Where exactly should the till camera go?", a: "Facing the customer side of the counter at head height, so you capture the face, the hands and the transaction." },
    ],
    keepReading: [
      { label: "4-camera CCTV kits", href: "/categories/4-camera-kits" },
      { label: "8-camera CCTV kits", href: "/categories/8-camera-kits" },
      { label: "Turbo HD (coax) kits", href: "/categories/turbo-hd-kits" },
      { label: "Security cameras", href: "/categories/cameras" },
      { label: "CCTV storage calculator", href: "/tools/cctv-storage-calculator" },
      { label: "CCTV lens calculator", href: "/tools/cctv-lens-calculator" },
      { label: "How many cameras a small business needs", href: "/blog/best-small-business-cctv-system-uk" },
      BUSINESS_LINK,
      { label: "Build a system for your shop", href: "/kit-builder/cctv" },
      { label: "Open a business account", href: "/trade" },
    ],
  },
  {
    slug: "warehouses",
    title: "CCTV for warehouses and distribution units",
    metaTitle: "Warehouse CCTV Kits UK: 8-32 Cameras, Sized by Storage",
    metaDescription:
      "Warehouse CCTV kits from 8 to 32 cameras with 2TB–20TB of storage, planned around loading docks, aisles and yards.",
    intro:
      "Warehouses are sized by docks, aisles and the yard. These bands go from a single-bay unit up to a multi-building site, with storage in mind as the camera count rises.",
    range: "8, 16 and 32 cameras",
    summary: "Docks, aisles and yard: how many channels a unit needs and why storage sets the limit.",
    tip: "Doubling the cameras on the same drive roughly halves the days of footage you keep.",
    bands: [
      { cameras: 8, title: "Single-bay unit: dock, goods-in, aisles, yard gate", blurb: "Covers the loading door, goods-in, the main aisles and the gate." },
      { cameras: 16, title: "Multiple docks, mezzanine, yard perimeter", blurb: "For several docks, a mezzanine and the fence line around the yard." },
      { cameras: 32, title: "Distribution centre or multi-building site", blurb: "Large sites with several buildings or long perimeters on one recorder." },
    ],
    guideHeading: "How to size and place warehouse CCTV",
    guide: [
      "Count the docks, the aisle ends, the gate and the yard rather than the floor area.",
      "Racking aisles are long and narrow, so a longer lens or a bullet camera usually works better than a wide turret.",
      "Storage is often the real limit on large systems — check the days figure on each kit before you buy.",
    ],
    faqs: [
      { q: "How many cameras does a warehouse need?", a: "Eight suits a small unit; sixteen or more for several docks, a mezzanine or a large yard." },
      { q: "Why won't my 32-camera system keep a month of footage?", a: "Every extra camera shares the same drive. Add storage or lower the recording quality to keep more days." },
      { q: "How high should warehouse cameras be mounted?", a: "High enough to be out of reach, but low enough that faces are still visible — usually around 3–4 m at doors." },
      { q: "What lens do I need for a racking aisle?", a: "A narrower field of view than usual; the lens calculator helps you pick one for the aisle length." },
      { q: "IP or Turbo HD for a warehouse?", a: "IP (PoE) suits new installs and long runs with switches; Turbo HD is handy where coax is already installed." },
      { q: "Will I need a PoE switch as well?", a: "Only if you have more cameras than the recorder has PoE ports, or the runs are too long for one cable." },
    ],
    keepReading: [
      { label: "8-camera CCTV kits", href: "/categories/8-camera-kits" },
      { label: "16-camera CCTV kits", href: "/categories/16-camera-kits" },
      { label: "32-camera CCTV kits", href: "/kits?cameras=32" },
      { label: "IP / PoE kits", href: "/categories/ip-poe-kits" },
      { label: "NVRs and DVRs", href: "/categories/recorders" },
      { label: "Hard drives and storage", href: "/categories/storage" },
      { label: "CCTV storage calculator", href: "/tools/cctv-storage-calculator" },
      { label: "CCTV lens calculator", href: "/tools/cctv-lens-calculator" },
      { label: "Dahua 16-port managed PoE switch", href: "/products/dahua-pfs4218-16et-240-desktop-16-port-managed-2-layer-poe-switch-16" },
      { label: "Hikvision 16-channel 8 MP AcuSense DVR", href: "/products/hikvision-16-ch-8-mp-1u-h-265-acusense-dvr" },
      BUSINESS_LINK,
    ],
  },
  {
    slug: "offices",
    title: "CCTV for offices and business premises",
    metaTitle: "CCTV for Offices: Camera Kits & UK Monitoring Rules",
    metaDescription:
      "Office CCTV kits, typically four cameras, with notes on placement, areas to avoid filming and informing employees before you start recording.",
    intro:
      "An office usually needs fewer cameras than a shop, but more care over privacy. Four views cover most single-floor offices; larger buildings move up to eight.",
    range: "4 and 8 cameras",
    summary: "Entrance, reception, server room and car park — and what to tell staff first.",
    tip: "Cover doors and shared spaces rather than desks; it is easier to justify and to explain to staff.",
    bands: [
      { cameras: 4, title: "Single-floor office: entrance, reception, comms room, car park", blurb: "The four views most single-floor offices need." },
      { cameras: 8, title: "Multi-floor or multi-tenant: fire exits, lift lobby, post door", blurb: "Adds exits, lobbies and further floors in larger or shared buildings." },
    ],
    guideHeading: "How to cover an office with CCTV",
    guide: [
      "Start with the ways in: the main door, reception, any side or fire exits and the car park.",
      "Keep cameras away from desks, meeting rooms and break areas unless you have a strong, documented reason.",
      "Indoor cameras rarely need more than 4MP; spend the difference on a bigger drive if you need longer retention.",
    ],
    faqs: [
      { q: "Can I legally use CCTV to monitor staff in an office?", a: "Only with a clear purpose, after telling staff, and never in private areas. Continuous monitoring of desks is hard to justify." },
      { q: "How many cameras does an office need?", a: "Four for a typical single floor; around eight for several floors or shared entrances." },
      { q: "Do I need a DPIA for office CCTV?", a: "If cameras could capture staff routinely, carrying out a data protection impact assessment is good practice and often expected." },
      { q: "Should office cameras record audio?", a: "Usually not — recording conversations is far more intrusive and rarely justified." },
      { q: "Who is responsible for CCTV in a shared lobby?", a: "Whoever operates the cameras. In a multi-tenant building that is often the landlord or managing agent." },
      { q: "What resolution for indoor office cameras?", a: "2MP–4MP is plenty for corridors and doors at short range." },
    ],
    keepReading: [
      { label: "4-camera CCTV kits", href: "/categories/4-camera-kits" },
      { label: "8-camera CCTV kits", href: "/categories/8-camera-kits" },
      { label: "4 MP kits", href: "/categories/4mp-kits" },
      { label: "IP / PoE kits", href: "/categories/ip-poe-kits" },
      { label: "Security cameras", href: "/categories/cameras" },
      { label: "NVRs and DVRs", href: "/categories/recorders" },
      { label: "CCTV storage calculator", href: "/tools/cctv-storage-calculator" },
      BUSINESS_LINK,
      { label: "Open a business account", href: "/trade" },
    ],
  },
  {
    slug: "construction-sites",
    title: "CCTV for construction sites and compounds",
    metaTitle: "Construction Site CCTV: Kits, Cameras & Setup Guide",
    metaDescription:
      "Fixed CCTV kits for construction site compounds and cabins: gate, plant and material store cameras, tamper-resistant recorders and 4G viewing without broadband.",
    intro:
      "For a compound with mains power and months left on the job, a fixed kit is often better value than hiring. These bands cover the gate, plant, stores and cabins.",
    range: "4 and 8 cameras",
    summary: "Gate, plant, stores and cabin on a powered compound, with remote viewing over 4G.",
    tip: "Short jobs without power suit a hired tower; long jobs with mains power usually suit a bought kit.",
    bands: [
      { cameras: 4, title: "Compound: gate, plant park, material store, cabin door", blurb: "Watches the gate, the plant, the material store and the cabin." },
      { cameras: 8, title: "Adds fuel bowser, scaffold face, welfare unit, second gate", blurb: "For bigger compounds with fuel, scaffolding, welfare cabins and a second entrance." },
    ],
    guideHeading: "How to set up CCTV on a construction compound",
    guide: [
      "Put the recorder in a locked box inside a cabin so it can't be taken with the evidence.",
      "Cameras with a built-in light and siren help deter people as well as record them.",
      "Without broadband, a 4G router lets you check the cameras from your phone.",
    ],
    faqs: [
      { q: "Should I buy a fixed CCTV system or hire a tower?", a: "Hire for short jobs without power; buy for longer jobs where mains power is available." },
      { q: "How do I view site cameras with no broadband?", a: "Connect the recorder to a 4G router with a data SIM." },
      { q: "How do I stop the recorder being stolen?", a: "Lock it in a steel box, inside a locked cabin, out of sight." },
      { q: "Which cameras deter rather than just record?", a: "Models with a built-in light and siren that trigger when someone is detected." },
      { q: "Do I need CCTV signs on a construction site?", a: "Yes — signs are expected wherever you record people, and they help deter intruders too." },
      { q: "What IP rating do site cameras need?", a: "Outdoor cameras should be at least IP66/IP67 to cope with rain and dust." },
    ],
    keepReading: [
      { label: "4-camera CCTV kits", href: "/categories/4-camera-kits" },
      { label: "8-camera CCTV kits", href: "/categories/8-camera-kits" },
      { label: "Turbo HD (coax) kits", href: "/categories/turbo-hd-kits" },
      { label: "Hikvision 3K ColorVu PIR siren turret", href: "/products/hikvision-3k-colorvu-pir-siren-fixed-turret-camera" },
      { label: "4G LTE router for a site with no broadband", href: "/products/wireless-4g-lte-wifi-router-150mbps-sim-card-usb-modem-hotspot" },
      { label: "Lockable DVR security box (270 x 210 mm)", href: "/products/lock-box-wall-mount-enclosure-27-21-5cm-black" },
      { label: "NVRs and DVRs", href: "/categories/recorders" },
      BUSINESS_LINK,
      { label: "Ask us to size it", href: "/contact" },
    ],
  },
  {
    slug: "schools",
    title: "CCTV for schools, academies and colleges",
    metaTitle: "School CCTV Packages UK: Camera Counts and GDPR Rules",
    metaDescription:
      "CCTV kits for primary and secondary schools, roughly 8 to 16 cameras, with a summary of the data-protection paperwork and signage involved.",
    intro:
      "Schools are most at risk when they are empty, so plan from the gates and fences inwards. Eight cameras suit a small primary; sixteen suit a secondary.",
    range: "8 and 16 cameras",
    summary: "Gates, reception, bike and bin stores, with the paperwork a school needs.",
    tip: "Write your retention period into the CCTV policy and make sure you can justify it.",
    bands: [
      { cameras: 8, title: "Small primary: gate, reception, bike shed, bin store, playground", blurb: "Covers the main gate, reception, bikes, bins and the playground." },
      { cameras: 16, title: "Secondary: sports hall, MUGA, several gates, delivery yard", blurb: "For larger sites with sports areas, more gates and a delivery yard." },
    ],
    guideHeading: "How to design school CCTV",
    guide: [
      "Work from the outside in: gates, fences, roofs and stores first, then entrances and reception.",
      "Avoid classrooms, toilets and changing areas.",
      "Involve your data protection officer early and record the decisions in a DPIA.",
    ],
    faqs: [
      { q: "Is CCTV allowed in schools?", a: "Yes, for clear purposes like security and safeguarding, with signs and a written policy." },
      { q: "Does a school need a DPO for its CCTV?", a: "Schools are public authorities, so they should already have a data protection officer, who should be involved." },
      { q: "How many cameras does a school need?", a: "Around eight for a small primary and sixteen for a typical secondary." },
      { q: "How long can a school keep CCTV footage?", a: "As long as the purpose in its policy justifies; there is no single statutory figure." },
      { q: "Do we need a DPIA for school CCTV?", a: "It is strongly recommended, as cameras may capture children and staff." },
      { q: "Can we put cameras in classrooms?", a: "Rarely justified — focus on entrances, the perimeter and stores instead." },
    ],
    keepReading: [
      { label: "8-camera CCTV kits", href: "/categories/8-camera-kits" },
      { label: "16-camera CCTV kits", href: "/categories/16-camera-kits" },
      { label: "IP / PoE kits", href: "/categories/ip-poe-kits" },
      { label: "4K kits", href: "/categories/4k-kits" },
      { label: "Security cameras", href: "/categories/cameras" },
      { label: "CCTV storage calculator", href: "/tools/cctv-storage-calculator" },
      BUSINESS_LINK,
      { label: "Ask us to size it", href: "/contact" },
      { label: "Open a business account", href: "/trade" },
    ],
  },
  {
    slug: "restaurants-and-pubs",
    title: "CCTV for restaurants, pubs and bars",
    metaTitle: "CCTV for Restaurants, Pubs & Bars: Kits & Coverage",
    metaDescription:
      "CCTV kits for pubs, bars and restaurants, with suggested camera positions and a reminder to check any recording conditions in your licence.",
    intro:
      "Licensed premises need to see the till and the room. Four cameras cover the essentials; eight add outside areas, the pass and a second bar.",
    range: "4 and 8 cameras",
    summary: "Till, bar, cellar and garden — and the retention your licence may set.",
    tip: "Check your premises licence: it may set how many days of footage you must keep.",
    bands: [
      { cameras: 4, title: "Till and back bar, front door, cellar access, delivery door", blurb: "The minimum most licensed premises need." },
      { cameras: 8, title: "Adds the pass, beer garden, car park, second bar", blurb: "For bigger venues with outdoor areas and more than one bar." },
    ],
    guideHeading: "How to cover licensed premises with CCTV",
    guide: [
      "Cover the till and back bar, every public entrance, the cellar and the delivery door.",
      "Licence conditions sometimes set a minimum retention — choose a drive that meets it with the cameras you plan to run.",
      "Outdoor drinking areas and the car park are common trouble spots worth a camera each.",
    ],
    faqs: [
      { q: "Is CCTV a legal requirement for a pub?", a: "Not in general, but your premises licence may require it — check its conditions." },
      { q: "How long must a pub keep CCTV footage?", a: "Whatever your licence states; commonly a few weeks." },
      { q: "Where do the cameras go in a bar?", a: "Till, back bar, entrances, cellar and any outdoor area." },
      { q: "Can I put a camera in the kitchen?", a: "Yes, for safety and security, as long as staff are told." },
      { q: "Can I record audio in the bar?", a: "It is rarely justified and is much more intrusive than video." },
      { q: "What about the beer garden and smoking area?", a: "Worth covering — they are often where incidents start." },
    ],
    keepReading: [
      { label: "4-camera CCTV kits", href: "/categories/4-camera-kits" },
      { label: "8-camera CCTV kits", href: "/categories/8-camera-kits" },
      { label: "Hard drives and storage", href: "/categories/storage" },
      { label: "NVRs and DVRs", href: "/categories/recorders" },
      { label: "Turbo HD (coax) kits", href: "/categories/turbo-hd-kits" },
      { label: "CCTV storage calculator", href: "/tools/cctv-storage-calculator" },
      BUSINESS_LINK,
      { label: "Ask us to size it", href: "/contact" },
    ],
  },
  {
    slug: "farms",
    title: "CCTV for farms and rural property",
    metaTitle: "CCTV Cameras for Farms: Yard, Barn & Gate Kits",
    metaDescription:
      "Wired PoE CCTV kits for farm yards, barns and gates, built to cover 100m+ runs with AcuSense night filtering; 8 and 16-camera sets holding 2TB–20TB storage.",
    intro:
      "Farms spread out over long distances, so cabling, power and night-time false alarms shape the design. Eight cameras cover one yard; sixteen cover outlying buildings.",
    range: "8 and 16 cameras",
    summary: "Gate, sheds, fuel and outbuildings over long distances.",
    tip: "A network cable run tops out at about 100 m — plan switches or fibre for anything further.",
    bands: [
      { cameras: 8, title: "Single-yard holding: gate, machinery shed, fuel, stores", blurb: "Covers the road gate, machinery, fuel and stores around one yard." },
      { cameras: 16, title: "Outlying buildings, second yard, livestock housing", blurb: "For holdings with more buildings and longer distances between them." },
    ],
    guideHeading: "How to cover a farm with CCTV",
    guide: [
      "Map the cable routes first; distances between buildings decide where switches and recorders go.",
      "Cameras that can tell people and vehicles apart cut down false alerts from animals at night.",
      "If the broadband is poor, a 4G router can carry remote viewing.",
    ],
    faqs: [
      { q: "How do I get a camera 250 m from the house?", a: "Use a PoE switch part-way, a fibre link, or a second recorder in the outbuilding." },
      { q: "How many cameras does a farm need?", a: "About eight for one yard; sixteen once there are outlying buildings." },
      { q: "How do I stop false alarms at night?", a: "Choose cameras with person and vehicle detection, and set detection areas carefully." },
      { q: "What's the PoE budget for eight farm cameras?", a: "Add up each camera's power draw and make sure the recorder or switch can supply it with some to spare." },
      { q: "Can I view the cameras if the broadband is poor?", a: "Yes — a 4G router or lower-quality remote streams help." },
      { q: "What IP rating and mounting for livestock buildings?", a: "IP67 cameras, mounted out of reach and protected from washing down." },
    ],
    keepReading: [
      { label: "8-camera CCTV kits", href: "/categories/8-camera-kits" },
      { label: "16-camera CCTV kits", href: "/categories/16-camera-kits" },
      { label: "IP / PoE kits", href: "/categories/ip-poe-kits" },
      { label: "Hikvision 9-port long-range PoE switch", href: "/products/hikvision-ds-3e0109p-e-m-9-port-poe-switch-8-poe-100mbps-long-range" },
      { label: "4G LTE router for poor broadband", href: "/products/wireless-4g-lte-wifi-router-150mbps-sim-card-usb-modem-hotspot" },
      { label: "PoE voltage drop calculator", href: "/tools/poe-voltage-drop-calculator" },
      { label: "CCTV storage calculator", href: "/tools/cctv-storage-calculator" },
      { label: "NVRs and DVRs", href: "/categories/recorders" },
      BUSINESS_LINK,
    ],
  },
  {
    slug: "homes",
    title: "Home CCTV systems by house type",
    metaTitle: "Home CCTV Systems UK: How Many Cameras You Need",
    metaDescription:
      "Ready-made home CCTV kits for UK flats and houses, with typical camera counts per property type, where to mount them, drive sizes and the privacy rules to follow.",
    intro:
      "Count the ways into your home rather than the rooms. Flats and terraces usually need two cameras, a semi four, and detached or rural houses six to eight.",
    range: "2, 4, 6 and 8 cameras",
    summary: "Doors, side passage and drive: how many cameras each kind of house needs.",
    tip: "Mount the front-door camera at head height so it records faces, not the tops of heads.",
    bands: [
      { cameras: 2, title: "Flat or mid-terrace: front door and rear", blurb: "One for the front door and one for the back." },
      { cameras: 4, title: "Semi-detached: front, drive, side passage, rear", blurb: "The usual count for a semi: front, drive, side and back." },
      { cameras: 6, title: "Detached: garage, garden and every entrance", blurb: "Covers all sides of a detached house plus the garage." },
      { cameras: 8, title: "Large or rural home: outbuildings, long drive, gates", blurb: "For long drives, gates and outbuildings." },
    ],
    guideHeading: "How to plan CCTV for a house",
    guide: [
      "Start with every door, then the drive and any side passage.",
      "Angle cameras so they do not look into neighbours' gardens or windows; if they do, data-protection rules apply to you.",
      "Colour night vision makes it easier to describe clothing and vehicles after dark.",
    ],
    faqs: [
      { q: "How many CCTV cameras does a house need?", a: "Two for a flat or terrace, four for a semi, six or more for a detached house." },
      { q: "Do I need to tell my neighbours about my CCTV?", a: "It is good practice — and if your cameras capture beyond your boundary, data-protection rules apply." },
      { q: "IP (PoE) or Turbo HD for a house?", a: "IP for a new install; Turbo HD if you are replacing an old coax system." },
      { q: "Will the cameras see at night?", a: "Yes — every kit records at night, in black and white or in colour depending on the camera." },
      { q: "How long will a home CCTV system keep footage?", a: "Each kit card shows an estimate; most home kits keep a few weeks." },
    ],
    keepReading: [
      { label: "2-camera CCTV kits", href: "/categories/2-camera-kits" },
      { label: "4-camera CCTV kits", href: "/categories/4-camera-kits" },
      { label: "8-camera CCTV kits", href: "/categories/8-camera-kits" },
      { label: "IP / PoE kits", href: "/categories/ip-poe-kits" },
      { label: "Turbo HD kits", href: "/categories/turbo-hd-kits" },
      { label: "Every CCTV kit", href: "/categories/cctv-kits" },
      { label: "CCTV storage calculator", href: "/tools/cctv-storage-calculator" },
      { label: "CCTV kit finder", href: "/kits" },
    ],
  },
];

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
