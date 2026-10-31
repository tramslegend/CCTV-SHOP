"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Horizontal scroller that starts scrolled to its `aria-current` child (mobile kit pickers). */
export function ScrollRow({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    const current = box?.querySelector<HTMLElement>("[aria-current]");
    // Like the source: bring the current option to the start, leaving a sliver of the previous one visible.
    if (box && current && current !== box.firstElementChild) box.scrollLeft = current.offsetLeft - 22;
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
