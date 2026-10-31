import { Package } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Square product image box used by the basket, checkout review, orders and wishlist. */
export function ProductThumb({
  src,
  alt,
  sizes,
  className,
  eager,
}: {
  src?: string;
  alt: string;
  sizes: string;
  className?: string;
  /** Load straight away (for an image that is likely the largest one above the fold). */
  eager?: boolean;
}) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-white", className)}>
      {src && src.startsWith("/") ? (
        <Image src={src} alt={alt} fill sizes={sizes} loading={eager ? "eager" : undefined} className="object-contain p-1" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-300">
          <Package className="h-1/2 w-1/2" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
