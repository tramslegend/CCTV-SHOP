import { Box, Cable, Camera, HardDrive, MonitorPlay, Package, Plug, Settings2, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Kit, KitComponent } from "@/lib/cctvmaster/types";
import { kitPlanning } from "./copy";
import { ROLE_COPY, kitSummary, kitTags, sortComponents } from "./kit-logic";
import { SectionCard } from "./section-card";

const ROLE_ICON: Record<string, LucideIcon> = {
  recorder: MonitorPlay,
  camera: Camera,
  storage: HardDrive,
  psu: Plug,
  cable: Cable,
  accessory: Box,
};

const cardClass = "flex items-start gap-3 rounded-xl border border-border bg-surface/50 p-3";

function Part({ part, href }: { part: KitComponent; href?: string }) {
  const role = ROLE_COPY[part.role] ?? ROLE_COPY.other;
  const Icon = ROLE_ICON[part.role] ?? Package;
  const body = (
    <>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
        {part.image && <Image src={part.image} alt={part.name} fill sizes="56px" className="object-contain p-1" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {role.label}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm font-medium">
          <span className="text-foreground text-base font-bold">{part.qty}×</span> {part.name}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{role.text}</p>
      </div>
    </>
  );
  return (
    <li className="relative">
      {href ? (
        <Link aria-label={`View ${part.name}`} href={href} className={`${cardClass} hover:border-primary/60 transition-colors hover:bg-white`}>
          {body}
        </Link>
      ) : (
        <div className={cardClass}>{body}</div>
      )}
    </li>
  );
}

/** "What's in the box" panel of a ready-made kit. */
export function KitBox({
  kit,
  sku,
  days,
  partHref,
}: {
  kit: Kit;
  sku: string;
  days?: number;
  /** Local page of a component, when one exists. */
  partHref: (part: KitComponent) => string | undefined;
}) {
  // The local kit builder loads a ready-made kit by its SKU.
  const customise = `/kit-builder/cctv?kit=${encodeURIComponent(sku)}`;
  return (
    <SectionCard title="What's in the box" id="kit-box-heading" headingClassName="mb-2">
      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
        Here&apos;s what comes in the box and how many you get of each. Tap any part for the full spec.
      </p>
      <p className="text-foreground mb-5 text-sm leading-relaxed">{kitSummary(kit, days)}</p>
      <section aria-label="Planning this configuration" className="mb-6 space-y-4">
        {kitPlanning(kit, days).map((block) => (
          <div key={block.title}>
            <h3 className="text-sm font-semibold">{block.title}</h3>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{block.text}</p>
          </div>
        ))}
      </section>
      <ul className="mb-6 flex flex-wrap gap-2" aria-label="Kit summary">
        {kitTags(kit).map((tag) => (
          <li
            key={tag}
            className="bg-secondary text-secondary-foreground inline-flex w-fit shrink-0 items-center justify-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap"
          >
            {tag}
          </li>
        ))}
      </ul>
      <ul className="grid gap-3 sm:grid-cols-2">
        {sortComponents(kit.components).map((part) => (
          <Part key={`${part.role}-${part.sku}`} part={part} href={partHref(part)} />
        ))}
      </ul>
      <div className="mt-6 rounded-xl border border-border bg-surface/50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Want other cameras, more storage or longer cables? Load this kit into the builder and swap whatever you like —
          every change is checked so the parts still work together.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:shrink-0">
          <Link
            href={customise}
            className="border-border hover:border-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            Swap something in this kit
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}
