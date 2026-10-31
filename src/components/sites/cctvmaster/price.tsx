import { splitPrice } from "@/lib/cctvmaster/money";
import { cn } from "@/lib/utils";

/** A price split for display: pounds ("1,234") and pence ("50"). */
export type PriceValue = { pounds: string; pence: string };

/** 1234.5 → { pounds: "1,234", pence: "50" }. */
export const priceParts = (amount: number): PriceValue => splitPrice(amount);

const sizes = {
  sm: { symbol: "text-xs", pounds: "text-sm", pence: "text-[9px]" },
  md: { symbol: "text-sm", pounds: "text-lg", pence: "text-[11px]" },
  lg: { symbol: "text-base", pounds: "text-2xl", pence: "text-xs" },
};

/** Price with a small pound sign and raised pence, as rendered on cctvmaster.co.uk. */
export function Price({
  value,
  size,
  className,
}: {
  value: PriceValue;
  size: keyof typeof sizes;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <span
      aria-label={`£${value.pounds}.${value.pence}`}
      className={cn("inline-flex items-start font-semibold tracking-tight tabular-nums", className)}
    >
      <span className={cn("mt-0.5 font-mono", s.symbol)} aria-hidden="true">
        £
      </span>
      <span className={s.pounds} aria-hidden="true">
        {value.pounds}
      </span>
      <span className="sr-only">.</span>
      <span className={cn("ml-0.5 font-mono", s.pence)} aria-hidden="true">
        {value.pence}
      </span>
    </span>
  );
}
