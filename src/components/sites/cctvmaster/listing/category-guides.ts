// Related guides the source links from each category page (blog slugs), and categories that carry no copy block.
// Extracted from the source pages; titles and excerpts come from the local blog data.

const GUIDE_SETS: [string[], string[]][] = [
  [["accessories-cabinet"], ["cctv-cabinet-buying-guide-uk"]],
  [
    ["accessories-camera-bracket-and-junction-box"],
    [
      "cctv-junction-box-guide",
      "cctv-camera-bracket-fitting-guide",
      "hikvision-or-dahua-uk-small-business-cctv",
      "commercial-cctv-camera-guide-uk",
    ],
  ],
  [
    ["accessories-connectors"],
    [
      "3-in-6-out-wire-connector-cctv-power",
      "cctv-cable-trunking-wire-management-uk",
      "wire-connectors-cctv-uk-2026",
      "cat6-ethernet-cable-cctv-2026",
    ],
  ],
  [["accessories-hdmi-extender"], ["hdmi-extender-cctv-cat6-4k"]],
  [
    ["accessories-power"],
    [
      "3-in-6-out-wire-connector-cctv-power",
      "building-site-cctv-systems-uk-power-4g-recording",
      "poe-network-switch-cctv-guide",
      "poe-camera-not-powering-fault-guide",
    ],
  ],
  [["accessories-tv-monitor"], ["dvr-meaning-cctv-and-tv"]],
  [
    ["cameras-ip"],
    [
      "cctv-junction-box-guide",
      "dvr-cctv-keep-hybrid-or-ip-nvr",
      "apartment-intercom-systems-ip-vs-2-wire",
      "hikvision-intercom-2wire-ip-modular-compared",
    ],
  ],
  [
    [
      "cameras-ip-2mp",
      "cameras-ip-4mp",
      "cameras-ip-5mp",
      "cameras-ip-8mp",
      "cameras-turbo-hd",
      "cameras-turbo-hd-2mp",
      "cameras-turbo-hd-4mp",
      "cameras-turbo-hd-5mp",
      "cameras-turbo-hd-8mp",
      "cameras",
    ],
    [
      "hikvision-or-dahua-uk-small-business-cctv",
      "commercial-cctv-camera-guide-uk",
      "hikvision-camera-uk-guide",
      "ptz-cctv-cameras-uk-buyers-guide",
    ],
  ],
  [
    ["data-comm-networking"],
    ["poe-network-switch-cctv-guide", "nvr-network-video-recorder-guide"],
  ],
  [
    [
      "data-comm-networking-hubs-routers-switches",
      "data-comm-networking-hubs-routers-switches-poe-switches",
      "data-comm-networking-hubs-routers-switches-poe-switches-4-port",
      "data-comm-networking-hubs-routers-switches-poe-switches-8-port",
    ],
    [
      "poe-network-switch-cctv-guide",
      "what-size-poe-switch-for-8-cctv-cameras",
      "poe-cctv-system-camera-switch-nvr",
      "poe-switch-cctv-sizing-guide",
    ],
  ],
  [
    ["data-comm-networking-hubs-routers-switches-poe-switches-16-port"],
    [
      "poe-network-switch-cctv-guide",
      "what-size-poe-switch-for-8-cctv-cameras",
      "poe-cctv-system-camera-switch-nvr",
      "hikvision-nvr-channel-guide",
    ],
  ],
  [
    ["data-comm-networking-hubs-routers-switches-poe-switches-24-port"],
    [
      "poe-network-switch-cctv-guide",
      "what-size-poe-switch-for-8-cctv-cameras",
      "24-7-cctv-construction-sites-uk-guide",
      "poe-cctv-system-camera-switch-nvr",
    ],
  ],
  [
    ["recorders"],
    [
      "dvr-meaning-cctv-and-tv",
      "cctv-hard-drive-guide-2026-capacity",
      "nvr-network-video-recorder-guide",
    ],
  ],
  [
    [
      "recorders-dvr",
      "recorders-dvr-16ch",
      "recorders-dvr-32ch",
      "recorders-dvr-4ch",
      "recorders-dvr-8ch",
    ],
    [
      "dvr-meaning-cctv-and-tv",
      "dvr-cctv-keep-hybrid-or-ip-nvr",
      "nvr-meaning-in-cctv",
      "nvr-vs-dvr-cctv-uk",
    ],
  ],
  [
    ["recorders-nvr"],
    [
      "nvr-network-video-recorder-guide",
      "nvr-cctv-system-uk-guide",
      "nvr-meaning-in-cctv",
      "poe-cctv-system-camera-switch-nvr",
    ],
  ],
  [
    [
      "recorders-nvr-16ch",
      "recorders-nvr-32ch",
      "recorders-nvr-4ch",
      "recorders-nvr-8ch",
    ],
    [
      "nvr-network-video-recorder-guide",
      "nvr-cctv-system-uk-guide",
      "nvr-meaning-in-cctv",
      "dvr-meaning-cctv-and-tv",
    ],
  ],
  [
    [
      "storage",
      "storage-10tb",
      "storage-128gb",
      "storage-12tb",
      "storage-14tb",
      "storage-16tb",
      "storage-18tb",
      "storage-1tb",
      "storage-2tb",
      "storage-32gb",
      "storage-3tb",
      "storage-4tb",
      "storage-500gb",
      "storage-5tb",
      "storage-6tb",
      "storage-8tb",
    ],
    [
      "cctv-for-sites-construction-yard-storage",
      "cctv-hard-drive-guide-2026-capacity",
      "nvr-network-video-recorder-guide",
    ],
  ],
  [
    ["wire-cable"],
    [
      "cctv-cable-trunking-wire-management-uk",
      "wire-connectors-cctv-uk-2026",
      "external-cat5e-cable-outdoor-use-uk",
      "3-in-6-out-wire-connector-cctv-power",
    ],
  ],
  [
    ["wire-cable-ethernet"],
    [
      "cat6-ethernet-cable-cctv-2026",
      "poe-network-switch-cctv-guide",
      "cctv-cable-trunking-wire-management-uk",
      "wire-connectors-cctv-uk-2026",
    ],
  ],
  [
    ["wire-cable-ethernet-cat5e"],
    [
      "external-cat5e-cable-outdoor-use-uk",
      "cat5e-vs-cat6-cctv-cable",
      "cat5e-cable-cctv-2026",
      "cat6-vs-cat5e-cable-cctv",
    ],
  ],
  [
    ["wire-cable-ethernet-cat6"],
    [
      "cat6-ethernet-cable-cctv-2026",
      "cat5e-vs-cat6-cctv-cable",
      "cat6-vs-cat5e-cable-cctv",
      "outdoor-cat6-cable-uk",
    ],
  ],
  [
    ["wire-cable-ethernet-cat6a"],
    [
      "cctv-cable-trunking-wire-management-uk",
      "wire-connectors-cctv-uk-2026",
      "cat6-ethernet-cable-cctv-2026",
      "external-cat5e-cable-outdoor-use-uk",
    ],
  ],
  [
    [
      "others-printers-scanners-supplies",
      "others-printers-scanners-supplies-ink",
      "others-packing-supplies",
      "others-tools-hardware-cleaning-supplies",
    ],
    ["12v-cctv-power-supply-sizing-amps"],
  ],
];

export const CATEGORY_GUIDES: Record<string, string[]> = Object.fromEntries(
  GUIDE_SETS.flatMap(([categories, guides]) =>
    categories.map((c) => [c, guides]),
  ),
);

/** Categories whose source page has no intro/FAQ block under the grid. */
export const CATEGORIES_WITHOUT_COPY = new Set([
  "data-comm-networking-hubs-routers-switches-poe-switches-16-port",
  "data-comm-networking-hubs-routers-switches-poe-switches-24-port",
  "data-comm-networking-hubs-routers-switches-poe-switches-8-port",
  "recorders-nvr-32ch",
  "storage-128gb",
  "storage-16tb",
  "storage-2tb",
  "storage-32gb",
  "storage-3tb",
  "storage-5tb",
  "others-food-drink",
  "others-food-drink-coffee",
  "others-tools-hardware-testing-tools",
  "others-clearance",
  "others-tools-hardware-cleaning-supplies",
]);

/** The h2 that opens a category's copy block on the source, where it has one. */
export const CATEGORY_HEADINGS: Record<string, string> = {
  "accessories-cabinet": "Network cabinets for CCTV storage and switching",
  "accessories-connectors": "Connectors for CCTV installs",
  "accessories-tv-monitor": "TV & Monitor accessories: what's in this range",
  "cameras-ip": "IP camera range",
  "cameras-ip-5mp": "5MP IP cameras: what this range covers",
  "cameras-turbo-hd": "Turbo HD cameras: what this range covers",
  "cameras-turbo-hd-2mp": "2MP Turbo HD & IP cameras",
  "cameras-turbo-hd-4mp": "4MP Turbo HD and PoE cameras",
  "cameras-turbo-hd-8mp": "8MP Turbo HD and PoE cameras",
  "data-comm-networking-hubs-routers-switches-poe-switches": "PoE Switches",
  recorders: "What are CCTV recorders?",
  "recorders-dvr-16ch": "16-channel DVR & NVR recorders",
  "recorders-dvr-32ch": "32-channel DVRs and NVRs",
  "recorders-dvr-8ch": "8-channel DVR & NVR recorders",
  "recorders-nvr": "NVR recorders",
  "recorders-nvr-16ch": "16-channel NVRs and DVRs",
  "recorders-nvr-4ch": "4-Channel NVRs and DVRs",
  "recorders-nvr-8ch": "8-channel NVRs and DVRs",
  "storage-10tb": "10TB hard drives for CCTV storage",
  "storage-18tb": "18TB hard drives for CCTV storage",
  "storage-1tb": "1TB CCTV hard drives",
  "storage-500gb": "500GB hard drives for CCTV recorders",
  "storage-6tb": "6TB storage drives for CCTV recording",
  "wire-cable-ethernet": "Ethernet cable for CCTV installs",
  "wire-cable-ethernet-cat5e": "CAT5E cable",
  "wire-cable-ethernet-cat6": "CAT6 cable for CCTV and network runs",
  "wire-cable-ethernet-cat6a": "CAT6A cable for CCTV and network runs",
  others: 'What\'s in the "Others" range',
  "others-printers-scanners-supplies":
    "Printers, Scanners & Supplies for CCTV sites",
  "others-printers-scanners-supplies-ink":
    "Ink for home and small-business printers",
  "others-magnet": "Magnets: discs, balls and fishing magnets",
  cameras: "Cameras",
  "others-tools-hardware": "Tools & Hardware for CCTV installs",
  "others-tools-hardware-tools":
    "Tools for CCTV installation and general fitting work",
  "others-tools-hardware-tape-sealants": "Tape & sealants for CCTV installs",
  "others-internet-of-things-iot": "Internet of Things (IoT) devices",
};
