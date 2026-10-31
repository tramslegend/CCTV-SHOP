import type { Metadata } from "next";
import { PoeCalculator } from "@/components/sites/cctvmaster/tools/poe-calculator";
import { resolvePicks } from "@/components/sites/cctvmaster/tools/resolve-picks";
import { SWITCH_PICKS } from "@/components/sites/cctvmaster/tools/tool-data";
import { ToolPage } from "@/components/sites/cctvmaster/tools/tool-page";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";

export const metadata: Metadata = {
  title: "PoE & Voltage Drop Calculator",
  description:
    "Check a CCTV camera will power up at the end of its cable: PoE distance and power budget, or 12V DC voltage drop by cable size and length.",
};

export default async function PoeVoltageDropCalculatorPage() {
  await ensureCatalog();
  return (
    <ToolPage
      title="PoE & voltage drop calculator"
      lede="Check a camera will work at the end of its cable before you run it. On PoE we check the 100m limit and the power the camera gets; on 12V we work out how much voltage the cable loses — and if the run won’t work, you’ll see what to change."
      explainerTitle="The simple rules behind it"
      explainer={[
        "Network cable carries PoE for up to 100m. 802.3af delivers 12.95W to the camera, 802.3at 25.5W and 802.3bt 51W, and the switch’s total PoE budget matters as much as any single port.",
        "On 12V the cable is the limit. Current flows out and back, so the loss doubles with the length of the run and halves each time the conductor size doubles. Aim to keep at least 10.8V at the camera, and allow for infrared raising the draw at night.",
      ]}
      links={[
        { label: "PoE switches", href: "/categories/data-comm-networking-hubs-routers-switches-poe-switches" },
        { label: "CCTV power supplies", href: "/categories/accessories-power" },
        { label: "CCTV cable", href: "/categories/wire-cable" },
      ]}
    >
      <PoeCalculator picks={resolvePicks(SWITCH_PICKS)} />
    </ToolPage>
  );
}
