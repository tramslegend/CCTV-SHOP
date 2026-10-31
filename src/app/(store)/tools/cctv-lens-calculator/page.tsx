import type { Metadata } from "next";
import { LensCalculator } from "@/components/sites/cctvmaster/tools/lens-calculator";
import { resolveCameraPicks } from "@/components/sites/cctvmaster/tools/resolve-picks";
import { CAMERA_PICKS } from "@/components/sites/cctvmaster/tools/tool-data";
import { ToolPage } from "@/components/sites/cctvmaster/tools/tool-page";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";

export const metadata: Metadata = {
  title: "CCTV Lens Calculator",
  description:
    "Field of view, scene width and pixels per metre for any CCTV lens, sensor and resolution, checked against the DORI identify, recognise, observe and detect levels.",
};

export default async function LensCalculatorPage() {
  await ensureCatalog();
  return (
    <ToolPage
      title="CCTV lens calculator"
      lede="Choose the right lens before the camera goes up. Set the lens, sensor, resolution and distance to see how wide the picture is, how much detail you get, and whether that’s enough to identify someone under the DORI standard."
      explainerTitle="What the numbers mean"
      explainer={[
        "The angle of view comes from the sensor width and the focal length. Spread the camera’s horizontal pixels across the width of the scene and you get pixels per metre (ppm), the figure the DORI standard (IEC 62676-4) is written in: 250 ppm to identify, 125 to recognise, 62 to observe and 25 to detect.",
        "A short lens covers more ground with less detail; a longer one does the opposite. A common answer is a wide camera for the overview plus a tighter one on the approach, or a varifocal lens you can set on site.",
      ]}
      links={[
        { label: "Cameras", href: "/categories/cameras" },
        { label: "Storage calculator", href: "/tools/cctv-storage-calculator" },
        { label: "PoE & voltage calculator", href: "/tools/poe-voltage-drop-calculator" },
      ]}
    >
      <LensCalculator picks={resolveCameraPicks(CAMERA_PICKS)} />
    </ToolPage>
  );
}
