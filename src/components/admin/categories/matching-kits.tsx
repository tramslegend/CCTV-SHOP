import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { FormSection } from "@/components/admin/products/form-section";
import { ProductThumb } from "@/components/admin/products/product-thumb";
import { formatGBP } from "@/lib/cctvmaster/money";
import type { MatchingKit } from "@/lib/admin/categories/types";

/** Read-only list of the kits a kit range shows with its saved rule. */
export function MatchingKits({ total, kits, shopHref }: { total: number; kits: MatchingKit[]; shopHref: string | null }) {
  return (
    <FormSection
      id="matching-kits"
      title="Kits listed in this range"
      description="Kit ranges list kits by their rule, so there's nothing to add by hand. Change the rule above to change the list."
      actions={
        shopHref ? (
          <a href={shopHref} target="_blank" rel="noreferrer" className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-zinc-950">
            See the range page <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        ) : undefined
      }
    >
      <p className="text-sm" data-testid="matching-kits-total">
        <span className="font-semibold tabular-nums">{total.toLocaleString("en-GB")}</span> {total === 1 ? "kit" : "kits"} with the saved rule
        {total > kits.length ? `, the first ${kits.length} in the shop's recommended order:` : "."}
      </p>
      {kits.length > 0 && (
        <ol className="divide-y rounded-lg border">
          {kits.map((k) => (
            <li key={k.slug} className="flex items-center gap-2.5 px-3 py-2">
              <ProductThumb src={k.image} size={32} />
              <div className="min-w-0 flex-1">
                {k.id ? (
                  <Link href={`/admin/products/${k.id}`} className="block truncate text-sm hover:underline">
                    {k.name}
                  </Link>
                ) : (
                  <span className="block truncate text-sm">{k.name}</span>
                )}
                <span className="text-muted-foreground block truncate text-xs">
                  {k.sku} · {formatGBP(k.price)} inc VAT · {k.inStock ? "Ready to send" : "Ordered in"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </FormSection>
  );
}
