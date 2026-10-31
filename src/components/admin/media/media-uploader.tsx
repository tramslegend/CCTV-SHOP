"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Loader2, Upload, X } from "lucide-react";
import { toast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "./types";
import { ACCEPTED_TYPES, checkImageFile, type UploadMode, uploadImage } from "./upload-client";

interface QueueItem {
  key: string;
  name: string;
  size: number;
  progress: number;
  status: "waiting" | "uploading" | "done" | "error";
  error?: string;
}

/** At most this many files upload at once; the rest wait their turn. */
const PARALLEL = 3;
let counter = 0;

/** Drag & drop / file-picker uploads for the media library, with a per-file progress list. */
export function MediaUploader({ mode }: { mode: UploadMode }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const pending = useRef<{ key: string; file: File }[]>([]);
  const running = useRef(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef({ ok: 0 });

  useEffect(() => () => void (refreshTimer.current && clearTimeout(refreshTimer.current)), []);

  const patch = (key: string, p: Partial<QueueItem>) => setQueue((q) => q.map((item) => (item.key === key ? { ...item, ...p } : item)));

  // Refresh the grid once a burst of uploads settles, and say how many arrived.
  const scheduleRefresh = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      if (running.current || pending.current.length) return;
      router.refresh();
      const ok = finished.current.ok;
      finished.current.ok = 0;
      if (ok) toast.success(ok === 1 ? "Image uploaded." : `${ok} images uploaded.`);
    }, 250);
  };

  const pump = () => {
    while (running.current < PARALLEL && pending.current.length) {
      const next = pending.current.shift();
      if (!next) break;
      running.current++;
      patch(next.key, { status: "uploading" });
      uploadImage(next.file, {
        folder: "media",
        serverEndpoint: "/admin/media/api/upload",
        mode,
        onProgress: (progress) => patch(next.key, { progress }),
      })
        .then(() => {
          finished.current.ok++;
          patch(next.key, { status: "done", progress: 100 });
          setTimeout(() => setQueue((q) => q.filter((i) => i.key !== next.key)), 4000);
        })
        .catch((error: Error) => patch(next.key, { status: "error", error: error.message }))
        .finally(() => {
          running.current--;
          pump();
          scheduleRefresh();
        });
    }
  };

  const addFiles = (files: File[]) => {
    const added: QueueItem[] = [];
    for (const file of files) {
      const problem = checkImageFile(file);
      if (problem) {
        toast.error(problem);
        continue;
      }
      const key = `up-${Date.now().toString(36)}-${counter++}`;
      pending.current.push({ key, file });
      added.push({ key, name: file.name, size: file.size, progress: 0, status: "waiting" });
    }
    if (!added.length) return;
    setQueue((q) => [...q, ...added]);
    pump();
  };

  const uploading = queue.some((i) => i.status === "uploading" || i.status === "waiting");

  return (
    <section aria-label="Upload images" className="mb-6">
      <div
        data-testid="media-dropzone"
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDropActive(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropActive(false);
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDropActive(false);
          addFiles([...e.dataTransfer.files]);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-white px-4 py-6 text-center transition-colors sm:flex-row sm:gap-4 sm:py-5",
          dropActive ? "border-zinc-900 bg-zinc-50" : "border-zinc-300",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-100">
          <Upload className="size-5 text-zinc-600" aria-hidden="true" />
        </span>
        <div className="sm:flex-1 sm:text-left">
          <p className="text-sm font-medium">{dropActive ? "Drop to upload" : "Drag images here to upload"}</p>
          <p className="text-muted-foreground text-xs">JPEG, PNG, WebP, AVIF or GIF, up to 8 MB each. Several at once is fine.</p>
        </div>
        <Button type="button" onClick={() => input.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload images
        </Button>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          hidden
          data-testid="media-upload-input"
          onChange={(e) => {
            addFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>

      {queue.length > 0 && (
        <ul aria-label="Uploads" aria-live="polite" className="mt-3 divide-y rounded-xl border bg-white">
          {queue.map((item) => (
            <li key={item.key} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              {item.status === "done" ? (
                <CircleCheck className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : item.status === "error" ? (
                <CircleAlert className="size-4 shrink-0 text-red-600" aria-hidden="true" />
              ) : (
                <Loader2 className={cn("text-muted-foreground size-4 shrink-0", item.status === "uploading" && "animate-spin")} aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {item.status === "error"
                      ? "Failed"
                      : item.status === "done"
                        ? "Uploaded"
                        : item.status === "waiting"
                          ? "Waiting…"
                          : `${item.progress}%`}{" "}
                    · {formatBytes(item.size)}
                  </p>
                </div>
                {item.status === "error" ? (
                  <p className="text-xs text-red-700">{item.error}</p>
                ) : (
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100"
                    role="progressbar"
                    aria-label={`Uploading ${item.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.progress}
                  >
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-200", item.status === "done" ? "bg-emerald-500" : "bg-zinc-900")}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {(item.status === "error" || item.status === "done") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Dismiss ${item.name}`}
                  onClick={() => setQueue((q) => q.filter((i) => i.key !== item.key))}
                >
                  <X />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
