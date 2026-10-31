"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDimensions, type MediaItem } from "./types";

interface Page {
  items: MediaItem[];
  hasMore: boolean;
  total: number;
}

/**
 * "Choose from library": searchable grid of library images; the chosen ones are handed to `onPick` in the order they
 * were selected. Images whose URL is in `existingUrls` are shown as already added. At most `limit` can be chosen.
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  existingUrls,
  limit,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingUrls: ReadonlySet<string>;
  limit: number;
  onPick: (items: MediaItem[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (page > 1) params.set("page", String(page));
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/admin/media/api/list?${params}`, { signal: ctrl.signal, cache: "no-store" });
        if (res.redirected) throw new Error("Your session has ended. Sign in again in another tab, then retry.");
        const body = (await res.json().catch(() => ({}))) as Partial<Page> & { error?: string };
        if (!res.ok || !body.items) throw new Error(body.error ?? "Couldn't load the library.");
        const items = body.items;
        setData((prev) => ({
          items: page > 1 && prev ? [...prev.items, ...items.filter((i) => !prev.items.some((p) => p.id === i.id))] : items,
          hasMore: !!body.hasMore,
          total: body.total ?? items.length,
        }));
      } catch (e) {
        if (!ctrl.signal.aborted) setError((e as Error).message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => ctrl.abort();
  }, [open, search, page]);

  const reset = () => {
    setSelected([]);
    setQuery("");
    setSearch("");
    setPage(1);
    setData(null);
  };

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const toggle = (item: MediaItem) =>
    setSelected((prev) => (prev.some((p) => p.id === item.id) ? prev.filter((p) => p.id !== item.id) : prev.length >= limit ? prev : [...prev, item]));

  const atLimit = selected.length >= limit;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 sm:max-w-4xl" data-testid="media-picker">
        <DialogHeader>
          <DialogTitle>Choose from library</DialogTitle>
          <DialogDescription>
            {limit > 0 ? `Pick the images to add (up to ${limit} more).` : "No more images can be added here."}
          </DialogDescription>
        </DialogHeader>

        <form
          role="search"
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            if (timer.current) clearTimeout(timer.current);
            setPage(1);
            setSearch(query.trim());
          }}
        >
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Search the library by file name or alt text"
            placeholder="Search file name or alt text…"
            value={query}
            className="h-9 pr-8 pl-8"
            onChange={(e) => {
              const q = e.target.value;
              setQuery(q);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => {
                setPage(1);
                setSearch(q.trim());
              }, 300);
            }}
          />
          {loading && <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin" aria-label="Loading" />}
        </form>

        <div className="-mx-4 min-h-48 flex-1 overflow-y-auto px-4">
          {error ? (
            <p className="py-10 text-center text-sm text-red-700">{error}</p>
          ) : data && !data.items.length ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              {search ? "No images match this search." : "The library is empty. Upload images or import the existing ones on the Media page."}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" aria-label="Library images">
              {(data?.items ?? []).map((item) => {
                const added = existingUrls.has(item.url);
                const order = selected.findIndex((s) => s.id === item.id);
                const isSelected = order >= 0;
                const dims = formatDimensions(item.width, item.height);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={added || (!isSelected && atLimit)}
                      aria-pressed={isSelected}
                      aria-label={`${item.fileName}${added ? " (already added)" : ""}`}
                      onClick={() => toggle(item)}
                      className={cn(
                        "group relative flex w-full flex-col overflow-hidden rounded-lg border bg-white text-left transition outline-none focus-visible:ring-3 focus-visible:ring-zinc-900/30",
                        isSelected ? "border-zinc-900 ring-2 ring-zinc-900" : "hover:border-zinc-400",
                        (added || (!isSelected && atLimit)) && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <span className="relative block aspect-square bg-zinc-50">
                        <Image src={item.url} alt={item.alt || ""} fill sizes="(min-width: 768px) 140px, 30vw" className="object-contain p-1.5" />
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
                            {order + 1}
                          </span>
                        )}
                        {added && (
                          <span className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 rounded bg-white/95 py-0.5 text-[11px] font-medium shadow-sm">
                            <Check className="size-3" aria-hidden="true" /> Added
                          </span>
                        )}
                      </span>
                      <span className="block truncate px-1.5 pt-1 text-[11px] font-medium" title={item.fileName}>
                        {item.fileName}
                      </span>
                      <span className="text-muted-foreground block truncate px-1.5 pb-1 text-[11px]">{dims ?? (item.alt || " ")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {data?.hasMore && !error && (
            <div className="flex justify-center py-3">
              <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => setPage((p) => p + 1)}>
                {loading && <Loader2 className="animate-spin" />} Load more
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-muted-foreground text-xs tabular-nums">
            {selected.length
              ? `${selected.length} selected`
              : data
                ? `${data.total.toLocaleString("en-GB")} ${data.total === 1 ? "image" : "images"}${search ? " found" : " in the library"}`
                : " "}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selected.length}
              onClick={() => {
                onPick(selected);
                close(false);
              }}
            >
              Add {selected.length > 1 ? `${selected.length} images` : "image"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
