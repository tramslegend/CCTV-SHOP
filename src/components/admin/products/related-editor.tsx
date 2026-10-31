"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { SearchPicker } from "@/components/admin/search-picker";
import { Button } from "@/components/ui/button";
import { formatGBP, withVat } from "@/lib/cctvmaster/money";
import { ProductThumb } from "./product-thumb";
import { StatusBadge } from "./status-badges";
import type { FieldErrors, ProductPick } from "./types";
import { move, searchProductPicks } from "./utils";

export function PickRow({ pick }: { pick: ProductPick }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <ProductThumb src={pick.image} size={32} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{pick.name}</span>
        <span className="text-muted-foreground block truncate text-xs">
          {pick.sku} · {formatGBP(withVat(pick.price))} inc VAT{pick.isKit ? " · Kit" : ""}
        </span>
      </span>
      {pick.status !== "active" && <StatusBadge status={pick.status} />}
    </span>
  );
}

type Update = (fn: (prev: ProductPick[]) => ProductPick[]) => void;

/** "You may also like" products, in display order. */
export function RelatedEditor({ items, onChange, errors, selfId }: { items: ProductPick[]; onChange: Update; errors: FieldErrors; selfId?: string }) {
  const chosen = new Set(items.map((p) => p.id));
  return (
    <div className="flex flex-col gap-3">
      <SearchPicker<ProductPick>
        id="pf-related"
        aria-label="Search products to add as related"
        placeholder="Search by name or SKU to add a related product…"
        search={(q) => searchProductPicks(q, "all", selfId)}
        getKey={(p) => p.id}
        isDisabled={(p) => chosen.has(p.id)}
        renderItem={(p) => <PickRow pick={p} />}
        onSelect={(p) => onChange((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))}
        minChars={2}
        emptyText="No products match"
      />
      {errors.related && <p className="text-xs text-red-700">{errors.related}</p>}
      {items.length ? (
        <ol className="divide-y rounded-lg border">
          {items.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 px-3 py-2">
              <span className="text-muted-foreground w-5 text-xs tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <PickRow pick={p} />
                {errors[`related.${i}`] && <p className="mt-1 text-xs text-red-700">{errors[`related.${i}`]}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${p.sku} up`} disabled={i === 0} onClick={() => onChange((l) => move(l, i, i - 1))}>
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${p.sku} down`}
                disabled={i === items.length - 1}
                onClick={() => onChange((l) => move(l, i, i + 1))}
              >
                <ArrowDown />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${p.sku}`} onClick={() => onChange((l) => l.filter((x) => x.id !== p.id))}>
                <X />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">No related products. Inactive products are skipped in the shop.</p>
      )}
    </div>
  );
}
