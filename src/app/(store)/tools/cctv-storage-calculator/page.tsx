import type { Metadata } from "next";
import { resolvePicks } from "@/components/sites/cctvmaster/tools/resolve-picks";
import { StorageCalculator } from "@/components/sites/cctvmaster/tools/storage-calculator";
import { DRIVE_PICKS } from "@/components/sites/cctvmaster/tools/tool-data";
import { ToolPage } from "@/components/sites/cctvmaster/tools/tool-page";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";

export const metadata: Metadata = {
  title: "CCTV Storage Calculator",
  description:
    "Work out the hard drive size and network bandwidth your CCTV recorder needs from cameras, resolution, codec, frame rate and days of footage.",
};

export default async function StorageCalculatorPage() {
  await ensureCatalog();
  return (
    <ToolPage
      title="CCTV storage calculator"
      lede="How big a hard drive does your recorder need? Pick your cameras, resolution, codec, frame rate and how many days of footage you want to keep, and we’ll size the drive and the network bandwidth for you."
      explainerTitle="How we work it out"
      explainer={[
        "Each resolution starts from a typical H.264 bitrate at 25 frames a second. We scale that for the codec (H.265 roughly halves it, smart codecs go further), for your frame rate and for how much of the day the recorder is actually writing, then multiply by the number of cameras and days.",
        "Treat the answer as a planning figure rather than a promise: busy scenes, night-time noise and encoder settings all move real bitrates. Round up to the next drive size, and fit surveillance-rated drives.",
      ]}
    >
      <StorageCalculator picks={resolvePicks(DRIVE_PICKS)} />
    </ToolPage>
  );
}
