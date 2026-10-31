"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MediaDetailDialog } from "./media-detail-dialog";
import { formatBytes, formatDimensions, type MediaItem } from "./types";

/** The library grid. Clicking an image opens its details (preview, alt text, where it's used, delete). */
export function MediaGrid({ items }: { items: MediaItem[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  // The last opened item stays mounted while the dialog animates closed (and if a refresh drops it from the page).
  const [last, setLast] = useState<MediaItem | null>(null);
  const current = (last && items.find((i) => i.id === last.id)) ?? last;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6" data-testid="media-grid">
        {items.map((item, i) => (
          <li key={item.id}>
            <MediaCard
              item={item}
              eager={i < 6}
              onOpen={() => {
                setLast(item);
                setOpenId(item.id);
              }}
            />
          </li>
        ))}
      </ul>
      {current && <MediaDetailDialog key={current.id} item={current} open={openId === current.id} onClose={() => setOpenId(null)} />}
    </>
  );
}

function MediaCard({ item, eager, onOpen }: { item: MediaItem; eager: boolean; onOpen: () => void }) {
  const dims = formatDimensions(item.width, item.height);
  return (
    <button
      type="button"
      onClick={onOpen}
      data-media-id={item.id}
      aria-haspopup="dialog"
      className="group flex h-full w-full flex-col overflow-hidden rounded-xl border bg-white text-left transition-colors outline-none hover:border-zinc-400 focus-visible:ring-3 focus-visible:ring-zinc-900/30"
    >
      <span className="relative block aspect-square bg-zinc-50">
        <Image
          src={item.url}
          alt={item.alt || ""}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(min-width: 1536px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-contain p-2 transition-transform group-hover:scale-[1.02]"
        />
        <span
          className={cn(
            "absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-medium shadow-sm",
            item.usedIn ? "bg-zinc-900 text-white" : "border bg-white text-zinc-600",
          )}
        >
          {item.usedIn ? `Used in ${item.usedIn}` : "Unused"}
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-0.5 border-t p-2.5 text-xs">
        <span className="truncate text-sm font-medium text-zinc-950" title={item.fileName}>
          {item.fileName}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {formatBytes(item.size)}
          {dims && ` · ${dims}`}
        </span>
        <span className="text-muted-foreground">{item.createdLabel}</span>
        {item.alt ? (
          <span className="line-clamp-1 text-zinc-700" title={item.alt}>
            {item.alt}
          </span>
        ) : (
          <span className="text-amber-700">No alt text</span>
        )}
      </span>
    </button>
  );
}
