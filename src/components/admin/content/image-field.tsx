"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageOff, Images, Trash2, Upload } from "lucide-react";
import { FieldMessage } from "@/components/admin/form-field";
import { MediaPickerDialog } from "@/components/admin/media/media-picker-dialog";
import { ACCEPTED_TYPES, checkImageFile, uploadImage } from "@/components/admin/media/upload-client";
import { toast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One image for content (a post's cover, an author photo, an image block): upload it (added to the media library;
 * straight to Blob in production, through /admin/media/api/upload locally), choose one from the library, replace or
 * remove it. The URL is kept with the form and saved with it.
 */
export function ImageField({
  id,
  value,
  onChange,
  onUploadingChange,
  error,
  hint = "JPEG, PNG, WebP, AVIF or GIF, up to 8 MB.",
  alt,
  aspect = "aspect-[16/9]",
  fit = "cover",
  className,
}: {
  id: string;
  value: string | null;
  onChange: (url: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
  error?: string;
  hint?: string;
  alt: string;
  aspect?: string;
  fit?: "cover" | "contain";
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dropActive, setDropActive] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const uploading = preview !== null;

  const upload = (file: File | undefined) => {
    if (!file || uploading) return;
    const problem = checkImageFile(file);
    if (problem) return void toast.error(problem);
    const local = URL.createObjectURL(file);
    setPreview(local);
    setProgress(0);
    onUploadingChange?.(true);
    uploadImage(file, { folder: "media", serverEndpoint: "/admin/media/api/upload", onProgress: setProgress })
      .then((result) => onChange(result.url))
      .catch((e: Error) => toast.error(`${file.name}: ${e.message}`))
      .finally(() => {
        setPreview(null);
        onUploadingChange?.(false);
        setTimeout(() => URL.revokeObjectURL(local), 5000);
      });
  };

  const shown = preview ?? value;

  return (
    <div className={cn("flex flex-col gap-2", className)} id={id} tabIndex={-1}>
      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDropActive(false);
          upload(e.dataTransfer.files[0]);
        }}
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg border bg-white",
          aspect,
          dropActive ? "border-zinc-900 ring-2 ring-zinc-900" : shown ? "border-zinc-200" : "border-dashed border-zinc-300",
          error && "border-red-300",
        )}
      >
        {shown ? (
          <Image
            src={shown}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 40rem, 100vw"
            className={cn(fit === "cover" ? "object-cover" : "object-contain p-2", uploading && "opacity-50")}
            unoptimized={shown.startsWith("blob:")}
          />
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-1.5 px-4 text-center">
            <ImageOff className="size-5" aria-hidden="true" />
            <p className="text-xs">No image. Drag one here, upload or choose from the library.</p>
          </div>
        )}
        {uploading && (
          <div
            className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-zinc-200"
            role="progressbar"
            aria-label="Uploading"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-zinc-900 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={uploading}>
          <Upload /> {value ? "Replace" : "Upload"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)} disabled={uploading}>
          <Images /> Choose from library
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} disabled={uploading}>
            <Trash2 /> Remove
          </Button>
        )}
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          hidden
          data-testid={`${id}-input`}
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <FieldMessage id={id} error={error} hint={hint} />
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        existingUrls={new Set(value ? [value] : [])}
        limit={1}
        onPick={([picked]) => {
          if (picked) onChange(picked.url);
        }}
      />
    </div>
  );
}
