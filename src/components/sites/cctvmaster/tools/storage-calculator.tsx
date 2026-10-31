"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CODECS,
  FRAME_RATES,
  RECORDING,
  RESOLUTIONS,
  RETENTION_DAYS,
  fmt,
  fmtPrice,
  storageNeeded,
  type CodecKey,
  type Pick,
  type RecordingKey,
  type ResolutionKey,
} from "./tool-data";
import { calcCard, calcInput, calcLabel, statLabel, statNote, statValue } from "./tool-page";

const NOTE =
  "Pick a surveillance-rated drive: recorders write all day, every day, and ordinary desktop drives tend to wear out early under that load.";

export function StorageCalculator({ picks }: { picks: Pick[] }) {
  const [cameras, setCameras] = useState(8);
  const [resolution, setResolution] = useState<ResolutionKey>("4mp");
  const [codec, setCodec] = useState<CodecKey>("h265");
  const [fps, setFps] = useState(15);
  const [recording, setRecording] = useState<RecordingKey>("motion-busy");
  const [days, setDays] = useState(30);

  const result = useMemo(
    () => storageNeeded({ cameras, resolution, codec, fps, recording, days }),
    [cameras, resolution, codec, fps, recording, days],
  );

  const covering = picks.filter((p) => p.value >= result.totalTb);
  const shown = covering.length > 0 ? covering.slice(0, 2) : picks.slice(-1);

  return (
    <div className={calcCard}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="calc-cameras" className={calcLabel}>
            Cameras
          </label>
          <input
            id="calc-cameras"
            type="number"
            min={1}
            max={256}
            value={cameras}
            onChange={(e) => setCameras(Math.max(1, Math.min(256, Number(e.target.value) || 1)))}
            className={calcInput}
          />
        </div>
        <div>
          <label htmlFor="calc-resolution" className={calcLabel}>
            Resolution
          </label>
          <select
            id="calc-resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value as ResolutionKey)}
            className={calcInput}
          >
            {Object.entries(RESOLUTIONS).map(([key, r]) => (
              <option key={key} value={key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="calc-codec" className={calcLabel}>
            Codec
          </label>
          <select id="calc-codec" value={codec} onChange={(e) => setCodec(e.target.value as CodecKey)} className={calcInput}>
            {Object.entries(CODECS).map(([key, c]) => (
              <option key={key} value={key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="calc-fps" className={calcLabel}>
            Frame rate (fps)
          </label>
          <select id="calc-fps" value={fps} onChange={(e) => setFps(Number(e.target.value))} className={calcInput}>
            {FRAME_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate} fps
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="calc-recording" className={calcLabel}>
            Recording mode
          </label>
          <select
            id="calc-recording"
            value={recording}
            onChange={(e) => setRecording(e.target.value as RecordingKey)}
            className={calcInput}
          >
            {Object.entries(RECORDING).map(([key, r]) => (
              <option key={key} value={key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="calc-days" className={calcLabel}>
            Retention (days)
          </label>
          <select id="calc-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className={calcInput}>
            {RETENTION_DAYS.map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-border mt-7 grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-3" aria-live="polite">
        <div>
          <p className={statLabel}>Storage needed</p>
          <p className={statValue}>
            {result.totalTb >= 1 ? `${fmt(result.totalTb)} TB` : `${fmt(result.totalTb * 1000, 0)} GB`}
          </p>
          <p className={statNote}>Suggested: {result.drives}</p>
        </div>
        <div>
          <p className={statLabel}>Recording bandwidth</p>
          <p className={statValue}>{fmt(result.totalMbps)} Mbps</p>
          <p className={statNote}>All cameras, main stream</p>
        </div>
        <div>
          <p className={statLabel}>Per camera / day</p>
          <p className={statValue}>{fmt(result.gbPerCameraDay)} GB</p>
          <p className={statNote}>At your recording mode</p>
        </div>
      </div>

      {shown.length > 0 && (
        <div className="border-border mt-6 border-t pt-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-foreground text-sm font-semibold">
              {covering.length > 0 ? "Our drives that are big enough" : "Our biggest drive"}
            </h2>
            <Link
              href="/categories/storage"
              className="text-muted-foreground hover:text-foreground text-xs font-semibold underline underline-offset-2"
            >
              All hard drives
            </Link>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {shown.map((pick) => (
              <li key={pick.slug}>
                <Link
                  href={`/products/${pick.slug}`}
                  className="border-border hover:border-foreground/30 flex items-baseline justify-between gap-3 rounded-md border px-3 py-2.5 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="text-foreground block text-sm font-medium">
                      {pick.value >= 1 ? `${pick.value} TB` : `${Math.round(pick.value * 1000)} GB`}
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
          <p className="text-muted-foreground mt-2.5 text-xs">{NOTE}</p>
        </div>
      )}
    </div>
  );
}
