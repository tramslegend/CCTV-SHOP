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

/** Main product image with arrows, "1 / 5" counter, swipe and arrow-key navigation, plus a thumbnail strip. */
export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const count = images.length;
  const many = count > 1;
  const go = (step: number) => setIndex((i) => (i + step + count) % count);

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
      setIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setIndex(count - 1);
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
        className="focus-visible:ring-ring relative aspect-square touch-pan-y overflow-hidden rounded-xl border border-gray-100 bg-white select-none focus-visible:ring-2 focus-visible:outline-none"
      >
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          draggable={false}
          loading="eager"
          fetchPriority={index === 0 ? "high" : "auto"}
          sizes="(max-width: 639px) calc(100vw - 64px), (max-width: 1023px) calc(100vw - 80px), (max-width: 1280px) 50vw, 640px"
          className="object-contain p-4"
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
              onClick={() => setIndex(i)}
              aria-label={`View image ${i + 1} of ${count}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-all focus-visible:outline-none",
                i === index
                  ? "border-primary ring-primary/20 ring-2"
                  : "hover:border-primary/50 focus-visible:border-primary/50 border-gray-200",
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
