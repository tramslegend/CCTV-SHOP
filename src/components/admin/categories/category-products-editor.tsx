"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ArrowUpToLine, GripVertical, Loader2, Lock, RotateCcw, Save, X } from "lucide-react";
import { saveCategoryProducts } from "@/app/admin/(panel)/categories/actions";
import { FormSection } from "@/components/admin/products/form-section";
import { PickRow } from "@/components/admin/products/related-editor";
import type { ProductPick } from "@/components/admin/products/types";
import { move, searchProductPicks } from "@/components/admin/products/utils";
import { SearchPicker } from "@/components/admin/search-picker";
import { toast } from "@/components/admin/toast";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { Button } from "@/components/ui/button";
import type { CategoryProductRow } from "@/lib/admin/categories/types";
import { cn } from "@/lib/utils";

const LOCK_TEXT: Record<NonNullable<CategoryProductRow["lock"]>, { label: string; hint: string }> = {
  main: { label: "Main category", hint: "This is the product's main category. Change it on the product page to remove it from here." },
  sub: {
    label: "Via sub-category",
    hint: "Listed because it's in a category below this one (a product is always listed in the parents of its categories).",
  },
};

const order = (rows: CategoryProductRow[]) => JSON.stringify(rows.map((r) => r.id));

/** The products a shop category lists, in the order the shop shows them (drag or use the arrows), with add/remove. */
export function CategoryProductsEditor({ categoryId, initial }: { categoryId: number; initial: CategoryProductRow[] }) {
  const [items, setItems] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, startSaving] = useTransition();
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dirty = order(items) !== order(saved);
  useUnsavedChanges(dirty && !saving);
  const listed = new Set(items.map((p) => p.id));

  const add = (p: ProductPick) =>
    setItems((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, { ...p, lock: null }]));

  const save = () =>
    startSaving(async () => {
      try {
        const snapshot = items;
        const result = await saveCategoryProducts(
          categoryId,
          snapshot.map((p) => p.id),
        );
        if (result.ok) {
          setSaved(snapshot);
          toast.success(result.message);
        } else toast.error(result.message);
      } catch {
        toast.error("The products couldn't be saved. Check your connection and try again.");
      }
    });

  return (
    <FormSection
      id="products"
      title="Products in this category"
      description="The shop lists them in this order when customers sort by “Newest”. Drag a row or use the arrows."
      actions={
        <>
          {dirty && (
            <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setItems(saved)}>
              <RotateCcw /> Discard
            </Button>
          )}
          <Button type="button" size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Save products
          </Button>
        </>
      }
    >
      <SearchPicker<ProductPick>
        id="cf-add-product"
        aria-label="Search products to add to this category"
        placeholder="Search by name or SKU to add a product…"
        search={(q) => searchProductPicks(q, "all")}
        getKey={(p) => p.id}
        isDisabled={(p) => listed.has(p.id)}
        disabledLabel="Listed"
        renderItem={(p) => <PickRow pick={p} />}
        onSelect={add}
        minChars={2}
        emptyText="No products match"
      />
      <p className="text-muted-foreground -mt-2 text-xs" aria-live="polite">
        {items.length.toLocaleString("en-GB")} {items.length === 1 ? "product" : "products"}
        {dirty ? " · unsaved changes" : ""}. Products added here are also listed in the categories above this one, and leave them again when removed.
      </p>
      {items.length ? (
        <ol className="max-h-[36rem] divide-y overflow-y-auto rounded-lg border" data-testid="category-products">
          {items.map((p, i) => {
            const lock = p.lock ? LOCK_TEXT[p.lock] : null;
            return (
              <li
                key={p.id}
                draggable
                onDragStart={(e) => {
                  dragFrom.current = i;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", p.id);
                }}
                onDragOver={(e) => {
                  if (dragFrom.current === null) return;
                  e.preventDefault();
                  setDragOver(i);
                }}
                onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
                onDrop={(e) => {
                  if (dragFrom.current === null) return;
                  e.preventDefault();
                  const from = dragFrom.current;
                  setItems((l) => move(l, from, i));
                  dragFrom.current = null;
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  dragFrom.current = null;
                  setDragOver(null);
                }}
                className={cn("flex items-center gap-2 bg-white px-2 py-1.5", dragOver === i && "ring-2 ring-zinc-900 ring-inset")}
              >
                <GripVertical className="text-muted-foreground size-4 shrink-0 cursor-grab" aria-hidden="true" />
                <span className="text-muted-foreground w-7 text-right text-xs tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <PickRow pick={p} />
                </div>
                {lock && (
                  <span className="text-muted-foreground hidden items-center gap-1 text-xs whitespace-nowrap md:inline-flex" title={lock.hint}>
                    <Lock className="size-3" aria-hidden="true" /> {lock.label}
                  </span>
                )}
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${p.sku} to the top`} title="Move to the top" disabled={i === 0} onClick={() => setItems((l) => move(l, i, 0))}>
                  <ArrowUpToLine />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${p.sku} up`} disabled={i === 0} onClick={() => setItems((l) => move(l, i, i - 1))}>
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${p.sku} down`}
                  disabled={i === items.length - 1}
                  onClick={() => setItems((l) => move(l, i, i + 1))}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${p.sku} from this category`}
                  title={lock ? lock.hint : "Remove from this category"}
                  disabled={!!lock}
                  onClick={() => setItems((l) => l.filter((x) => x.id !== p.id))}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          No products yet. Search above to add some.
        </p>
      )}
    </FormSection>
  );
}

