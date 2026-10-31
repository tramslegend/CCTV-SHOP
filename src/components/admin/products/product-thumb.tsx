import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Square product thumbnail with an empty-state icon. */
export function ProductThumb({ src, alt = "", size = 40, className }: { src: string | null | undefined; alt?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={`${size * 2}px`} className="object-contain p-0.5" unoptimized={src.startsWith("blob:")} />
      ) : (
        <ImageOff className="text-muted-foreground size-4" aria-hidden="true" />
      )}
    </span>
  );
}
