"use client";

import { SearchPicker } from "@/components/admin/search-picker";
import { ProductThumb } from "@/components/admin/products/product-thumb";
import { formatGBP, withVat } from "@/lib/cctvmaster/money";
import type { PickedProduct } from "@/lib/homepage/admin";

/** Product search for the homepage editor's pickers. */
async function searchProducts(q: string, type: "kits" | "products" | "all"): Promise<PickedProduct[]> {
  const params = new URLSearchParams({ q, type });
  const res = await fetch(`/admin/content/homepage/api/products?${params}`, { headers: { accept: "application/json" }, cache: "no-store" });
  if (res.redirected || !res.ok) throw new Error("Search failed");
  return ((await res.json()) as { results: PickedProduct[] }).results;
}

const STATUS_LABELS: Record<PickedProduct["status"], string> = { active: "Active", draft: "Draft", archived: "Archived" };

/** Thumbnail, name, SKU, price inc VAT and status of a picked product. */
export function PickedRow({ product }: { product: PickedProduct }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <ProductThumb src={product.image} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{product.name}</span>
        <span className="text-muted-foreground block truncate text-xs">
          {product.sku} · {formatGBP(withVat(product.price))} inc VAT{product.isKit ? " · Kit" : ""}
        </span>
      </span>
      {product.status !== "active" && (
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">{STATUS_LABELS[product.status]}</span>
      )}
    </span>
  );
}

export function ProductSearch({
  id,
  type,
  placeholder,
  chosen,
  onSelect,
  invalid,
  describedBy,
}: {
  id: string;
  type: "kits" | "products" | "all";
  placeholder: string;
  chosen: ReadonlySet<string>;
  onSelect: (product: PickedProduct) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <SearchPicker<PickedProduct>
      id={id}
      aria-label={placeholder}
      placeholder={placeholder}
      search={(q) => searchProducts(q, type)}
      getKey={(p) => p.id}
      isDisabled={(p) => chosen.has(p.id)}
      disabledLabel="Chosen"
      renderItem={(p) => <PickedRow product={p} />}
      onSelect={onSelect}
      minChars={2}
      emptyText={type === "kits" ? "No kits match" : "No products match"}
      invalid={invalid}
      describedBy={describedBy}
    />
  );
}
