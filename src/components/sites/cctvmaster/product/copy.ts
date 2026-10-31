// Short, original product copy generated from the catalogue's structured data.
// The source's long-form descriptions and FAQ answers are deliberately not reproduced.
import type { Kit, Product } from "@/lib/cctvmaster/types";
import { deliveryFacts } from "@/lib/settings/format";
import type { DeliverySettings } from "@/lib/settings/schema";
import { plural, sortComponents, storageSize } from "./kit-logic";

export interface DescriptionBlock {
  lead?: { label: string; text: string };
  heading?: string;
  text?: string;
  points?: { label: string; text: string }[];
}

export interface Faq {
  q: string;
  a: string;
}

const SKIP_POINTS = /^(brand|products? id|part number|sku|ean|gtin|mpn)$/i;

const listJoin = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

const TIPS: Record<string, string> = {
  cameras:
    "Make sure your recorder supports this camera's video format and resolution, and that the lens angle suits the area you want to watch.",
  recorders:
    "Count every camera you plan to connect, including ones you might add later, and check the recorder handles their resolution.",
  storage: "Check how many drive bays your recorder has and the largest drive size it supports before you order.",
  "wire-&-cable": "Measure the whole cable route, including drops and bends, before choosing a length.",
  "data-comm-&-networking":
    "Compare port count, speed and PoE power budget with the devices you are going to plug in.",
  intrusion: "Confirm it works with your existing control panel and power supply before ordering.",
  accessories:
    "Compare the sizes and fittings listed below with the camera or equipment you plan to use it with.",
};
const DEFAULT_TIP = "Check the specifications below against your setup. If you are unsure, our sales team is happy to help.";

/** "Product Description" for a regular product. */
export function productDescription(p: Product): DescriptionBlock[] {
  const top = p.categoryPath?.[0];
  const leaf = p.categoryPath?.at(-1);
  const part = p.partNumbers?.mpn && p.partNumbers.mpn !== p.sku ? p.partNumbers.mpn : p.sku;
  const where = leaf ? ` It's listed under ${leaf.name}${top && top !== leaf ? ` in our ${top.name} range` : ""}.` : "";
  const blocks: DescriptionBlock[] = [
    {
      lead: {
        label: "In short:",
        text: `${p.name}${p.brand ? ` from ${p.brand}` : ""}, part number ${part}.${where}`,
      },
    },
  ];
  const points = (p.attributes ?? [])
    .filter((a) => !SKIP_POINTS.test(a.name) && a.value.length <= 90)
    .slice(0, 5)
    .map((a) => ({ label: a.name, text: a.value }));
  if (points.length) blocks.push({ heading: "Key details", points });
  blocks.push({ heading: "Before you buy", text: TIPS[top?.slug ?? ""] ?? DEFAULT_TIP });
  return blocks;
}

/** "Product Description" for a ready-made kit: what the bundle is built from, in plain words. */
export function kitDescription(p: Product, kit: Kit, days?: number): DescriptionBlock[] {
  const parts = sortComponents(kit.components);
  const recorder = parts.find((c) => c.role === "recorder");
  const cameras = parts.filter((c) => c.role === "camera").map((c) => `${c.qty} × ${c.name}`);
  const extras = parts.filter((c) => c.role === "psu" || c.role === "cable" || c.role === "accessory");
  const system = kit.systemType === "IP" ? "IP (PoE)" : "analogue HD";
  const blocks: DescriptionBlock[] = [];
  const intro = recorder
    ? `A ${kit.channelCount}-channel ${system} kit based on the ${recorder.name}.`
    : `A ${kit.channelCount}-channel ${system} kit.`;
  const camText = cameras.length ? ` It comes with ${listJoin(cameras)}.` : "";
  blocks.push({ text: `${intro}${camText}` });
  const size = storageSize(kit);
  if (size) {
    blocks.push({
      text: days
        ? `Footage is saved to ${size} of storage — roughly ${days} ${plural(days, "day")} of round-the-clock recording before the oldest footage is replaced.`
        : `Footage is saved to the included ${size} drive.`,
    });
  }
  if (extras.length) {
    blocks.push({
      text: `Also included: ${listJoin(extras.map((c) => `${c.qty} × ${c.name}`))}, so the kit arrives ready to fit.`,
    });
  }
  return blocks;
}

/** Brief planning notes for the "What's in the box" panel. */
export function kitPlanning(kit: Kit, days?: number) {
  const spare = kit.channelCount - kit.cameraCount;
  const capacity =
    kit.cameraCount === 0
      ? `The recorder has ${kit.channelCount} channels ready for your cameras. Check each camera's resolution is supported before you connect it.`
      : spare > 0
        ? `${kit.cameraCount} of the recorder's ${kit.channelCount} channels are in use, leaving ${spare} free for ${spare === 1 ? "an extra camera" : "extra cameras"} later. Make sure anything you add matches the resolutions the recorder supports.`
        : `All ${kit.channelCount} recorder channels are in use. To add more cameras later you'd need a recorder with more channels.`;
  const size = storageSize(kit);
  const storage = size
    ? days
      ? `${size} of storage is included — about ${days} ${plural(days, "day")} of continuous H.265 recording by our estimate. Motion-only recording, higher bitrates or busy scenes will change that figure.`
      : `${size} of storage is included. How long it lasts depends on the cameras, bitrate and recording schedule, so we don't quote a number of days for this one.`
    : undefined;
  const install =
    "The parts list shows which cables, power and mounting parts are included. Plan each camera position and cable run before you start, checking the view, lighting and weather exposure at every spot.";
  return [
    { title: "Recorder capacity", text: capacity },
    ...(storage ? [{ title: "Recording storage", text: storage }] : []),
    { title: "Before installation", text: install },
  ];
}

/** A few practical questions answered from the product's own facts and the shop's terms. */
export function productFaqs(p: Product, backorder: boolean, delivery: DeliverySettings): Faq[] {
  const mpn = p.partNumbers?.mpn;
  const d = deliveryFacts(delivery);
  return [
    {
      q: "What's the part number?",
      a: mpn && mpn !== p.sku ? `Our code is ${p.sku}; the manufacturer's part number is ${mpn}.` : `It's listed under part number ${p.sku}.`,
    },
    {
      q: "How quickly will it be sent?",
      a: backorder
        ? "It's on backorder. You can still add it to your basket, and you'll see how long it takes to arrange before you pay."
        : `Order before ${d.cutoff} on a weekday and in-stock items leave the same day.`,
    },
    {
      q: "How much is delivery?",
      a: d.alwaysFree
        ? "UK delivery is free on every order."
        : `UK delivery is ${d.fee}, or free when your order comes to ${d.freeFrom} or more (inc. VAT).`,
    },
    {
      q: "Can I send it back?",
      a: "Yes. You have 14 days to change your mind, and you don't need to give a reason.",
    },
  ];
}

/** Meta description when the product has no short description of its own. */
export function metaDescription(p: Product) {
  if (p.shortDescription) return p.shortDescription;
  const leaf = p.categoryPath?.at(-1)?.name;
  return `${p.name}${p.brand ? ` by ${p.brand}` : ""} (${p.sku})${leaf ? ` — ${leaf}` : ""}. UK delivery, secure checkout and 14 days to change your mind.`;
}
