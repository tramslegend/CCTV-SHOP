import { formatGBP, splitPrice } from "@/lib/cctvmaster/money";
import { cn } from "@/lib/utils";

/** Inc.-VAT price as the source's product page and product cards render it: small £, raised pence, "inc. VAT". */
export function ProductPrice({
  amount,
  compareAt,
  className,
}: {
  /** Price inc. VAT. */
  amount: number;
  /** Previous price inc. VAT, shown struck through when higher. */
  compareAt?: number;
  className?: string;
}) {
  const { pounds, pence } = splitPrice(amount);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span
            className="text-foreground inline-flex items-start text-2xl leading-none font-bold tabular-nums"
            aria-label={formatGBP(amount)}
          >
            <span className="mt-0.5 text-[0.6em] font-semibold" aria-hidden="true">
              £
            </span>
            <span aria-hidden="true">{pounds}</span>
            <span className="sr-only">.</span>
            <span className="mt-0.5 ml-0.5 text-[0.5em] font-semibold" aria-hidden="true">
              {pence}
            </span>
          </span>
          <span className="text-muted-foreground self-end text-[11px] font-medium">inc. VAT</span>
        </div>
        {compareAt !== undefined && compareAt > amount && (
          <span className="text-muted-foreground mt-1 text-xs font-medium">
            Was <s className="tabular-nums">{formatGBP(compareAt)}</s>
          </span>
        )}
      </div>
    </div>
  );
}
