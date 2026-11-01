import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The shop's logo from Settings, or its name as a wordmark when no logo is set. `onDark` uses the dark-background
 * logo when there is one, otherwise shows the main logo in white.
 */
export function BrandLogo({
  name,
  logoUrl,
  logoDarkUrl = "",
  onDark = false,
  alt,
  width,
  height,
  className,
  textClassName,
  preload,
}: {
  name: string;
  logoUrl: string;
  logoDarkUrl?: string;
  onDark?: boolean;
  /** Defaults to the shop name. */
  alt?: string;
  width: number;
  height: number;
  className?: string;
  textClassName?: string;
  preload?: boolean;
}) {
  const src = onDark ? logoDarkUrl || logoUrl : logoUrl;
  if (!src)
    return (
      <span className={cn("font-sentient text-xl leading-none font-semibold tracking-tight", onDark ? "text-white" : "text-foreground", textClassName)}>
        {name}
      </span>
    );
  return (
    <Image
      src={src}
      alt={alt ?? name}
      width={width}
      height={height}
      className={cn(className, onDark && !logoDarkUrl && "brightness-0 invert")}
      preload={preload}
    />
  );
}
