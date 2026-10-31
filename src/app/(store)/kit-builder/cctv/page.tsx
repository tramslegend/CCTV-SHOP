import type { Metadata } from "next";
import { getBuilderCatalog, seedFromKit, seedFromParts } from "@/components/sites/cctvmaster/kits/builder-data";
import { KitBuilder } from "@/components/sites/cctvmaster/kits/kit-builder";
import { STORE_HEADINGS } from "@/components/sites/cctvmaster/kits/kit-sections";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";

export const metadata: Metadata = {
  title: "CCTV Kit Builder — Put Your System Together One Step at a Time",
  description:
    "Build your own CCTV system one step at a time: choose the system type, picture detail, cameras, recorder and storage.",
  alternates: { canonical: "/kit-builder/cctv" },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CctvKitBuilderPage({ searchParams }: PageProps<"/kit-builder/cctv">) {
  await ensureCatalog();
  const sp = await searchParams;
  const kit = one(sp.kit);
  const seed = kit
    ? seedFromKit(kit)
    : seedFromParts({ recorder: one(sp.recorder), camera: one(sp.camera), n: one(sp.n), storage: one(sp.storage) });
  return (
    <div className={STORE_HEADINGS}>
      <h1 className="sr-only">CCTV Kit Builder</h1>
      <KitBuilder
        key={kit ?? [one(sp.recorder), one(sp.camera), one(sp.n), one(sp.storage)].join("|")}
        catalog={getBuilderCatalog()}
        seed={seed}
      />
    </div>
  );
}
