"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Loader2, Save, ShieldAlert, Trash2 } from "lucide-react";
import { deleteMedia, updateMediaAlt } from "@/app/admin/(panel)/media/actions";
import { toast } from "@/components/admin/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatBytes, formatDimensions, type MediaItem, type MediaUsage, TYPE_LABELS, type UsageEntry } from "./types";

type UsageState = { status: "loading" } | { status: "ready"; usage: MediaUsage; total: number } | { status: "error"; message: string };

const KIND_LABELS: Record<UsageEntry["kind"], string> = {
  product: "Product",
  kit: "Kit",
  category: "Category",
  post: "Blog post",
  page: "Page",
  setting: "Setting",
  order: "Order",
};

/** Large preview, alt text, copy URL, where the image is used and delete (blocked while it's in use). */
export function MediaDetailDialog({ item, open, onClose }: { item: MediaItem; open: boolean; onClose: () => void }) {
  const [usage, setUsage] = useState<UsageState>({ status: "loading" });
  const [alt, setAlt] = useState(item.alt ?? "");
  const [savedAlt, setSavedAlt] = useState(item.alt ?? "");
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/admin/media/api/${item.id}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        if (res.redirected) throw new Error("Your session has ended. Sign in again, then retry.");
        const data = (await res.json().catch(() => ({}))) as { item?: MediaItem; usage?: MediaUsage; error?: string };
        if (!res.ok || !data.usage || !data.item) throw new Error(data.error ?? "Couldn't load where this image is used.");
        setUsage({ status: "ready", usage: data.usage, total: data.item.usedIn });
      })
      .catch((error: Error) => {
        if (!ctrl.signal.aborted) setUsage({ status: "error", message: error.message });
      });
    return () => ctrl.abort();
  }, [item.id]);

  const dims = formatDimensions(item.width, item.height);
  const type = item.contentType ? (TYPE_LABELS[item.contentType] ?? item.contentType) : null;
  const altDirty = alt.trim() !== savedAlt.trim();
  const inUse = usage.status === "ready" && usage.total > 0;

  const saveAlt = () =>
    startSaving(async () => {
      const result = await updateMediaAlt(item.id, alt);
      if (!result.ok) return void toast.error(result.message);
      const clean = alt.replace(/\s+/g, " ").trim();
      setAlt(clean);
      setSavedAlt(clean);
      toast.success(result.message);
    });

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically. Select the address and copy it.");
    }
  };

  const remove = () =>
    startDeleting(async () => {
      const result = await deleteMedia(item.id);
      if (!result.ok) {
        toast.error(result.message);
        setConfirming(false);
        return;
      }
      toast.success(result.message);
      onClose();
    });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-5xl md:overflow-hidden" data-testid="media-detail">
        <div className="grid min-h-0 md:max-h-[calc(100dvh-2rem)] md:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="relative min-h-64 bg-[repeating-conic-gradient(#f4f4f5_0%_25%,#fff_0%_50%)] bg-[length:20px_20px] md:min-h-[32rem]">
            <Image src={item.url} alt={savedAlt || ""} fill sizes="(min-width: 1024px) 640px, (min-width: 768px) 60vw, 100vw" className="object-contain p-4" />
          </div>

          <div className="flex min-h-0 flex-col gap-5 border-t p-4 md:overflow-y-auto md:border-t-0 md:border-l">
            <div className="pr-8">
              <DialogTitle className="text-base leading-snug break-all">{item.fileName}</DialogTitle>
              <DialogDescription className="mt-1 tabular-nums">
                {[type, formatBytes(item.size), dims].filter(Boolean).join(" · ")}
              </DialogDescription>
              <p className="text-muted-foreground mt-1 text-xs">
                {item.uploaded ? "Uploaded" : "Imported from the catalogue"} on {item.createdLabel}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="media-url">Image address</Label>
              <div className="flex gap-1.5">
                <Input id="media-url" readOnly value={item.url} className="h-8 font-[family-name:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace] text-xs" onClick={(e) => e.currentTarget.select()} />
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={copyUrl}>
                  {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy URL"}
                </Button>
              </div>
              <a href={item.url} target="_blank" rel="noreferrer" className="text-muted-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:text-zinc-950 hover:underline">
                Open the original <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </div>

            <form
              className="flex flex-col gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (altDirty) saveAlt();
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="media-alt">Alt text</Label>
                <span className="text-muted-foreground text-xs tabular-nums">{alt.length}/300</span>
              </div>
              <Textarea
                id="media-alt"
                value={alt}
                maxLength={300}
                rows={3}
                placeholder="Describe the image for people who can't see it"
                onChange={(e) => setAlt(e.target.value)}
              />
              <p className="text-muted-foreground text-xs leading-snug">Used as the alt text when you add this image to a product from the library.</p>
              <div>
                <Button type="submit" size="sm" disabled={!altDirty || saving}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save />} Save alt text
                </Button>
              </div>
            </form>

            <section aria-labelledby="media-usage-heading" className="flex flex-col gap-2">
              <h3 id="media-usage-heading" className="text-sm font-medium">
                Used in
                {usage.status === "ready" && <span className="text-muted-foreground ml-1 font-normal tabular-nums">({usage.total})</span>}
              </h3>
              <UsageList state={usage} />
            </section>

            <section aria-label="Delete" className="mt-auto flex flex-col gap-2 border-t pt-4">
              {inUse ? (
                <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-snug text-amber-900" data-testid="delete-blocked">
                  <ShieldAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
                  This image is in use, so it can&apos;t be deleted. Remove it from the places above first.
                </p>
              ) : confirming ? (
                <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
                  <p className="text-xs leading-snug text-red-900">
                    {item.storage === "external"
                      ? "Remove this image from the library? The original catalogue file stays on the server."
                      : "Delete this image? The file is removed from storage and the library. This can't be undone."}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={deleting}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={remove} disabled={deleting}>
                      {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />} {item.storage === "external" ? "Remove" : "Delete permanently"}
                    </Button>
                  </div>
                </div>
              ) : null}
              {!confirming && (
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={usage.status !== "ready" || inUse}
                    onClick={() => setConfirming(true)}
                  >
                    <Trash2 /> {item.storage === "external" ? "Remove from library" : "Delete image"}
                  </Button>
                </div>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UsageList({ state }: { state: UsageState }) {
  if (state.status === "loading")
    return (
      <div className="flex flex-col gap-1.5" aria-label="Loading where this image is used">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    );
  if (state.status === "error") return <p className="text-xs text-red-700">{state.message}</p>;
  const { entries, orderCount } = state.usage;
  if (!entries.length) return <p className="text-muted-foreground text-xs">Not used anywhere in the shop. It can be deleted safely.</p>;
  const listedOrders = entries.filter((e) => e.kind === "order").length;
  return (
    <ul className="flex flex-col divide-y rounded-lg border text-sm" data-testid="usage-list">
      {entries.map((e) => (
        <li key={`${e.kind}-${e.id}-${e.detail}`} className="flex items-start gap-2 px-2.5 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{KIND_LABELS[e.kind]}</p>
            {e.href ? (
              <Link href={e.href} className="font-medium underline-offset-2 hover:underline">
                {e.label}
              </Link>
            ) : (
              <p className="font-medium">{e.label}</p>
            )}
            <p className="text-muted-foreground text-xs">{e.detail}</p>
          </div>
          {e.publicHref && (
            <a
              href={e.publicHref}
              target="_blank"
              rel="noreferrer"
              aria-label={`View ${e.label} in the shop`}
              className={cn(buttonVariants({ variant: "ghost", size: "icon-xs" }), "mt-3 shrink-0")}
            >
              <ExternalLink />
            </a>
          )}
        </li>
      ))}
      {orderCount > listedOrders && (
        <li className="text-muted-foreground px-2.5 py-2 text-xs">
          …and {orderCount - listedOrders} more past {orderCount - listedOrders === 1 ? "order" : "orders"}
        </li>
      )}
    </ul>
  );
}
