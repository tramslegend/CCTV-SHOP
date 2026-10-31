// Curated landing pages (/collections/*) and brand ranges (/brands/*).
// Product lists, titles, headings, questions and links follow the source; body text is our own.
import type { ChipLink } from "./listing-header";

export interface LandingPage {
  slug: string;
  /** Page h1 and last breadcrumb. */
  name: string;
  metaTitle: string;
  metaDescription: string;
  /** One-line description under the h1. */
  description: string;
  chipRows?: { label: string; chips: ChipLink[]; variant: "primary" | "secondary" }[];
  copyHeading: string;
  paragraphs: string[];
  faqs: { q: string; a: string }[];
  links: { name: string; href: string }[];
}

export interface Collection extends LandingPage {
  products: string[];
}

export interface Brand extends LandingPage {
  /** Matches the product's brand field, case-insensitively. */
  brand: string;
}

export const COLLECTIONS: Collection[] = [
  {
    slug: "access-control",
    name: "Door Access Control Systems",
    metaTitle: "Access Control Systems UK: Maglocks, Keypads & Fobs",
    metaDescription:
      "Build your own access control setup from individually priced locks, RFID keypads, fobs, exit buttons and face-recognition units.",
    description:
      "Door access hardware sold piece by piece — maglocks, keypads, fob readers, face terminals and release buttons — so you only pay for what your door needs.",
    copyHeading: "Four things to decide for each door",
    paragraphs: [
      "Plan each door on its own: how people prove who they are, what holds the door shut, how they get out again, and whether the door needs to talk to anything else on site.",
      "Start with the credential. Fobs and cards are cheap and easy to replace; keypads need nothing to carry; fingerprint and face terminals stop codes and fobs being shared. Fobs and readers must use the same frequency.",
      "Next, the lock. A magnetic lock suits most single doors, sized to the door's weight and traffic, with the right bracket for the way the door opens.",
      "Then the way out. Every controlled door needs a release on the inside, such as a push button or a no-touch sensor, and maglocks release when power is cut, so plan a backup supply if the door must stay secure.",
      "Finally, scale. One or two doors can run from standalone keypads; more doors are easier to manage from a controller or terminal that keeps users and logs in one place.",
    ],
    faqs: [
      {
        q: "Which fob should I choose: 125kHz or 13.56MHz?",
        a: "Match the reader. 125kHz fobs are the simple, low-cost option; 13.56MHz fobs are harder to copy. A reader only accepts its own frequency.",
      },
      {
        q: "How strong does my magnetic lock need to be?",
        a: "Go by the door: lighter internal doors need less holding force than heavy or external doors. Check the kg rating on each lock.",
      },
      {
        q: "If the power goes off, does a magnetic lock stay locked?",
        a: "No. A maglock needs power to hold, so it releases in a power cut. Add a backup supply if the door has to stay locked.",
      },
      {
        q: "Can I put a maglock on a fire exit door?",
        a: "Only in line with your fire-safety plan, usually with a break-glass release and a link to the fire alarm. Ask your fire-safety adviser first.",
      },
      {
        q: "Do I need a controller, or is a keypad on its own enough?",
        a: "A standalone keypad is fine for one or two doors. For more doors, or central user lists and logs, use a controller.",
      },
      {
        q: "Can my door system trigger the CCTV?",
        a: "Many terminals and controllers have alarm outputs or app integration that can flag events to a recorder. Check the model's specification.",
      },
    ],
    links: [
      { name: "Video door entry", href: "/collections/video-door-entry" },
      { name: "All intrusion & access products", href: "/categories/intrusion" },
      { name: "Power supplies", href: "/categories/accessories-power" },
      { name: "CCTV kits", href: "/kits" },
    ],
    products: [
      "acm-125khz-rfid-key-fob-proximity-access-control-tag",
      "acm-13-56mhz-rfid-nfc-key-fob-access-control-key-tag",
      "acm-208c-id-metal-access-control-keypad-rfid-door-entry-controller",
      "acm-a60w-em-touch-keypad-rfid-access-control-reader-waterproof",
      "acm-k14b-stainless-steel-door-exit-push-button-114-69mm",
      "acm-k15a-waterproof-ip67-door-exit-push-button-stainless-steel",
      "acm-k6b-stainless-steel-metal-exit-push-button-access-control-system",
      "bluetooth-tuya-app-smart-fingerprint-rfid-access-control-keypad-touch",
      "dahua-face-recognition-access-controller",
      "dahua-fingerprint-rfid-access-control-reader",
      "dahua-slim-waterproof-rfid-access-control-reader-asr1200d",
      "door-access-control-system-125khz-proximity-id-card-access-control",
      "evolis-zenius-classic-single-sided-id-card-printer",
      "facial-recognition-access-controller",
      "hikvision-ds-k1t342mfwx-e1-face-recognition-terminal-wifi-access",
      "hikvision-ds-k2m002x-2-door-access-control-expansion-module",
      "hikvision-ds-k5604-z-h-face-recognition-access-control-terminal-7-inch",
      "no-touch-exit-button-with-backplate-rectangular-hands-free-infrared",
      "no-touch-exit-button-with-backplate-square-hands-free-infrared-door",
      "press-to-exit-green-dome-button-door-release-switch-drb044s-pte",
      "rgl-exit-push-plate-ebpp02",
      "smart-face-recognition-door-lock-3d-biometric-fingerprint-keypad",
      "wifi-tuya-access-control-keypad-125khz-rfid-standalone-access",
      "wifi-tuya-door-access-control-keypad-ip68-waterproof-rfid-keyboard",
    ],
  },
  {
    slug: "bnc-connectors",
    name: "BNC Connectors for CCTV",
    metaTitle: "BNC Connectors for RG59 & RG6 CCTV Cable: Which Type?",
    metaDescription:
      "Crimp, twist-on and compression BNC plugs for terminating RG59 and RG6 coax — match the fitting to your cable and tooling.",
    description:
      "Crimp, twist-on and compression BNC connectors for RG59 and coax CCTV installs — the fittings installers actually use, in stock in the UK.",
    copyHeading: "Choosing the right BNC connector",
    paragraphs: [
      "For permanent joints, crimp connectors are the dependable choice; twist-on and push-fit types are quicker to fit and handy for repairs or temporary runs. Baluns, couplers and adapters cover the jobs in between, such as running coax cameras over network cable.",
      "Always match the connector to the cable's outer size, because RG59 and RG6 need different fittings.",
    ],
    faqs: [
      {
        q: "Are BNC connectors the same for RG59 and RG6?",
        a: "No. RG6 is thicker, so it needs connectors sized for it. Check the cable type named on each connector.",
      },
      {
        q: "Do BNC connectors work with HD cameras?",
        a: "Yes. HD-over-coax formats such as TVI, CVI and AHD use the same BNC fittings; a well-made joint matters more as resolution rises.",
      },
      {
        q: "What tool do I need for crimp BNC connectors?",
        a: "A coax stripper to prepare the cable and a crimp tool with the right die for the connector.",
      },
    ],
    links: [
      { name: "CCTV cable", href: "/categories/wire-cable" },
      { name: "All connectors", href: "/categories/accessories-connectors" },
      { name: "CCTV storage calculator", href: "/tools/cctv-storage-calculator" },
    ],
    products: [
      "8mp-4k-cctv-high-performance-passive-video-balun-bnc-screw-terminal",
      "8mp-4k-cctv-passive-video-balun-bnc-screw-terminal-utp-adapter",
      "8mp-4k-cctv-passive-video-balun-bnc-screw-terminal-white",
      "8mp-4k-cctv-passive-video-balun-bnc-to-rj45-utp-adapter",
      "8mp-4k-passive-poc-cctv-video-balun-bnc-screw-terminal",
      "bnc-3-way-t-splitter-adapter-male-to-dual-female-cctv-connector",
      "bnc-female-to-dual-female-t-adapter-cctv-rf-signal-splitter",
      "bnc-female-to-female-coupler-connector-cctv-coaxial-cable-joiner",
      "bnc-female-to-rca-male-adapter-cctv-coaxial-video-connector",
      "bnc-isolator-gb001",
      "bnc-male-crimp-connector-3-piece-rg59-cctv-coaxial-cable-plug",
      "bnc-male-crimp-connector-3-piece-rg59-cctv-coaxial-cable-plug-pro",
      "bnc-male-crimp-connector-for-cctv-coaxial-cable-rg59-rg6",
      "bnc-male-to-male-coupler-adapter-for-cctv-coaxial-cable-joiner",
      "bnc-male-to-rca-female-adapter-cctv-coaxial-video-connector",
      "bnc-twist-on-male-connector-for-rg59-coaxial-cctv-cable",
      "cat5e-to-bnc-male-power-plug-balun-connector-adapter-for-cctv-cameras",
      "cctv-video-balun-8mp-4k-hd-bnc-passive-connector-coaxial-adapter",
      "metal-rca-phono-male-plug-solder-connector-for-cctv-audio-cable",
      "passive-video-balun-transceiver-pair-cctv-bnc-to-utp-cat5e-cat6",
      "rg59-cctv-cable-10m-bnc-video-with-dc-power-shotgun-lead-for-camera",
      "rg59-cctv-cable-20m-bnc-video-with-dc-power-shotgun-lead-for-camera",
      "spring-loaded-bnc-q9-male-connector-for-cctv-coaxial-cable",
      "wire-to-bnc-female-plug-screw-terminal-connector-cctv-adapter",
      "wire-to-bnc-male-plug-screw-terminal-connector-cctv-adapter",
      "wire-to-male-bnc-plug-red-push-bnc-connector-male-with-press-terminal",
    ],
  },
  {
    slug: "hikvision-nvrs",
    name: "Hikvision NVRs",
    metaTitle: "Hikvision NVR: Choose Channels, PoE Budget & Storage",
    metaDescription:
      "Hikvision network video recorders from 4 to 32 channels, many with built-in PoE, to run IP camera systems.",
    description: "Hikvision network video recorders — 4, 8 and 16-channel PoE NVRs for IP camera systems, UK stock.",
    copyHeading: "Picking a Hikvision NVR",
    paragraphs: [
      "Choose the channel count for the system you expect to end up with, not just today's cameras: adding a channel later means replacing the recorder. Check the PoE budget too, so every camera can be powered from the back of the unit.",
      "Then size the storage. Higher resolutions and smart-detection models write more data, so pair the NVR with a surveillance drive large enough for the days you want to keep.",
    ],
    faqs: [
      {
        q: "Do Hikvision NVRs work with other camera brands?",
        a: "Usually, through ONVIF, for live view and recording. Smart features such as AcuSense alerts work best with Hikvision cameras.",
      },
      {
        q: "What hard drive does a Hikvision NVR take?",
        a: "A 3.5-inch SATA drive; a surveillance-rated model is the better choice for continuous recording.",
      },
    ],
    links: [
      { name: "All NVRs", href: "/categories/recorders-nvr" },
      { name: "CCTV storage calculator", href: "/tools/cctv-storage-calculator" },
      { name: "PoE switches", href: "/categories/data-comm-networking-hubs-routers-switches-poe-switches" },
    ],
    products: [
      "hikvision-16-ch-1u-16-poe-8k-nvr",
      "hikvision-32-ch-1-5u-24-poe-8k-nvr",
      "hikvision-4-ch-poe-1u-k-series-acusense-4k-nvr",
      "hikvision-8-ch-1u-8-poe-8k-nvr",
      "hikvision-8-ch-poe-1u-k-series-acusense-4k-nvr-ds-7608nxi-k1-8p-b",
      "hikvision-ds-7616nxi-k2-16p-e-16-channel-poe-acusense-4k-nvr",
      "hikvision-hilook-nvr-108h-d-8p-8ch-poe-network-video-recorder-h-265",
    ],
  },
  {
    slug: "rg59-cable",
    name: "RG59 CCTV Cable",
    metaTitle: "RG59 CCTV Cable: Coax & Shotgun Reels, UK Stock",
    metaDescription:
      "Coax for DVR-based systems: RG59 and shotgun video-plus-power cable on 20m–100m reels, along with ready-made leads, in UK stock.",
    description:
      "RG59 coax and shotgun (power + video) cable for analogue and HD-over-coax CCTV — reels and pre-terminated leads, UK stock.",
    copyHeading: "RG59 in practice",
    paragraphs: [
      "RG59 is the usual cable for coax cameras, including HD-over-coax formats. Shotgun versions add a pair of power cores alongside the coax, so one cable run feeds both video and power to the camera.",
      "Solid copper cable keeps a clean signal over longer distances than cheaper copper-clad steel. On long or high-resolution runs, check the supported distance in your camera and DVR specifications, and take care over the connectors at each end.",
    ],
    faqs: [
      {
        q: "How far can RG59 carry an HD CCTV signal?",
        a: "It depends on the cable and the video format; good copper RG59 handles typical home and small-business runs. Higher resolutions shorten the distance, so check your camera and recorder specs.",
      },
      {
        q: "RG59 or Cat5e for a new install?",
        a: "For a new IP system, network cable with PoE is normally the better route. RG59 makes sense when you're extending or upgrading an existing coax system.",
      },
    ],
    links: [
      { name: "All CCTV cable", href: "/categories/wire-cable" },
      { name: "BNC connectors", href: "/collections/bnc-connectors" },
    ],
    products: [
      "aura-rg59-shotgun-cctv-cable-reel-100m-coaxial-power-black",
      "bnc-male-crimp-connector-3-piece-rg59-cctv-coaxial-cable-plug",
      "bnc-male-crimp-connector-3-piece-rg59-cctv-coaxial-cable-plug-pro",
      "bnc-male-crimp-connector-for-cctv-coaxial-cable-rg59-rg6",
      "bnc-twist-on-male-connector-for-rg59-coaxial-cctv-cable",
      "hlt-323-coaxial-cable-stripper-tool-for-rg59-rg6-cctv-cable",
      "pro-rg59-coaxial-cable-100m-reel-black-single-core-cctv",
      "rg59-cctv-cable-10m-bnc-video-with-dc-power-shotgun-lead-for-camera",
      "rg59-cctv-cable-20m-bnc-video-with-dc-power-shotgun-lead-for-camera",
      "rg59-shotgun-cctv-cable-100m-reel-video-power-siamese-thin",
      "unbranded-20m-rg59-coaxial-camera-cable-with-power-cores",
      "wire-to-male-bnc-plug-red-push-bnc-connector-male-with-press-terminal",
    ],
  },
  {
    slug: "video-door-entry",
    name: "Video Door Entry Systems",
    metaTitle: "Video Door Entry Systems: 2-Wire or IP Kits for Homes",
    metaDescription:
      "Hikvision 2-wire and IP door entry: outdoor call units and indoor monitors as kits or individual parts, for houses and apartment blocks.",
    description:
      "Hikvision intercom systems for single homes and multi-flat buildings: full kits, door stations and indoor screens, all held in UK stock.",
    copyHeading: "Choosing door entry for your home or building",
    paragraphs: [
      "Begin with the wiring. 2-wire systems reuse a single pair of cables, which suits replacing an old intercom; IP systems run over network cable, often powered by PoE, and are easier to extend.",
      "Then count the call buttons. A house needs one; a building with several flats needs a button, or a keypad, for each.",
      "Modular door stations let you add a keypad, fob reader or exit button module to the same panel, which is a neat way to combine door entry with access control.",
      "Lastly, decide how it mounts. Flush frames sit in the wall for a tidy finish; surface frames are simpler to fit, and a rain shield helps on exposed walls.",
    ],
    faqs: [
      {
        q: "Should I choose a 2-wire or an IP intercom?",
        a: "2-wire if you're reusing existing intercom cable; IP for new installs or when you want to add stations and app control easily.",
      },
      {
        q: "Can I have more than one indoor monitor?",
        a: "Most kits support extra indoor stations. Check the maximum on the door station's specification.",
      },
      {
        q: "Can my door intercom work with my CCTV recorder?",
        a: "Many Hikvision IP door stations can be added to a compatible NVR as a camera. Check that the recorder supports the model.",
      },
      {
        q: "Do I need a separate lock, or does the kit open the door?",
        a: "The door station switches a lock output, but the electric strike or maglock itself is usually bought separately.",
      },
      {
        q: "What goes behind a flush frame?",
        a: "A back box recessed into the wall. Order the frame and back box that match the number of modules.",
      },
    ],
    links: [
      { name: "Door access control", href: "/collections/access-control" },
      { name: "All intrusion & access products", href: "/categories/intrusion" },
      { name: "Hikvision", href: "/brands/hikvision" },
      { name: "CCTV kits", href: "/kits" },
    ],
    products: [
      "hikvision-ds-kabv8113-rs-rain-shield-for-kv8113-video-intercom-station",
      "hikvision-ds-kd-acf3-flush-mount-frame-3-module-intercom-mounting",
      "hikvision-ds-kd-acw2-surface-mount-frame-2-module-intercom-housing",
      "hikvision-ds-kd-acw3-surface-mount-frame-3-module-intercom-housing",
      "hikvision-ds-kd-e-exit-button-module-for-kd-series-video-intercom",
      "hikvision-ds-kd-kk-numeric-keypad-module-for-kd-series-intercom",
      "hikvision-ds-kd-kp-keypad-pro-module-with-rfid-for-kd-intercom-system",
      "hikvision-ds-kd8003-ime1-b-modular-ip-video-intercom-main-unit-camera",
      "hikvision-ds-kd8003-ime1-b-surface-2mp-ip-video-intercom-door-station",
      "hikvision-ds-kh6320-wte1-7-ip-video-intercom-indoor-monitor",
      "hikvision-ds-kh9510-wte1-b-10-1-android-indoor-station",
      "hikvision-ds-kis101-p-surface-2-wire-analog-video-intercom-kit",
      "hikvision-ds-kis604-p-c-ip-video-intercom-kit-villa-door-entry",
      "hikvision-ds-kis702-p-b-2-wire-ip-video-intercom-kit-villa",
      "hikvision-ds-kv8213-wme1-c-2-button-poe-villa-door-station",
      "hikvision-ds-kv8413-wme1-4-button-ip-video-intercom-door-station",
      "hikvision-ip-video-intercom-kit-villa-house-bundle-with-mobile-control",
      "hikvision-metal-vandal-resistant-facial-recognition-ip-villa-door",
      "hikvision-modular-ip-video-intercom-door-station-2mp-fisheye-poe-ip65",
      "homsecur-7-lcd-waterproof-video-door-phone-doorbell-camera-with-night",
    ],
  },
];

export const BRANDS: Brand[] = [
  {
    slug: "dahua",
    brand: "Dahua",
    name: "Dahua UK Range",
    metaTitle: "Dahua UK: Cameras, Recorders & Accessories In Stock",
    metaDescription:
      "UK stock of Dahua CCTV cameras, recorders and accessories, including WizSense AI models with human/vehicle filtering and full-colour night imaging.",
    description:
      "Dahua cameras and accessories from UK stock — WizSense AI ranges and full-colour night imaging, with guides to pick between them.",
    chipRows: [
      {
        label: "Shop by range",
        variant: "primary",
        chips: [
          { name: "Cameras", href: "/categories/cameras" },
          { name: "Recorders", href: "/categories/recorders-nvr" },
          { name: "Power supplies", href: "/categories/accessories-power" },
          { name: "Brackets", href: "/categories/accessories-camera-bracket-and-junction-box" },
        ],
      },
      {
        label: "Guides & tools",
        variant: "secondary",
        chips: [
          { name: "Hikvision vs Dahua comparison", href: "/blog/zxtech-4k-cctv-vs-dahua-hikvision", dashed: true },
          { name: "CCTV storage calculator", href: "/tools/cctv-storage-calculator", dashed: true },
        ],
      },
    ],
    copyHeading: "Buying Dahua in the UK",
    paragraphs: [
      "Dahua's WizSense models use built-in AI to separate people and vehicles from everything else that moves, which cuts down on nuisance alerts. Full-colour models keep colour images at night where you need to identify people or vehicles.",
      "Cameras from different brands will usually record together over ONVIF, but the smart alerts and app features work best when the cameras and recorder come from the same maker.",
    ],
    faqs: [
      {
        q: "Dahua or Hikvision — which should I fit?",
        a: "Both make capable kit for homes and businesses. Compare the specific models and, ideally, keep cameras and recorder from one brand so every smart feature works.",
      },
    ],
    links: [],
  },
  {
    slug: "hikvision",
    brand: "Hikvision",
    name: "Hikvision UK Range",
    metaTitle: "Hikvision UK: CCTV Cameras, NVRs & PoE Switches",
    metaDescription:
      "The Hikvision range in UK stock: cameras, NVRs, PoE switches and power supplies, with guides to help you size a system.",
    description:
      "Hikvision cameras, NVRs, switches and accessories from UK stock — the ranges installers fit, with the guides to spec them.",
    chipRows: [
      {
        label: "Shop by range",
        variant: "primary",
        chips: [
          { name: "Hikvision NVRs", href: "/collections/hikvision-nvrs" },
          { name: "IP cameras", href: "/categories/cameras" },
          { name: "PoE switches", href: "/categories/data-comm-networking-hubs-routers-switches-poe-switches" },
          { name: "Brackets & junction boxes", href: "/categories/accessories-camera-bracket-and-junction-box" },
          { name: "Power supplies", href: "/categories/accessories-power" },
          { name: "Hikvision kits", href: "/kits#hikvision" },
        ],
      },
      {
        label: "Guides & tools",
        variant: "secondary",
        chips: [
          { name: "Hikvision PoE cameras guide", href: "/blog/hikvision-poe-camera-uk-2026", dashed: true },
          { name: "CCTV storage calculator", href: "/tools/cctv-storage-calculator", dashed: true },
        ],
      },
    ],
    copyHeading: "Buying Hikvision in the UK",
    paragraphs: [
      "Hikvision groups its cameras into series. Value models cover everyday home and small-business jobs, AcuSense models add people-and-vehicle detection for fewer false alerts, and ColorVu models keep colour at night. Decide which series suits the job before comparing individual cameras.",
      "Plan the whole system together: an NVR with enough channels and PoE power, surveillance drives sized for your retention, and the brackets and junction boxes that keep the install weatherproof. The ranges above link to each part.",
    ],
    faqs: [
      {
        q: "Is Hikvision equipment legal to buy and use in the UK?",
        a: "Yes. Homes and businesses can buy and use it; the UK government's restrictions apply to sensitive central-government sites only.",
      },
      {
        q: "What is the difference between AcuSense and ColorVu?",
        a: "AcuSense is Hikvision's people-and-vehicle detection; ColorVu is its colour-at-night imaging. Some cameras have both.",
      },
      {
        q: "Do Hikvision cameras work with other NVR brands?",
        a: "Generally yes for basic recording via ONVIF, but smart events and updates work fully only with a Hikvision recorder.",
      },
    ],
    links: [],
  },
];

export const getCollection = (slug: string) => COLLECTIONS.find((c) => c.slug === slug);
export const getBrand = (slug: string) => BRANDS.find((b) => b.slug === slug);
