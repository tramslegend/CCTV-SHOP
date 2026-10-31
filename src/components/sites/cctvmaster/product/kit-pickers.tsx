import Link from "next/link";
import { formatGBP } from "@/lib/cctvmaster/money";
import { cn } from "@/lib/utils";
import type { KitOption, KitPicker, KitSaving } from "./kit-logic";
import { ScrollRow } from "./scroll-row";

const plainGBP = (n: number) => `£${n.toFixed(2)}`;

function Option({ option, mobile }: { option: KitOption; mobile?: boolean }) {
  const shell = cn(
    "flex min-h-14 flex-col justify-center rounded-xl border-2 px-2.5 py-2 text-left transition-colors",
    mobile && "w-36 flex-none snap-start whitespace-normal",
  );
  const subtitle = option.subtitle && (
    <span className="text-muted-foreground text-[11px] leading-tight">{option.subtitle}</span>
  );
  if (option.current) {
    return (
      <span aria-current="page" className={cn(shell, "border-primary bg-primary/10")}>
        <span className="text-primary text-sm leading-tight font-semibold">{option.title}</span>
        {subtitle}
        <span className="text-primary text-[11px] leading-tight font-semibold">This kit</span>
      </span>
    );
  }
  return (
    <Link href={option.href} className={cn(shell, "border-border hover:border-primary relative bg-white")}>
      <span className="text-sm leading-tight font-semibold">{option.title}</span>
      {subtitle}
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          option.delta < 0 ? "text-emerald-700" : "text-foreground/80",
        )}
      >
        {option.delta < 0 ? "-" : "+"}
        {formatGBP(Math.abs(option.delta))}
      </span>
    </Link>
  );
}

/** Bundle saving plus the "How many cameras?" / camera mix / storage pickers for kits in a family. */
export function KitPickers({ saving, pickers }: { saving?: KitSaving; pickers: KitPicker[] }) {
  if (!saving && !pickers.length) return null;
  return (
    <div className="space-y-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
      {saving && (
        <div className="space-y-1" data-testid="kit-bundle-saving">
          <p className="text-muted-foreground text-sm">
            Buying the parts one by one <s className="tabular-nums">{plainGBP(saving.parts)}</s>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-foreground font-semibold tabular-nums">This kit {plainGBP(saving.kit)}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              You save {formatGBP(saving.save)} ({saving.percent}% off)
            </span>
          </p>
        </div>
      )}
      {pickers.map((picker) => (
        <div key={picker.id} role="group" aria-labelledby={`kit-picker-${picker.id}`}>
          <p id={`kit-picker-${picker.id}`} className="text-sm font-semibold">
            {picker.heading}
          </p>
          <p className="text-muted-foreground mt-0.5 mb-2 text-xs leading-snug">{picker.hint}</p>
          <ScrollRow className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
            {picker.options.map((o) => (
              <Option key={o.key} option={o} mobile />
            ))}
          </ScrollRow>
          <div className="hidden grid-cols-3 gap-2 sm:grid">
            {picker.options.map((o) => (
              <Option key={o.key} option={o} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
