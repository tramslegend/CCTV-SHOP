"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Images, Loader2, Star, Trash2, Upload } from "lucide-react";
import { FieldMessage } from "@/components/admin/form-field";
import { MediaPickerDialog } from "@/components/admin/media/media-picker-dialog";
import { ACCEPTED_TYPES, checkImageFile, uploadImage } from "@/components/admin/media/upload-client";
import { toast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FieldErrors, ImageValue } from "./types";
import { move, newKey } from "./utils";

/** The product form's limit (see productInputSchema). */
const MAX_IMAGES = 30;

type Update = (fn: (prev: ImageValue[]) => ImageValue[]) => void;

export function ImagesEditor({
  images,
  onChange,
  errors,
  productName,
}: {
  images: ImageValue[];
  onChange: Update;
  errors: FieldErrors;
  productName: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Upload progress (0–100) per image key while it's in flight.
  const [progress, setProgress] = useState<Record<string, number>>({});

  // Uploads go straight to Vercel Blob in production and through /admin/products/api/upload locally; either way the
  // image is also added to the media library.
  const addFiles = (files: File[]) => {
    for (const file of files) {
      const problem = checkImageFile(file);
      if (problem) {
        toast.error(problem);
        continue;
      }
      const key = newKey("img");
      const preview = URL.createObjectURL(file);
      onChange((prev) => [...prev, { key, url: preview, alt: "", uploading: true }]);
      uploadImage(file, {
        folder: "products",
        serverEndpoint: "/admin/products/api/upload",
        onProgress: (p) => setProgress((prev) => ({ ...prev, [key]: p })),
      })
        .then(({ url }) => onChange((prev) => prev.map((img) => (img.key === key ? { ...img, url, uploading: false } : img))))
        .catch((error: Error) => {
          toast.error(error.message.startsWith(file.name) ? error.message : `${file.name}: ${error.message}`);
          onChange((prev) => prev.filter((img) => img.key !== key));
        })
        .finally(() => {
          setProgress((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          setTimeout(() => URL.revokeObjectURL(preview), 5000);
        });
    }
  };

  const existingUrls = new Set(images.map((img) => img.url));
  const room = Math.max(0, MAX_IMAGES - images.length);

  const update = (key: string, patch: Partial<ImageValue>) => onChange((prev) => prev.map((img) => (img.key === key ? { ...img, ...patch } : img)));
  const reorder = (from: number, to: number) => onChange((prev) => move(prev, from, to));

  return (
    <div className="flex flex-col gap-3">
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
          addFiles([...e.dataTransfer.files]);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          dropActive ? "border-zinc-900 bg-zinc-50" : "border-zinc-300",
        )}
      >
        <Upload className="text-muted-foreground size-5" aria-hidden="true" />
        <p className="text-sm">
          Drag images here or{" "}
          <button type="button" className="font-medium underline underline-offset-2" onClick={() => fileInput.current?.click()}>
            choose files
          </button>
        </p>
        <p className="text-muted-foreground text-xs">JPEG, PNG, WebP, AVIF or GIF, up to 8 MB each. The first image is the main image.</p>
        <Button type="button" variant="outline" size="sm" className="mt-1" onClick={() => setPickerOpen(true)}>
          <Images /> Choose from library
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          hidden
          data-testid="image-upload-input"
          onChange={(e) => {
            addFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>
      <FieldMessage id="pf-images" error={errors.images} />
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        existingUrls={existingUrls}
        limit={room}
        onPick={(picked) => {
          onChange((prev) => [
            ...prev,
            ...picked.filter((m) => !prev.some((img) => img.url === m.url)).map((m) => ({ key: newKey("img"), url: m.url, alt: m.alt ?? "" })),
          ]);
          toast.success(picked.length === 1 ? "Image added. Save the product to keep it." : `${picked.length} images added. Save the product to keep them.`);
        }}
      />

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {images.map((img, i) => {
            const error = errors[`images.${i}.url`] ?? errors[`images.${i}.alt`];
            return (
              <li
                key={img.key}
                draggable={!img.uploading}
                onDragStart={(e) => {
                  dragFrom.current = i;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", img.key);
                }}
                onDragOver={(e) => {
                  if (dragFrom.current === null) return;
                  e.preventDefault();
                  setDragOver(i);
                }}
                onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
                onDrop={(e) => {
                  if (dragFrom.current === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                  reorder(dragFrom.current, i);
                  dragFrom.current = null;
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  dragFrom.current = null;
                  setDragOver(null);
                }}
                className={cn(
                  "group flex flex-col gap-2 rounded-lg border bg-white p-2 transition-shadow",
                  dragOver === i && "ring-2 ring-zinc-900",
                  error && "border-red-300",
                )}
              >
                <div className="relative aspect-square overflow-hidden rounded-md bg-zinc-50">
                  <Image
                    src={img.url}
                    alt={img.alt || `${productName || "Product"} image ${i + 1}`}
                    fill
                    sizes="200px"
                    className={cn("object-contain p-1", img.uploading && "opacity-50")}
                    unoptimized={img.url.startsWith("blob:")}
                  />
                  {img.uploading && (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <Loader2 className="size-6 animate-spin text-zinc-700" aria-label="Uploading" />
                      {progress[img.key] !== undefined && (
                        <span className="rounded bg-white/90 px-1.5 text-[11px] font-medium text-zinc-800 tabular-nums">{progress[img.key]}%</span>
                      )}
                    </span>
                  )}
                  {i === 0 && <span className="absolute top-1.5 left-1.5 rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] font-medium text-white">Main image</span>}
                  <span className="absolute top-1.5 right-1.5 cursor-grab rounded bg-white/90 p-0.5 text-zinc-500 shadow-sm" aria-hidden="true">
                    <GripVertical className="size-3.5" />
                  </span>
                </div>
                <Input
                  aria-label={`Alt text for image ${i + 1}`}
                  placeholder="Alt text (describe the image)"
                  value={img.alt}
                  maxLength={300}
                  className="h-7 text-xs"
                  onChange={(e) => update(img.key, { alt: e.target.value })}
                />
                <div className="flex items-center justify-between gap-1">
                  <div className="flex gap-0.5">
                    <Button type="button" variant="ghost" size="icon-xs" aria-label={`Move image ${i + 1} left`} disabled={i === 0} onClick={() => reorder(i, i - 1)}>
                      <ArrowLeft />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Move image ${i + 1} right`}
                      disabled={i === images.length - 1}
                      onClick={() => reorder(i, i + 1)}
                    >
                      <ArrowRight />
                    </Button>
                    {i > 0 && (
                      <Button type="button" variant="ghost" size="icon-xs" aria-label={`Make image ${i + 1} the main image`} onClick={() => reorder(i, 0)}>
                        <Star />
                      </Button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove image ${i + 1}`}
                    className="text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => onChange((prev) => prev.filter((x) => x.key !== img.key))}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {error && <p className="text-xs text-red-700">{error}</p>}
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="text-muted-foreground flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs hover:border-zinc-400 hover:text-zinc-900"
            >
              <ImagePlus className="size-5" aria-hidden="true" />
              Add images
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
