"use client";

import { X } from "lucide-react";
import { FieldMessage } from "@/components/admin/form-field";
import { SearchPicker } from "@/components/admin/search-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { listingCategoryIds } from "./category-tree";
import type { CategoryOption, FieldErrors } from "./types";

const matches = (o: CategoryOption, q: string) => {
  const text = o.path.join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => text.includes(w));
};

function CategoryLabel({ option }: { option: CategoryOption }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm">
        {option.name}
        {option.isKitRange && <span className="text-muted-foreground ml-1.5 text-xs">Kit range</span>}
      </span>
      {option.path.length > 1 && <span className="text-muted-foreground truncate text-xs">{option.path.slice(0, -1).join(" › ")}</span>}
    </span>
  );
}

export function CategoriesEditor({
  options,
  primaryId,
  extraIds,
  onPrimaryChange,
  onExtraChange,
  errors,
}: {
  options: CategoryOption[];
  primaryId: number | null;
  extraIds: number[];
  onPrimaryChange: (id: number | null) => void;
  onExtraChange: (ids: number[]) => void;
  errors: FieldErrors;
}) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const primary = primaryId !== null ? byId.get(primaryId) : undefined;
  const search = (q: string) => (q ? options.filter((o) => matches(o, q)) : options).slice(0, 60);
  const listed = listingCategoryIds(options, primaryId, extraIds)
    .map((id) => byId.get(id))
    .filter((o): o is CategoryOption => !!o);
  const extraErrors = extraIds.map((_, i) => errors[`extraCategoryIds.${i}`]).filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pf-primaryCategoryId">Primary category</Label>
        {primary ? (
          <div className="flex items-center gap-2 rounded-lg border bg-surface px-2.5 py-1.5">
            <span className="min-w-0 flex-1 truncate text-sm" title={primary.path.join(" › ")}>
              {primary.path.map((name, i) => (
                <span key={`${name}-${i}`} className={i === primary.path.length - 1 ? "font-medium" : "text-muted-foreground"}>
                  {i > 0 && " › "}
                  {name}
                </span>
              ))}
            </span>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Clear primary category" onClick={() => onPrimaryChange(null)}>
              <X />
            </Button>
          </div>
        ) : null}
        <SearchPicker<CategoryOption>
          id="pf-primaryCategoryId"
          placeholder={primary ? "Change category…" : "Search categories…"}
          search={search}
          getKey={(o) => String(o.id)}
          isDisabled={(o) => o.id === primaryId}
          disabledLabel="Selected"
          renderItem={(o) => <CategoryLabel option={o} />}
          onSelect={(o) => {
            onPrimaryChange(o.id);
            onExtraChange(extraIds.filter((id) => id !== o.id));
          }}
          minChars={0}
          invalid={!!errors.primaryCategoryId}
          describedBy={errors.primaryCategoryId ? "pf-primaryCategoryId-error" : undefined}
        />
        <FieldMessage id="pf-primaryCategoryId" error={errors.primaryCategoryId} hint="Sets the breadcrumb and the main listing for this product." />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pf-extraCategoryIds">Also list in</Label>
        {extraIds.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {extraIds.map((id) => {
              const o = byId.get(id);
              return (
                <li key={id} className="flex items-center gap-1 rounded-full border bg-white py-0.5 pr-0.5 pl-2.5 text-xs" title={o?.path.join(" › ")}>
                  {o?.name ?? `Category #${id}`}
                  <button
                    type="button"
                    className="text-muted-foreground rounded-full p-0.5 hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${o?.name ?? "category"}`}
                    onClick={() => onExtraChange(extraIds.filter((x) => x !== id))}
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <SearchPicker<CategoryOption>
          id="pf-extraCategoryIds"
          placeholder="Add another category…"
          search={search}
          getKey={(o) => String(o.id)}
          isDisabled={(o) => o.id === primaryId || extraIds.includes(o.id)}
          renderItem={(o) => <CategoryLabel option={o} />}
          onSelect={(o) => onExtraChange([...extraIds, o.id])}
          minChars={0}
        />
        {extraErrors.length > 0 && <p className="text-xs text-red-700">{extraErrors[0]}</p>}
      </div>

      <div className="text-muted-foreground rounded-lg bg-surface p-3 text-xs leading-relaxed">
        {listed.length ? (
          <>
            <span className="text-foreground font-medium">Shown in {listed.length === 1 ? "1 listing" : `${listed.length} listings`}:</span>{" "}
            {listed.map((o) => o.name).join(", ")}. Parent categories are included automatically.
          </>
        ) : primary?.isKitRange ? (
          "Kit ranges list kits automatically from their details (system, cameras, resolution)."
        ) : (
          "Not shown in any category listing yet. It can still be found by search and direct link."
        )}
      </div>
    </div>
  );
}
