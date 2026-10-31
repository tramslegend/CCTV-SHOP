"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TocItem } from "./blog-data";

// "On this page" navigation for blog posts: a collapsible list above the article on small screens and a sticky
// sidebar on desktop, both highlighting the section currently being read.

const ACTIVE_OFFSET = 140;

function useActiveHeading(items: TocItem[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = items.map((i) => i.id).join(" ");
  useEffect(() => {
    const ids = key.split(" ");
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - ACTIVE_OFFSET <= 0) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [key]);
  return active;
}

function TocList({ items, active }: { items: TocItem[]; active: string | null }) {
  return (
    <>
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            aria-current={active === item.id ? "location" : undefined}
            className={cn(
              "block border-l-2 py-1.5 leading-snug transition-all duration-150",
              item.level === 3 ? "pl-6 text-[0.8125rem]" : "pl-4",
              active === item.id
                ? "border-primary text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:border-border/70 border-transparent",
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </>
  );
}

const Marker = () => <span className="bg-primary inline-block h-3.5 w-1 rounded-full" aria-hidden="true" />;

export function PostTocMobile({ items }: { items: TocItem[] }) {
  const active = useActiveHeading(items);
  return (
    <details className="bg-muted/40 border-border group mb-8 rounded-xl border lg:hidden">
      <summary className="text-foreground flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold tracking-wider uppercase [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Marker />
          On this page
        </span>
        <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <ul className="px-4 pb-4 text-sm">
        <TocList items={items} active={active} />
      </ul>
    </details>
  );
}

export function PostTocAside({ items }: { items: TocItem[] }) {
  const active = useActiveHeading(items);
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-8">
        <nav className="text-sm" aria-label="Table of contents">
          <p className="text-muted-foreground mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Marker />
            On this page
          </p>
          <ul>
            <TocList items={items} active={active} />
          </ul>
        </nav>
      </div>
    </aside>
  );
}
