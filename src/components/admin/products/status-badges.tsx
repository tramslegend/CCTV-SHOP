import { cn } from "@/lib/utils";
import { AVAILABILITY_LABELS, type Availability, STATUS_LABELS, type ProductStatus } from "./types";

const pill = "inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap";

const STATUS_STYLE: Record<ProductStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  draft: "border-zinc-200 bg-zinc-100 text-zinc-700",
  archived: "border-amber-200 bg-amber-50 text-amber-800",
};

const AVAILABILITY_DOT: Record<Availability, string> = {
  in_stock: "bg-emerald-500",
  backorder: "bg-amber-500",
  out_of_stock: "bg-red-500",
  discontinued: "bg-zinc-400",
};

export function StatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  return <span className={cn(pill, STATUS_STYLE[status], className)}>{STATUS_LABELS[status]}</span>;
}

export function AvailabilityLabel({ availability, className }: { availability: Availability; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm whitespace-nowrap", className)}>
      <span className={cn("size-2 rounded-full", AVAILABILITY_DOT[availability])} aria-hidden="true" />
      {AVAILABILITY_LABELS[availability]}
    </span>
  );
}
