import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Camera, ChevronRight, DoorOpen, Flame, Phone, Shield } from "lucide-react";
import { CONTAINER, STORE_HEADINGS } from "@/components/sites/cctvmaster/kits/kit-sections";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "CCTV Kit Builder: Build Your Own System Step by Step",
  description:
    "Build your own CCTV system step by step: pick a recorder, cameras, storage and cables, and get a tailored kit matched to your home or business. No minimum order.",
  alternates: { canonical: "/kit-builder" },
};

const cardClass =
  "bg-card text-card-foreground group relative flex h-full flex-col gap-6 overflow-hidden rounded-xl border py-6 shadow-sm transition-all";

function BuilderCard({
  icon,
  tone,
  title,
  body,
  soon,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  body: string;
  soon?: boolean;
}) {
  return (
    <div data-slot="card" className={cn(cardClass, soon ? "opacity-60" : "hover:border-primary/30 cursor-pointer hover:shadow-lg")}>
      <div data-slot="card-content" className="flex items-start gap-4 p-6">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", tone)}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-lg font-bold">{title}</h2>
            {soon && (
              <span
                data-slot="badge"
                className="bg-secondary text-secondary-foreground inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
              >
                Coming soon
              </span>
            )}
          </div>
          <p className="text-muted-foreground mb-3 text-sm">{body}</p>
          {!soon && (
            <span className="text-primary inline-flex items-center gap-1 text-sm font-semibold">
              Get started
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KitBuilderLandingPage() {
  return (
    <div className={cn("min-h-screen", STORE_HEADINGS)}>
      <section className="from-primary/5 to-background bg-gradient-to-b px-4 py-12 md:py-20">
        <div className={cn(CONTAINER, "text-center")}>
          <div className="bg-background mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5">
            <Shield className="text-primary h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-medium">Kit builder</span>
          </div>
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
            Put together your own <span className="italic">security system</span>
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl md:text-lg">
            Pick the kind of system you want below and we&apos;ll walk you through choosing each part, one step at a time.
            Answer a few simple questions and we&apos;ll suggest a kit that suits you.
          </p>
        </div>
      </section>
      <section className="px-4 py-8 md:py-12">
        <div className={CONTAINER}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/kit-builder/cctv">
              <BuilderCard
                icon={<Camera className="h-6 w-6" aria-hidden="true" />}
                tone="text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
                title="CCTV systems"
                body="Build a full CCTV system one step at a time: recorder, cameras, storage, cables and extras."
              />
            </Link>
            <BuilderCard
              soon
              icon={<Flame className="h-6 w-6" aria-hidden="true" />}
              tone="text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950"
              title="Fire alarms"
              body="Plan a fire alarm for your property, with a control panel, detectors, sounders and call points."
            />
            <BuilderCard
              soon
              icon={<DoorOpen className="h-6 w-6" aria-hidden="true" />}
              tone="text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950"
              title="Access control"
              body="Control who gets through your doors — keypads, card readers, magnetic locks and the software to manage them."
            />
            <BuilderCard
              soon
              icon={<Phone className="h-6 w-6" aria-hidden="true" />}
              tone="text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950"
              title="Intercoms"
              body="Audio and video intercoms for answering the door, at home or at a business."
            />
          </div>
        </div>
      </section>
    </div>
  );
}
