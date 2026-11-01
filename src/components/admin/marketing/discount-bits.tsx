import { formatGBP } from "@/lib/cctvmaster/money";
import { DISCOUNT_STATUS_LABEL, type DiscountStatus, describeDiscount, type DiscountType, ukDateShort } from "@/lib/discounts/rules";
import { cn } from "@/lib/utils";

export const DISCOUNT_STATUS_TONE: Record<DiscountStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  scheduled: "border-sky-200 bg-sky-50 text-sky-800",
  expired: "border-border bg-muted text-muted-foreground",
  used_up: "border-amber-200 bg-amber-50 text-amber-800",
  inactive: "border-border bg-white text-muted-foreground",
};

export function DiscountStatusBadge({ status, className }: { status: DiscountStatus; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", DISCOUNT_STATUS_TONE[status], className)}
      data-status={status}
    >
      {DISCOUNT_STATUS_LABEL[status]}
    </span>
  );
}

/** "10% off" / "£5.00 off" / "Free delivery", plus "· min £50.00". */
export function discountSummary(c: { type: DiscountType; value: number; minSpend: number | null }) {
  return `${describeDiscount(c)}${c.minSpend ? ` · min spend ${formatGBP(c.minSpend)}` : ""}`;
}

/** "1 Nov 2026 – 30 Nov 2026", "From 1 Nov 2026", "Until …", "Always". */
export function validityText(c: { startsAt: Date | null; endsAt: Date | null }) {
  if (c.startsAt && c.endsAt) return `${ukDateShort(c.startsAt)} – ${ukDateShort(c.endsAt)}`;
  if (c.startsAt) return `From ${ukDateShort(c.startsAt)}`;
  if (c.endsAt) return `Until ${ukDateShort(c.endsAt)}`;
  return "No end date";
}

export const usesText = (c: { uses: number; maxUses: number | null }) =>
  c.maxUses !== null ? `${c.uses.toLocaleString("en-GB")} / ${c.maxUses.toLocaleString("en-GB")}` : `${c.uses.toLocaleString("en-GB")} / ∞`;
