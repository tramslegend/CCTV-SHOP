// Calculator constants and product picks, as cctvmaster.co.uk's /tools pages define them (captured 2026-10-29).
// Picks hold slugs only; the pages resolve names and prices from the local catalogue.

// ---------- storage ----------

export const RESOLUTIONS = {
  "2mp": { label: "2 MP (1080p)", h264KbpsAt25: 4096 },
  "4mp": { label: "4 MP (1440p)", h264KbpsAt25: 6144 },
  "5mp": { label: "5 MP", h264KbpsAt25: 8192 },
  "8mp": { label: "8 MP (4K)", h264KbpsAt25: 12288 },
} as const;

export const CODECS = {
  h264: { label: "H.264", factor: 1 },
  h265: { label: "H.265", factor: 0.5 },
  "h265+": { label: "H.265+ / smart codec", factor: 0.35 },
} as const;

export const RECORDING = {
  continuous: { label: "Continuous 24/7", factor: 1 },
  "motion-busy": { label: "Motion — busy scene", factor: 0.5 },
  "motion-quiet": { label: "Motion — quiet scene", factor: 0.3 },
} as const;

export const FRAME_RATES = [8, 12, 15, 20, 25, 30] as const;
export const RETENTION_DAYS = [7, 14, 21, 30, 45, 60, 90] as const;
const DRIVE_SIZES_TB = [1, 2, 3, 4, 6, 8, 10, 12, 16, 18, 20];

export type ResolutionKey = keyof typeof RESOLUTIONS;
export type CodecKey = keyof typeof CODECS;
export type RecordingKey = keyof typeof RECORDING;

/** Smallest single drive that fits, or N × the largest. */
export function driveSuggestion(tb: number) {
  for (const size of DRIVE_SIZES_TB) if (size >= tb) return `1 × ${size} TB`;
  const largest = DRIVE_SIZES_TB[DRIVE_SIZES_TB.length - 1];
  return `${Math.ceil(tb / largest)} × ${largest} TB`;
}

export function storageNeeded(input: {
  cameras: number;
  resolution: ResolutionKey;
  codec: CodecKey;
  fps: number;
  recording: RecordingKey;
  days: number;
}) {
  const kbps = RESOLUTIONS[input.resolution].h264KbpsAt25 * CODECS[input.codec].factor * (Math.min(input.fps, 30) / 25);
  const gbPerDay24h = ((kbps / 8) * 86400) / 1e6;
  const gbPerCameraDay = gbPerDay24h * RECORDING[input.recording].factor;
  const totalTb = (gbPerCameraDay * input.cameras * input.days) / 1000;
  return { gbPerCameraDay, totalTb, totalMbps: (kbps * input.cameras) / 1000, drives: driveSuggestion(totalTb) };
}

/** Hard drives the source recommends, with their capacity in TB. */
export const DRIVE_PICKS = [
  { slug: "seagate-500gb-3-5-sata-hard-drives-free-installation-with-any-cctv", value: 0.5 },
  { slug: "seagate-1tb-hdd-3-5-sata-hard-drives-free-installation-with-any-cctv-slim-r", value: 1 },
  { slug: "2tb-hdd-3-5-sata-hard-drives-free-installation-with-any-cctv-kit-or", value: 2 },
  { slug: "3tb-hdd-3-5-sata-hard-drives-free-installation-with-any-cctv-kit-or", value: 3 },
  { slug: "seagate-4tb-hdd-3-5-sata-hard-drives-free-installation-with-any-cctv", value: 4 },
  { slug: "lenovo-thinkserver-5tb-7-2k-sata-3-5-hdd-00la954", value: 5 },
  { slug: "6tb-hdd-3-5-sata-hard-drives-free-installation-with-any-cctv-kit-or", value: 6 },
  { slug: "western-digital-ultrastar-8tb-enterprise-sata-3-5-hard-drive", value: 8 },
];

// ---------- lens ----------

export const SENSORS = {
  "1/3": { label: "1/3″ sensor", widthMm: 4.8 },
  "1/2.8": { label: "1/2.8″ sensor (common)", widthMm: 5.09 },
  "1/2.7": { label: "1/2.7″ sensor", widthMm: 5.37 },
  "1/2": { label: "1/2″ sensor", widthMm: 6.4 },
  "1/1.8": { label: "1/1.8″ sensor (low-light)", widthMm: 7.2 },
} as const;

export const LENS_RESOLUTIONS = {
  "2mp": { label: "2 MP (1920px)", hPixels: 1920 },
  "4mp": { label: "4 MP (2560px)", hPixels: 2560 },
  "5mp": { label: "5 MP (2592px)", hPixels: 2592 },
  "8mp": { label: "8 MP / 4K (3840px)", hPixels: 3840 },
} as const;

export const FOCAL_LENGTHS = [2.8, 3.6, 4, 6, 8, 12, 16, 25] as const;

/** DORI pixel-density thresholds (IEC 62676-4), strictest first. */
export const DORI = [
  { name: "Identify", ppm: 250 },
  { name: "Recognise", ppm: 125 },
  { name: "Observe", ppm: 62 },
  { name: "Detect", ppm: 25 },
] as const;

export const DORI_COPY: Record<(typeof DORI)[number]["name"], string> = {
  Identify: "Identify: enough detail to identify a stranger for certain",
  Recognise: "Recognise: you’d know someone you’ve met, and can read a plate",
  Observe: "Observe: you can see clothes, colours and what happened",
  Detect: "Detect: you can tell someone or something is there",
};
export const BELOW_DETECT = "Not enough detail even to spot movement — too far for this lens and resolution";

export type SensorKey = keyof typeof SENSORS;
export type LensResolutionKey = keyof typeof LENS_RESOLUTIONS;

export function fieldOfView(input: { sensor: SensorKey; focal: number; distance: number; resolution: LensResolutionKey }) {
  const angle = 2 * Math.atan(SENSORS[input.sensor].widthMm / (2 * input.focal));
  const sceneWidth = 2 * input.distance * Math.tan(angle / 2);
  const hPixels = LENS_RESOLUTIONS[input.resolution].hPixels;
  const ppm = hPixels / sceneWidth;
  return {
    fovDeg: (angle * 180) / Math.PI,
    sceneWidth,
    ppm,
    achieved: DORI.find((level) => ppm >= level.ppm),
    /** Furthest distance (m) at which a DORI level is still reached. */
    rangeFor: (levelPpm: number) => (hPixels / levelPpm / sceneWidth) * input.distance,
  };
}

export interface LensSpec {
  kind: "fixed" | "varifocal";
  min: number;
  max: number;
}

export const lensFits = (lens: LensSpec, focal: number) =>
  lens.kind === "fixed" ? Math.abs(lens.min - focal) < 0.1 : focal >= lens.min - 0.05 && focal <= lens.max + 0.05;

const fixed = (mm: number): LensSpec => ({ kind: "fixed", min: mm, max: mm });
const vari = (min: number, max: number): LensSpec => ({ kind: "varifocal", min, max });

/** Cameras the source suggests per focal length, in the source's (price) order. */
export const CAMERA_PICKS: { slug: string; lens: LensSpec }[] = [
  { slug: "thc-t250-m-r", lens: fixed(3.6) },
  { slug: "hikvision-5-mp-pir-fixed-turret-camera", lens: fixed(2.8) },
  { slug: "hikvision-5-mp-audio-fixed-turret-camera-ds-2ce78h0t-it3fs", lens: fixed(2.8) },
  { slug: "viper-pro-5mp-3k-colorvu-camera-24-hour-smart-light-cctv", lens: fixed(2.8) },
  { slug: "hikvision-4k-fixed-turret-camera", lens: fixed(2.8) },
  { slug: "hikvision-3k-colorvu-pir-siren-fixed-bullet-camera", lens: fixed(2.8) },
  { slug: "hikvision-3k-two-way-audio-siren-fixed-bullet-camera", lens: fixed(2.8) },
  { slug: "hikvision-3k-two-way-audio-fixed-turret-ds-2ce78k0t-lts", lens: fixed(2.8) },
  { slug: "hikvision-3k-colorvu-pir-siren-fixed-turret-camera", lens: fixed(2.8) },
  { slug: "hikvision-3k-two-way-audio-fixed-pt-turret", lens: fixed(2.8) },
  { slug: "hikvision-ds-2cd1327g2-luf-2mp-colorvu-poe-ip-turret-camera-mic-ip67", lens: fixed(2.8) },
  { slug: "hikvision-4k-two-way-audio-fixed-turret-ds-2ce78u0t-lts-black", lens: fixed(2.8) },
  { slug: "hikvision-4k-colorvu-poc-fixed-mini-bullet-camera", lens: fixed(2.8) },
  { slug: "hikvision-ds-2cd2h45fwd-izs-4mp-motorized-varifocal-poe-turret-camera", lens: vari(2.8, 12) },
  { slug: "hikvision-ds-2cd1343g2-liuf-sl-4mp-smart-hybrid-light-poe-turret", lens: fixed(2.8) },
  { slug: "hikvision-ds-2cd3356g2-isu-5mp-acusense-ir-poe-turret-camera-2-8mm", lens: fixed(2.8) },
  { slug: "hikvision-5mp-fixed-bullet-network-camera-h-265-ip67-wdr-exir-2-0", lens: fixed(2.8) },
  { slug: "5mp-ai-ip-dome-camera-poe-face-detection-ir-night-vision-256gb-sd", lens: fixed(2.8) },
  { slug: "hikvision-ds-2cd2h83g0-izs-8mp-motorized-varifocal-poe-turret-camera", lens: vari(2.8, 12) },
  { slug: "hikvision-ds-2cd1383g2-liu-8mp-smart-hybrid-light-poe-ip-turret", lens: fixed(2.8) },
  { slug: "8-mp-dual-lens-stitched-wide-angle-smart-hybrid-light-fixed-turret", lens: fixed(2) },
  { slug: "hikvision-ds-2cd2347g2-lsu-sl-4mp-colorvu-strobe-light-poe-turret-b", lens: fixed(2.8) },
  { slug: "hikvision-ds-2cd2085g1-i-8mp-darkfighter-poe-ip-bullet-camera-2-8mm", lens: fixed(2.8) },
  { slug: "hikvision-4-inch-2-mp-25x-powered-by-darkfighter-analog-speed-dome", lens: vari(4.8, 120) },
  { slug: "hikvision-ds-2cd2387g2h-lisu-sl-8mp-colorvu-hybrid-light-poe-turret", lens: fixed(2.8) },
  { slug: "hikvision-ds-2cd2387g3-lis2uy-sl-2-8mm-black-hik-8mp-smart-hybrid", lens: fixed(2.8) },
  { slug: "hikvision-ds-2cd2387g3-lis2uy-sl-8mp-colorvu-hybrid-light-poe-turret", lens: fixed(2.8) },
  { slug: "hikvision-ds-2cd2t87g2h-lisu-sl-8mp-colorvu-hybrid-light-poe-bullet", lens: fixed(2.8) },
  { slug: "hikvision-ds-2ae5225ti-a-e-2mp-25x-ptz-turbo-hd-camera", lens: vari(4.8, 120) },
  { slug: "hikvision-ds-2de4425iw-de-4mp-25-ptz-network-camera-ir-100m", lens: vari(4.8, 120) },
  { slug: "hikvision-ds-2de4a425iw-de-4mp-25-ptz-network-camera-ir-50m", lens: vari(4.8, 120) },
];

// ---------- PoE & 12V ----------

export const CAMERA_LOADS = {
  dome: { label: "Dome / turret (IR)", watts: 6 },
  bullet: { label: "Bullet (long IR)", watts: 9 },
  colorvu: { label: "Full-colour night camera", watts: 12 },
  ptz: { label: "PTZ", watts: 20 },
  custom: { label: "Custom wattage", watts: 0 },
} as const;

export const POE_STANDARDS = {
  af: { label: "802.3af (PoE)", deviceW: 12.95 },
  at: { label: "802.3at (PoE+)", deviceW: 25.5 },
  bt: { label: "802.3bt (PoE++)", deviceW: 51 },
} as const;

export const POWER_CABLES = {
  "0.22": { label: "Alarm cable (0.22 mm²)", mm2: 0.22 },
  "0.5": { label: "Shotgun / 0.5 mm² power pair", mm2: 0.5 },
  "0.75": { label: "0.75 mm² flex", mm2: 0.75 },
  "1.0": { label: "1.0 mm² flex", mm2: 1 },
  "1.5": { label: "1.5 mm² flex", mm2: 1.5 },
} as const;

export type CameraLoadKey = keyof typeof CAMERA_LOADS;
export type PoeStandardKey = keyof typeof POE_STANDARDS;
export type PowerCableKey = keyof typeof POWER_CABLES;
export type Verdict = "ok" | "marginal" | "fail";

/** Copper resistivity used by the source (Ω·mm²/m). */
const COPPER = 0.0175;

export function powerCheck(input: {
  mode: "poe" | "dc";
  standard: PoeStandardKey;
  cable: PowerCableKey;
  length: number;
  watts: number;
}): { verdict: Verdict; lines: string[] } {
  const { length, watts } = input;
  if (input.mode === "poe") {
    const { label, deviceW } = POE_STANDARDS[input.standard];
    const lengthOk = length <= 100;
    const powerOk = watts <= deviceW;
    const headroom = deviceW - watts;
    return {
      verdict: lengthOk && powerOk ? (headroom < 3 ? "marginal" : "ok") : "fail",
      lines: [
        lengthOk
          ? `Your ${length}m run is inside the 100m limit for network cable.`
          : `Your ${length}m run is longer than the 100m that network cable allows. Shorten the route, or add a PoE extender or midspan.`,
        powerOk
          ? `A ${watts}W camera is within the ${deviceW}W a camera gets on ${label}, with ${headroom.toFixed(1)}W to spare.`
          : `${deviceW}W is the most a camera gets on ${label}, and this ${watts}W camera wants more. You’ll need ${input.standard === "af" ? "802.3at or bt" : "802.3bt"} ports for it.`,
        "Also compare against the switch’s overall power limit: a switch with eight PoE ports may not supply full power to all eight at once.",
      ],
    };
  }
  const cable = POWER_CABLES[input.cable];
  const amps = watts / 12;
  // Current flows out and back, so the copper length is twice the run.
  const drop = amps * ((2 * length * COPPER) / cable.mm2);
  const atCamera = 12 - drop;
  const verdict: Verdict = atCamera >= 11.4 ? "ok" : atCamera >= 10.8 ? "marginal" : "fail";
  return {
    verdict,
    lines: [
      `At 12V, a ${watts}W camera draws about ${amps.toFixed(2)}A. Through ${length}m of ${cable.label}, the drop is ${drop.toFixed(2)}V (${((drop / 12) * 100).toFixed(1)}%).`,
      `You’ll have about ${atCamera.toFixed(1)}V left when it reaches the camera. Most 12V cameras are happy with anything above about 10.8V. At night the infrared makes them draw more, so leave some spare.`,
      verdict === "ok"
        ? "This run is fine."
        : verdict === "marginal"
          ? "Marginal: the extra draw at night when the IR lights up could drop the voltage too far. Heavier cable, a nearer supply or PoE would give headroom."
          : "Too much voltage is lost on this run for a 12V camera. Shorten it, use heavier cable, add a local power supply, or move to PoE or 24V kit.",
    ],
  };
}

/** PoE switches the source suggests, with their port count. */
export const SWITCH_PICKS = [
  { slug: "4-port-gigabit-poe-extender-1000m-network-switch-repeater-ieee802-3af", value: 4 },
  { slug: "hikvision-ds-3e0510p-e-8-port-gigabit-poe-unmanaged-network-switch", value: 8 },
  { slug: "hikvision-ds-3e0109p-e-m-9-port-poe-switch-8-poe-100mbps-long-range", value: 9 },
  { slug: "hikvision-ds-3e0518p-e-16-port-gigabit-poe-unmanaged-network-switch", value: 16 },
  { slug: "hikvision-ds-3e0326p-e-m-b-24-port-poe-unmanaged-network-switch", value: 24 },
];

// ---------- shared ----------

/** A product suggestion resolved from the catalogue. Price is ex-VAT, as the source's tool pages show it. */
export interface Pick {
  slug: string;
  name: string;
  price: number | null;
  value: number;
}

export interface CameraPick extends Pick {
  lens: LensSpec;
}

export const fmt = (n: number, digits = 1) => n.toLocaleString("en-GB", { maximumFractionDigits: digits });
export const fmtPrice = (price: number) => `£${price.toFixed(2)}`;
