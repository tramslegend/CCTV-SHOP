"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { FieldMessage } from "@/components/admin/form-field";
import { toast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT = ["image/png", "image/webp", "image/jpeg", "image/avif", "image/gif"];
const MAX_BYTES = 2 * 1024 * 1024;

async function uploadLogo(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/admin/settings/api/logo", { method: "POST", body });
  if (res.redirected) throw new Error("Your session has ended. Sign in again in another tab, then retry.");
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
  return data.url;
}

/** Logo upload / replace / remove with a preview on the background it will be shown on. */
export function LogoField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  dark,
  altText,
  onUploadingChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
  /** Preview on a dark background (footer logo). */
  dark?: boolean;
  altText: string;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const uploading = preview !== null;

  useEffect(() => onUploadingChange(uploading), [uploading, onUploadingChange]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return void toast.error(`${file.name}: use a PNG, WebP, JPEG, AVIF or GIF image.`);
    if (file.size > MAX_BYTES) return void toast.error(`${file.name} is larger than 2 MB.`);
    setPreview(URL.createObjectURL(file));
    uploadLogo(file)
      .then((url) => {
        onChange(url);
        toast.success("Logo uploaded. Save the section to use it on the shop.");
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setPreview(null));
  };

  const shown = preview ?? value;
  return (
    <div className="flex flex-col gap-1.5">
      <p id={`${id}-label`} className="text-sm leading-none font-medium select-none">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={cn(
            "relative flex h-20 w-56 items-center justify-center overflow-hidden rounded-lg border px-4",
            dark ? "border-zinc-800 bg-zinc-950" : "bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] bg-[length:16px_16px]",
            error && "border-red-400",
          )}
        >
          {shown ? (
            <Image src={shown} alt={altText} width={200} height={64} unoptimized className={cn("max-h-14 w-auto object-contain", uploading && "opacity-50")} />
          ) : (
            <span className={cn("text-xs", dark ? "text-muted-foreground" : "text-muted-foreground")}>No logo</span>
          )}
          {uploading && <Loader2 className="absolute size-5 animate-spin text-emerald-600" aria-label="Uploading" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            id={id}
            aria-describedby={error ? `${id}-error` : undefined}
            onClick={() => input.current?.click()}
            disabled={uploading}
          >
            {value ? <RefreshCw /> : <ImagePlus />}
            {value ? "Replace" : "Upload logo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} disabled={uploading}>
              <Trash2 /> Remove
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept={ACCEPT.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}
