import { Package, RotateCcw, Shield, Truck, type LucideIcon } from "lucide-react";
import { deliveryFacts } from "@/lib/settings/format";
import type { DeliverySettings } from "@/lib/settings/schema";
import { cn } from "@/lib/utils";

/** Delivery / dispatch / checkout / returns tiles. Rendered under the gallery on desktop and under the buy box on mobile. */
export function TrustTiles({ delivery, className }: { delivery: DeliverySettings; className?: string }) {
  const d = deliveryFacts(delivery);
  const tiles: { icon: LucideIcon; label: string; sub: string; delay: string }[] = [
    {
      icon: Truck,
      label: d.alwaysFree ? "Free UK delivery" : `UK delivery ${d.fee}`,
      sub: d.alwaysFree ? "On every order" : `Free when you spend ${d.freeFrom} or more (inc. VAT)`,
      delay: "[animation-delay:400ms]",
    },
    { icon: Package, label: "Same-day dispatch", sub: `Order before ${d.cutoff} on a weekday`, delay: "[animation-delay:500ms]" },
    { icon: Shield, label: "Secure checkout", sub: "256-bit SSL encryption", delay: "[animation-delay:600ms]" },
    { icon: RotateCcw, label: "14 days to change your mind", sub: "No reason needed", delay: "[animation-delay:700ms]" },
  ];
  return (
    <div className={className}>
      <ul className="fc-rise grid grid-cols-2 gap-2 [animation-delay:300ms] sm:grid-cols-4 sm:gap-3">
        {tiles.map(({ icon: Icon, label, sub, delay }) => (
          <li
            key={label}
            className={cn(
              "fc-rise group flex flex-col items-center gap-1 rounded-xl border border-border bg-surface/50 p-3 text-center transition-[translate,background-color,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-[0_12px_24px_-16px_rgba(24,80,150,0.5)]",
              delay,
            )}
          >
            <Icon className="text-primary h-5 w-5 transition-transform duration-300 group-hover:scale-115 sm:h-6 sm:w-6" aria-hidden="true" />
            <span className="text-[11px] font-medium sm:text-xs">{label}</span>
            <span className="text-muted-foreground text-[10px]">{sub}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
