"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BELOW_DETECT,
  DORI,
  DORI_COPY,
  FOCAL_LENGTHS,
  LENS_RESOLUTIONS,
  SENSORS,
  fieldOfView,
  fmt,
  fmtPrice,
  lensFits,
  type CameraPick,
  type LensResolutionKey,
  type SensorKey,
} from "./tool-data";
import { calcCard, calcInput, calcLabel, statLabel, statNote, statValue } from "./tool-page";

const SENSOR_NOTE =
  "Results depend on the sensor size selected above — check the camera’s spec, since a larger sensor gives a wider view through the same lens.";

export function LensCalculator({ picks }: { picks: CameraPick[] }) {
  const [sensor, setSensor] = useState<SensorKey>("1/2.8");
  const [focal, setFocal] = useState(2.8);
  const [distance, setDistance] = useState(10);
  const [resolution, setResolution] = useState<LensResolutionKey>("4mp");

  const result = useMemo(() => fieldOfView({ sensor, focal, distance, resolution }), [sensor, focal, distance, resolution]);

  const matches = useMemo(() => {
    const fitting = picks.filter((p) => lensFits(p.lens, focal));
    const fixed = fitting.filter((p) => p.lens.kind === "fixed");
    const vari = fitting.filter((p) => p.lens.kind === "varifocal");
    return { onlyVarifocal: fixed.length === 0, all: [...fixed, ...vari].slice(0, 6) };
  }, [picks, focal]);

  return (
    <div className={calcCard}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="lens-focal" className={calcLabel}>
            Lens (focal length)
          </label>
          <select id="lens-focal" value={focal} onChange={(e) => setFocal(Number(e.target.value))} className={calcInput}>
            {FOCAL_LENGTHS.map((mm) => (
              <option key={mm} value={mm}>
                {mm} mm
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lens-sensor" className={calcLabel}>
            Sensor
          </label>
          <select id="lens-sensor" value={sensor} onChange={(e) => setSensor(e.target.value as SensorKey)} className={calcInput}>
            {Object.entries(SENSORS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lens-distance" className={calcLabel}>
            Distance to target (m)
          </label>
          <input
            id="lens-distance"
            type="number"
            min={1}
            max={200}
            value={distance}
            onChange={(e) => setDistance(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
            className={calcInput}
          />
        </div>
        <div>
          <label htmlFor="lens-res" className={calcLabel}>
            Resolution
          </label>
          <select
            id="lens-res"
            value={resolution}
            onChange={(e) => setResolution(e.target.value as LensResolutionKey)}
            className={calcInput}
          >
            {Object.entries(LENS_RESOLUTIONS).map(([key, r]) => (
              <option key={key} value={key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-border mt-7 grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-3" aria-live="polite">
        <div>
          <p className={statLabel}>Field of view</p>
          <p className={statValue}>{fmt(result.fovDeg, 0)}°</p>
          <p className={statNote}>horizontal angle</p>
        </div>
        <div>
          <p className={statLabel}>Scene width at {distance}m</p>
          <p className={statValue}>{fmt(result.sceneWidth)} m</p>
          <p className={statNote}>what the frame covers</p>
        </div>
        <div>
          <p className={statLabel}>Detail level</p>
          <p className={statValue}>
            {fmt(result.ppm, 0)} <span className="text-lg font-semibold">ppm</span>
          </p>
          <p className={statNote}>{result.achieved ? DORI_COPY[result.achieved.name] : BELOW_DETECT}</p>
        </div>
      </div>

      <div className="border-border mt-6 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-left text-xs tracking-wider uppercase">
              <th className="px-3 py-2 font-semibold">DORI level</th>
              <th className="px-3 py-2 font-semibold">Needs</th>
              <th className="px-3 py-2 font-semibold">This setup</th>
            </tr>
          </thead>
          <tbody>
            {DORI.map((level) => (
              <tr key={level.name} className="border-border border-t">
                <td className="text-foreground px-3 py-2 font-medium">{level.name}</td>
                <td className="text-muted-foreground px-3 py-2 tabular-nums">≥ {level.ppm} ppm</td>
                <td className="px-3 py-2">
                  {result.ppm >= level.ppm ? (
                    <span className="font-semibold text-brand-700">Yes</span>
                  ) : (
                    <span className="text-muted-foreground">up to ~{fmt(result.rangeFor(level.ppm))} m</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {matches.all.length > 0 && (
        <div className="border-border mt-6 rounded-lg border p-4">
          <h3 className="text-foreground text-sm font-semibold">Our cameras at {focal} mm</h3>
          {matches.onlyVarifocal && (
            <p className="text-muted-foreground mt-1 text-xs">
              None of our cameras has a fixed {focal} mm lens, but these varifocal ones can be set to {focal} mm when
              they’re fitted.
            </p>
          )}
          <ul className="mt-3 space-y-1.5">
            {matches.all.map((pick) => (
              <li key={pick.slug}>
                <Link
                  href={`/products/${pick.slug}`}
                  className="hover:bg-muted/60 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-foreground text-sm font-medium">
                      {pick.lens.kind === "fixed"
                        ? `${pick.lens.min} mm fixed`
                        : `${pick.lens.min}-${pick.lens.max} mm varifocal`}
                    </span>
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
          <p className="text-muted-foreground mt-2.5 text-xs">{SENSOR_NOTE}</p>
        </div>
      )}
    </div>
  );
}
