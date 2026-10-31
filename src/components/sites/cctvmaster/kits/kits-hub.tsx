import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CONTAINER } from "./kit-sections";

export const BROWSE_PAGE_SIZE = 60;

export function KitsHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-100 bg-[#FAF9F6]">
      <div aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-[6px] bg-emerald-600 lg:block" />
      <div className={cn(CONTAINER, "py-12 sm:py-16")}>
        <div className="max-w-3xl">
          <p className="mb-3 font-mono text-xs tracking-widest text-emerald-700 uppercase">{eyebrow}</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl md:text-5xl">{title}</h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">{intro}</p>
        </div>
      </div>
    </section>
  );
}

const SIZES = [
  { label: "4 Camera Kits", href: "/categories/4-camera-kits" },
  { label: "8 Camera Kits", href: "/categories/8-camera-kits" },
  { label: "16 Camera Kits", href: "/categories/16-camera-kits" },
  { label: "4K Kits", href: "/categories/4k-kits" },
  { label: "5MP Kits", href: "/categories/5mp-kits" },
];

export function KitSizeLinks() {
  return (
    <nav id="kit-sizes" aria-label="Shop CCTV kits by size">
      <h2 className="text-foreground text-xl font-bold">Complete CCTV systems by size</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {SIZES.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="border-border hover:border-primary hover:text-primary inline-block rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm">
        <Link href="/categories/cctv-kits" className="text-primary font-semibold hover:underline">
          See every kit range
        </Link>
      </p>
    </nav>
  );
}

/** "Every kit, page by page" links to the plain /kits/browse/[n] directory. */
export function BrowsePagesNav({
  total,
  current,
  title,
  className,
}: {
  total: number;
  current?: number;
  title?: string;
  className?: string;
}) {
  const pages = Math.ceil(total / BROWSE_PAGE_SIZE);
  return (
    <nav aria-label={current ? "Kit directory pages" : "Every kit"} className={cn("mt-8", className)}>
      <h2 className={cn("text-foreground text-lg font-semibold", current && "mb-3")}>
        {title ?? `Every kit, page by page (${total.toLocaleString("en-GB")} in total)`}
      </h2>
      <ul className={cn("flex flex-wrap gap-1.5", !current && "mt-3")}>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            <Link
              href={`/kits/browse/${n}`}
              aria-current={n === current ? "page" : undefined}
              className={cn(
                "inline-block min-w-9 rounded border px-2 py-1 text-center text-sm",
                n === current
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border hover:border-primary hover:text-primary",
              )}
            >
              {n}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const MORE: { id: string; title: string; body: string; links: { label: string; href: string }[] }[] = [
  {
    id: "4-camera",
    title: "Four-camera systems",
    body: "Four cameras suit most houses: one each for the front, the back, the side and the drive. A 4-channel recorder takes all four, and a 1–2TB drive keeps a couple of weeks of footage.",
    links: [
      { label: "Build your 4-camera kit", href: "/kit-builder" },
      { label: "See 4-channel NVRs", href: "/collections/hikvision-nvrs" },
    ],
  },
  {
    id: "8-camera",
    title: "Eight-camera systems",
    body: "Eight cameras are for larger homes and small businesses — doors, tills, stock and the yard. On network kits, check the recorder can power every camera you plan to run.",
    links: [
      { label: "Build your 8-camera kit", href: "/kit-builder" },
      { label: "Work out the PoE budget", href: "/tools/poe-voltage-drop-calculator" },
    ],
  },
  {
    id: "poe",
    title: "PoE kits",
    body: "Power over Ethernet sends power and picture down one network cable per camera, so there are no plug sockets to find on the wall. Adding a camera later means running one more cable.",
    links: [
      { label: "PoE switches", href: "/categories/data-comm-networking-hubs-routers-switches-poe-switches" },
      { label: "Cameras", href: "/categories/cameras" },
    ],
  },
  {
    id: "hikvision",
    title: "Hikvision kits",
    body: "When the recorder and cameras come from the same family, smart detection and playback search work across the whole system and everything runs in one app.",
    links: [
      { label: "Hikvision NVRs", href: "/collections/hikvision-nvrs" },
      { label: "Everything Hikvision", href: "/brands/hikvision" },
    ],
  },
];

export function KitsMoreInfo() {
  return (
    <div className="mt-10 max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-600">
      {MORE.map((m) => (
        <section key={m.id} id={m.id} className="scroll-mt-28 pt-4">
          <h2 className="text-foreground text-lg font-semibold">{m.title}</h2>
          <p>{m.body}</p>
          <p>
            {m.links.map((l, i) => (
              <span key={l.href + l.label}>
                {i > 0 && <span> · </span>}
                <Link href={l.href} className="text-primary font-semibold hover:underline">
                  {l.label}
                </Link>
              </span>
            ))}
          </p>
        </section>
      ))}
      <section className="pt-6">
        <h2 className="text-foreground text-lg font-semibold">Ready-made kit, or build your own?</h2>
        <p>
          <span>
            A ready-made kit is the quickest route: the parts are matched and priced as one. If you want a particular
            mix of cameras, the{" "}
          </span>
          <Link href="/kit-builder" className="text-primary font-semibold hover:underline">
            kit builder
          </Link>
          <span> walks you through each part, the </span>
          <Link href="/tools/cctv-storage-calculator" className="text-primary font-semibold hover:underline">
            storage calculator
          </Link>
          <span> sizes the drive, and </span>
          <Link href="/contact" className="text-primary font-semibold hover:underline">
            our engineers
          </Link>
          <span> will check your spec for free.</span>
        </p>
      </section>
    </div>
  );
}
