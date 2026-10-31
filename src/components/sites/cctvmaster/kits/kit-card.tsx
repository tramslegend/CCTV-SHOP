import Image from "next/image";
import Link from "next/link";
import { House } from "lucide-react";
import { cn } from "@/lib/utils";
import { COVERS, type KitSummary } from "./kit-model";

/** Price as the source renders it on kit cards: small £, raised pence, "inc. VAT". */
export function KitPrice({ value, className }: { value: number; className?: string }) {
  const [pounds, pence] = value.toFixed(2).split(".");
  const label = `£${Number(pounds).toLocaleString("en-GB")}.${pence}`;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className="text-foreground inline-flex items-start text-2xl leading-none font-bold tabular-nums"
        aria-label={label}
      >
        <span className="mt-0.5 text-[0.6em] font-semibold" aria-hidden="true">
          £
        </span>
        <span aria-hidden="true">{Number(pounds).toLocaleString("en-GB")}</span>
        <span className="sr-only">.</span>
        <span className="mt-0.5 ml-0.5 text-[0.5em] font-semibold" aria-hidden="true">
          {pence}
        </span>
      </span>
      <span className="text-muted-foreground self-end text-[11px] font-medium">inc. VAT</span>
    </div>
  );
}

const MAX_THUMBS = 16;

/** Ready-made kit card (listing, best sellers, premises pages). */
export function KitCard({ kit, preload = false }: { kit: KitSummary; preload?: boolean }) {
  const spare = kit.channelCount - kit.cameraCount;
  const covers = kit.use ? COVERS[kit.use] : "A recorder and drive to build on";
  const headroom =
    kit.use && spare > 0 ? ` — space to add ${spare} more ${spare === 1 ? "camera" : "cameras"}` : "";
  const save = kit.partsTotal ? Math.round((kit.partsTotal - kit.price) * 100) / 100 : 0;
  return (
    <Link
      href={kit.href}
      className="group bg-card hover:border-primary/50 flex flex-col overflow-hidden rounded-2xl border transition-all hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
        {kit.image && (
          <Image
            src={kit.image}
            alt={kit.imageAlt}
            fill
            preload={preload}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {/* The source badges every listed kit "Available"; back-ordered ones are only told apart by the stock filter. */}
        <div className="absolute top-2 left-2">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Available
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="space-y-0.5">
          <span className="text-muted-foreground group-hover:text-primary block text-xs font-semibold tracking-wide uppercase transition-colors">
            {kit.headline}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {kit.cameraCount > 0 ? (
              <>
                <span className="text-primary text-4xl leading-none font-extrabold tabular-nums">{kit.cameraCount}</span>
                <span className="text-foreground text-base font-semibold">
                  {kit.cameraCount === 1 ? "camera" : "cameras"}
                </span>
              </>
            ) : (
              <span className="text-foreground text-base font-semibold">Recorder and hard drive</span>
            )}
            {kit.resLabel && (
              <span className="border-border text-foreground ml-auto rounded-full border px-2.5 py-1 text-xs font-bold">
                {kit.resLabel}
              </span>
            )}
          </span>
        </h3>
        {kit.cameraGroups.length > 0 && (
          <ul className="space-y-1.5">
            {kit.cameraGroups.map((g, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-[5.75rem] shrink-0 text-xs leading-tight">
                  <span className="text-primary font-bold">{g.qty}×</span>{" "}
                  <span className="text-foreground font-medium">{g.label}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-start gap-[3px]" aria-hidden="true">
                  {g.image &&
                    Array.from({ length: Math.min(g.qty, MAX_THUMBS) }, (_, n) => (
                      <Image
                        key={n}
                        src={g.image!}
                        alt=""
                        width={26}
                        height={26}
                        className="rounded-[3px] bg-white object-contain ring-1 ring-black/5 dark:bg-gray-100"
                        style={{ width: 26, height: 26 }}
                      />
                    ))}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="bg-muted/50 flex items-center gap-2.5 rounded-lg px-2.5 py-2">
          {kit.recorderImage && (
            <Image
              src={kit.recorderImage}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded bg-white object-contain ring-1 ring-black/5 dark:bg-gray-100"
            />
          )}
          <div className="min-w-0 text-xs leading-tight">
            <p className="text-foreground font-semibold">
              {kit.recorderLabel}
              {kit.storageLabel && (
                <>
                  {" "}
                  · <span className="font-bold">{kit.storageLabel}</span>
                </>
              )}
            </p>
            {kit.recordingDays ? (
              <p className="text-muted-foreground">Keeps about {kit.recordingDays} days of footage</p>
            ) : (
              <p className="text-muted-foreground">Add cameras to start recording</p>
            )}
          </div>
        </div>
        <div className="mt-auto space-y-1">
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs leading-snug">
            <House className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {covers}
            {headroom}
          </p>
          <p className="text-muted-foreground text-xs leading-snug">
            {kit.system === "IP"
              ? "One cable per camera does power and picture"
              : "Works with the coax cable from an old system"}
          </p>
        </div>
        {kit.partsTotal && save > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">
              Buying the parts one by one <s className="tabular-nums">£{kit.partsTotal.toFixed(2)}</s>
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              You save £{save.toFixed(2)} ({kit.savingPercent}% off)
            </span>
          </p>
        )}
        <div className="flex items-center gap-2 text-lg font-bold">
          <div className="flex flex-col">
            <KitPrice value={kit.price} />
          </div>
        </div>
      </div>
    </Link>
  );
}
