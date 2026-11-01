"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  src: string;
  alt: string;
  thumbAlt: string;
}

const arrowClass =
  "absolute top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-lg transition-all hover:scale-105 hover:bg-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

const MAIN_SIZES =
  "(max-width: 639px) calc(100vw - 64px), (max-width: 1023px) calc(100vw - 80px), (max-width: 1280px) 50vw, 640px";
/** Longest slide animation in globals.css (fc-slide-*), plus a margin: the outgoing photo is dropped after it. */
const SLIDE_MS = 600;

interface View {
  index: number;
  /** The photo sliding out, or -1 when nothing is moving. */
  from: number;
  /** 1: the new photo comes in from the right (next); -1: from the left (previous); 0: no slide. */
  dir: 1 | -1 | 0;
}

/**
 * Main product image with arrows, "1 / 5" counter, swipe and arrow-key navigation, plus a thumbnail strip.
 * Changing photo slides like a carousel: the old photo leaves on one side while the new one enters from the other.
 */
export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [view, setView] = useState<View>({ index: 0, from: -1, dir: 0 });
  const index = view.index;
  const strip = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const reduceMotion = useRef(false);
  const count = images.length;
  const many = count > 1;

  useEffect(() => {
    reduceMotion.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  /** Shows photo `next`, sliding in direction `dir` (1 forward, -1 back). */
  const show = (next: number, dir: 1 | -1) =>
    setView((v) =>
      next === v.index ? v : { index: next, from: reduceMotion.current ? -1 : v.index, dir: reduceMotion.current ? 0 : dir },
    );
  const go = (step: 1 | -1) => show((index + step + count) % count, step);
  const pick = (i: number) => show(i, i > index ? 1 : -1);

  // Drop the outgoing photo once its slide is over (a timer, so it also goes if the animation never runs).
  useEffect(() => {
    if (view.from < 0) return;
    const timer = setTimeout(() => setView((v) => ({ ...v, from: -1 })), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [view.from, view.index]);

  useEffect(() => {
    const el = strip.current?.children[index] as HTMLElement | undefined;
    const box = strip.current;
    if (!el || !box) return;
    if (el.offsetLeft < box.scrollLeft || el.offsetLeft + el.offsetWidth > box.scrollLeft + box.clientWidth) {
      box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
    }
  }, [index]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!many) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "Home") {
      e.preventDefault();
      pick(0);
    } else if (e.key === "End") {
      e.preventDefault();
      pick(count - 1);
    }
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const from = start.current;
    start.current = null;
    if (!from || !many) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  const current = images[index] ?? images[0];
  if (!current) return null;
  const leaving = view.from >= 0 ? images[view.from] : undefined;
  // The photos either side load in the background (same sizes, so the same file), so a slide never shows a blank.
  const neighbours = many
    ? [...new Set([(index + 1) % count, (index - 1 + count) % count])].filter((i) => i !== index && i !== view.from)
    : [];

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={many ? `Product images, ${index + 1} of ${count}` : "Product image"}
        tabIndex={many ? 0 : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (start.current = null)}
        className="group focus-visible:ring-ring relative aspect-square touch-pan-y overflow-hidden rounded-xl border border-border bg-white transition-shadow duration-300 select-none hover:shadow-[0_22px_40px_-22px_rgba(4,120,87,0.4)] focus-visible:ring-2 focus-visible:outline-none"
      >
        {neighbours.map((i) => (
          <Image
            key={`preload-${images[i].src}`}
            src={images[i].src}
            alt=""
            aria-hidden="true"
            fill
            draggable={false}
            loading="lazy"
            sizes={MAIN_SIZES}
            className="pointer-events-none object-contain p-4 opacity-0"
          />
        ))}
        {leaving && (
          <Image
            key={`out-${view.from}-${index}`}
            src={leaving.src}
            alt=""
            aria-hidden="true"
            fill
            draggable={false}
            sizes={MAIN_SIZES}
            className={cn("pointer-events-none object-contain p-4", view.dir > 0 ? "fc-slide-out-left" : "fc-slide-out-right")}
          />
        )}
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          draggable={false}
          loading="eager"
          fetchPriority={index === 0 ? "high" : "auto"}
          sizes={MAIN_SIZES}
          className={cn(
            "object-contain p-4 transition-[scale] duration-700 ease-out group-hover:scale-[1.04]",
            view.dir > 0 ? "fc-slide-in-right" : view.dir < 0 ? "fc-slide-in-left" : "fc-photo-in",
          )}
        />
        {many && (
          <>
            <button type="button" onClick={() => go(-1)} className={cn(arrowClass, "left-3")} aria-label="Previous image">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(1)} className={cn(arrowClass, "right-3")} aria-label="Next image">
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <div
              className="absolute right-3 bottom-3 rounded-full bg-black/70 px-3 py-1.5 text-sm font-medium text-white"
              aria-hidden="true"
            >
              {index + 1} / {count}
            </div>
          </>
        )}
      </div>
      {many && (
        <div
          ref={strip}
          className="relative flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => pick(i)}
              aria-label={`View image ${i + 1} of ${count}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none",
                i === index
                  ? "border-primary ring-primary/20 ring-2"
                  : "hover:border-primary/50 focus-visible:border-primary/50 border-border",
              )}
            >
              {/* Eager like the main image: the strip is above the fold and shares its first file, so a lazy thumb
                  would make Next.js flag the main image as a lazily loaded LCP. */}
              <Image src={img.src} alt={img.thumbAlt} fill sizes="80px" loading="eager" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
