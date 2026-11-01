"use client";

import { useLayoutEffect } from "react";

// Scroll reveal for `.fc-reveal` elements (styles in globals.css). An IntersectionObserver rather than CSS scroll
// timelines, because a view() timeline binds to the nearest scroll container: inside a horizontal row or any
// overflow-hidden ancestor it silently never runs, and Firefox has no scroll timelines at all.
//
// The state lives in data attributes, not classes: React rewrites `className` when a component re-renders, which
// would hide an element again. Nothing is hidden until this runs (`data-fc-reveal` on <html>), so without
// JavaScript, or with reduced motion, every element simply shows.

const MAX_STAGGER = 6;
const STAGGER_MS = 70;

export function RevealObserver() {
  useLayoutEffect(() => {
    if (typeof IntersectionObserver === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const html = document.documentElement;

    const show = (el: HTMLElement, delay = 0) => {
      el.style.setProperty("--fc-delay", `${delay}ms`);
      el.dataset.fcIn = "";
    };
    const io = new IntersectionObserver(
      (entries) => {
        // Elements arriving together come in one after another.
        let n = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target as HTMLElement, Math.min(n++, MAX_STAGGER) * STAGGER_MS);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );

    const watch = (scope: ParentNode) => {
      for (const el of scope.querySelectorAll<HTMLElement>(".fc-reveal:not([data-fc-in])")) io.observe(el);
    };
    // What is already on screen stays visible (it was server-rendered visible); only what is below the fold waits.
    for (const el of document.querySelectorAll<HTMLElement>(".fc-reveal:not([data-fc-in])")) {
      if (el.getBoundingClientRect().top < window.innerHeight) show(el);
    }
    watch(document);
    html.dataset.fcReveal = "";

    // Client-side navigation and lazily rendered sections add new cards later.
    const mo = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(".fc-reveal:not([data-fc-in])")) io.observe(node);
          watch(node);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      delete html.dataset.fcReveal;
    };
  }, []);

  return null;
}
