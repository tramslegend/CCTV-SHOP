"use client";

import { useState, useSyncExternalStore } from "react";
import type { LinkSetting } from "@/lib/homepage/schema";
import { ANNOUNCEMENT_STYLES, type AnnouncementColour } from "@/lib/navigation/schema";
import { cn } from "@/lib/utils";
import { SmartLink } from "./feature-icon";
import { XIcon } from "./icons";

// Announcement banner above the top bar (set at /admin/content/navigation). A dismissed announcement stays closed in
// this browser (localStorage) until its text or link changes, which gives it a new id.

const KEY = "announcement-dismissed";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readDismissed(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function dismiss(id: string) {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // Storage blocked: the banner still closes for this page view.
  }
  listeners.forEach((l) => l());
}

export function AnnouncementBar({
  id,
  text,
  link,
  colour,
  dismissible,
}: {
  id: string;
  text: string;
  link: LinkSetting;
  colour: AnnouncementColour;
  dismissible: boolean;
}) {
  const dismissedId = useSyncExternalStore(subscribe, readDismissed, () => null);
  // Closed for this page view even when storage is unavailable.
  const [closed, setClosed] = useState(false);
  if (dismissible && (dismissedId === id || closed)) return null;
  const domId = `announcement-${id}`;
  return (
    <div
      id={domId}
      role="region"
      aria-label="Announcement"
      className={cn("relative w-full", ANNOUNCEMENT_STYLES[colour])}
      // The script below may hide the banner before hydration (when it was dismissed earlier).
      suppressHydrationWarning
    >
      {dismissible && (
        // Runs while the page loads, so a dismissed banner never flashes. On the client it is inert (a data block).
        <script
          suppressHydrationWarning
          type={typeof window === "undefined" ? undefined : "text/x-announcement"}
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem(${JSON.stringify(KEY)})===${JSON.stringify(id)})document.getElementById(${JSON.stringify(domId)}).hidden=true}catch(e){}`,
          }}
        />
      )}
      <div className={cn("mx-auto flex min-h-10 max-w-450 items-center justify-center px-4 py-2 text-center md:px-6 lg:px-8", dismissible && "pr-12")}>
        <p className="text-[13px] leading-snug font-medium">
          {text}
          {link.label && link.href && (
            <>
              {" "}
              <SmartLink href={link.href} className="font-semibold whitespace-nowrap underline underline-offset-2 hover:no-underline">
                {link.label}
              </SmartLink>
            </>
          )}
        </p>
      </div>
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => {
            setClosed(true);
            dismiss(id);
          }}
          className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md opacity-80 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
