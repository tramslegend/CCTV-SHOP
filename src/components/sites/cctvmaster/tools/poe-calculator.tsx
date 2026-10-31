"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CAMERA_LOADS,
  POE_STANDARDS,
  POWER_CABLES,
  fmtPrice,
  powerCheck,
  type CameraLoadKey,
  type Pick,
  type PoeStandardKey,
  type PowerCableKey,
} from "./tool-data";
import { calcCard, calcInput, calcLabel } from "./tool-page";

const VERDICTS = {
  ok: { text: "This run will work", className: "text-emerald-700" },
  marginal: { text: "Only just", className: "text-amber-700" },
  fail: { text: "This run won’t work", className: "text-red-700" },
};

const NOTE =
  "A switch can have a free port and still not power another camera. Sum every camera’s wattage and check it against the switch’s overall PoE allowance.";

export function PoeCalculator({ picks }: { picks: Pick[] }) {
  const [mode, setMode] = useState<"poe" | "dc">("poe");
  const [standard, setStandard] = useState<PoeStandardKey>("af");
  const [cable, setCable] = useState<PowerCableKey>("0.5");
  const [length, setLength] = useState(30);
  const [camera, setCamera] = useState<CameraLoadKey>("dome");
  const [customWatts, setCustomWatts] = useState(8);

  const watts = camera === "custom" ? Math.max(1, customWatts) : CAMERA_LOADS[camera].watts;
  const result = useMemo(
    () => powerCheck({ mode, standard, cable, length, watts }),
    [mode, standard, cable, length, watts],
  );
  const verdict = VERDICTS[result.verdict];

  const toggle = (active: boolean) =>
    cn(
      "rounded-lg border px-4 py-2 text-sm font-semibold transition-colors",
      active ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground",
    );

  return (
    <div className={calcCard}>
      <div className="mb-5 flex gap-2" role="group" aria-label="Powering method">
        <button type="button" onClick={() => setMode("poe")} aria-pressed={mode === "poe"} className={toggle(mode === "poe")}>
          PoE
        </button>
        <button type="button" onClick={() => setMode("dc")} aria-pressed={mode === "dc"} className={toggle(mode === "dc")}>
          12V DC
        </button>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="pv-camera" className={calcLabel}>
            Camera
          </label>
          <select id="pv-camera" value={camera} onChange={(e) => setCamera(e.target.value as CameraLoadKey)} className={calcInput}>
            {Object.entries(CAMERA_LOADS).map(([key, c]) => (
              <option key={key} value={key}>
                {`${c.label}${c.watts ? ` (~${c.watts}W)` : ""}`}
              </option>
            ))}
          </select>
        </div>
        {camera === "custom" && (
          <div>
            <label htmlFor="pv-watts" className={calcLabel}>
              Camera draw (W)
            </label>
            <input
              id="pv-watts"
              type="number"
              min={1}
              max={100}
              value={customWatts}
              onChange={(e) => setCustomWatts(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className={calcInput}
            />
          </div>
        )}
        <div>
          <label htmlFor="pv-length" className={calcLabel}>
            Cable run (m)
          </label>
          <input
            id="pv-length"
            type="number"
            min={1}
            max={500}
            value={length}
            onChange={(e) => setLength(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            className={calcInput}
          />
        </div>
        {mode === "poe" ? (
          <div>
            <label htmlFor="pv-standard" className={calcLabel}>
              PoE standard
            </label>
            <select
              id="pv-standard"
              value={standard}
              onChange={(e) => setStandard(e.target.value as PoeStandardKey)}
              className={calcInput}
            >
              {Object.entries(POE_STANDARDS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="pv-wire" className={calcLabel}>
              Power cable
            </label>
            <select id="pv-wire" value={cable} onChange={(e) => setCable(e.target.value as PowerCableKey)} className={calcInput}>
              {Object.entries(POWER_CABLES).map(([key, c]) => (
                <option key={key} value={key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="border-border mt-7 border-t pt-6" aria-live="polite">
        <p className={cn("text-xs font-semibold tracking-wider uppercase", verdict.className)}>{verdict.text}</p>
        <ul className="mt-2 space-y-2">
          {result.lines.map((line) => (
            <li key={line} className="text-muted-foreground text-sm leading-relaxed">
              {line}
            </li>
          ))}
        </ul>
      </div>

      {picks.length > 0 && (
        <div className="border-border mt-6 border-t pt-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-foreground text-sm font-semibold">Our PoE switches</h3>
            <Link
              href="/categories/data-comm-networking"
              className="text-muted-foreground hover:text-foreground text-xs font-semibold underline underline-offset-2"
            >
              See all networking
            </Link>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {picks.map((pick) => (
              <li key={pick.slug}>
                <Link
                  href={`/products/${pick.slug}`}
                  className="border-border hover:border-foreground/30 flex items-baseline justify-between gap-3 rounded-md border px-3 py-2.5 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="text-foreground block text-sm font-medium">{pick.value} port</span>
                    <span className="text-muted-foreground line-clamp-1 text-xs">{pick.name}</span>
                  </span>
                  {pick.price !== null ? (
                    <span className="text-foreground shrink-0 text-sm font-semibold tabular-nums">{fmtPrice(pick.price)}</span>
                  ) : (
                    <span className="text-muted-foreground shrink-0 text-xs font-medium">Ask for price</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-2.5 text-xs">{NOTE}</p>
        </div>
      )}
    </div>
  );
}
