"use client";

import { Heart, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast, toggleWishlist, useWishlist, type SavedItem } from "../shop-state";

const buttonClass =
  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

async function share(title: string) {
  const url = window.location.href;
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast({ title: "Link copied", description: "Paste it anywhere to share this product." });
  } catch {
    showToast({ title: "Couldn't copy the link", description: url });
  }
}

/** "Add to Wishlist" and "Share" under the gallery. */
export function GalleryActions({ item }: { item: SavedItem }) {
  const saved = useWishlist().some((i) => i.slug === item.slug);
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      <button type="button" className={cn(buttonClass, "group relative overflow-hidden")} aria-pressed={saved} onClick={() => toggleWishlist(item)}>
        <Heart
          className={cn("mr-2 h-4 w-4 transition-colors", saved ? "fill-red-500 text-red-500" : "group-hover:text-red-500")}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">{saved ? "Saved to Wishlist" : "Add to Wishlist"}</span>
        <span className="sm:hidden">{saved ? "Saved" : "Wishlist"}</span>
      </button>
      <button type="button" className={buttonClass} onClick={() => share(item.name)}>
        <span className="flex items-center">
          <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Share</span>
        </span>
      </button>
    </div>
  );
}
