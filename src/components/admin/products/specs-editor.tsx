"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { invalidProps } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AttributeValue, FieldErrors } from "./types";
import { move, newKey } from "./utils";

type Update = (fn: (prev: AttributeValue[]) => AttributeValue[]) => void;

/** Specification rows (name/value) shown in the shop's "Specifications" table, in this order. */
export function SpecsEditor({ rows, onChange, errors }: { rows: AttributeValue[]; onChange: Update; errors: FieldErrors }) {
  const update = (key: string, patch: Partial<AttributeValue>) => onChange((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = () => onChange((prev) => [...prev, { key: newKey("attr"), name: "", value: "" }]);

  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 && (
        <div className="text-muted-foreground hidden grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2 px-0.5 text-xs font-medium sm:grid">
          <span>Name</span>
          <span>Value</span>
          <span className="w-[84px]" />
        </div>
      )}
      <ol className="flex flex-col gap-2">
        {rows.map((row, i) => {
          const nameId = `pf-attributes-${i}-name`;
          const valueId = `pf-attributes-${i}-value`;
          const nameError = errors[`attributes.${i}.name`];
          const valueError = errors[`attributes.${i}.value`];
          return (
            <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]">
              <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                <Input
                  id={nameId}
                  aria-label={`Specification ${i + 1} name`}
                  placeholder="e.g. Resolution"
                  value={row.name}
                  maxLength={120}
                  onChange={(e) => update(row.key, { name: e.target.value })}
                  {...invalidProps(nameId, nameError)}
                />
                {nameError && (
                  <p id={`${nameId}-error`} className="text-xs text-red-700">
                    {nameError}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Input
                  id={valueId}
                  aria-label={`Specification ${i + 1} value`}
                  placeholder="e.g. 4MP (2560 × 1440)"
                  value={row.value}
                  maxLength={1000}
                  onChange={(e) => update(row.key, { value: e.target.value })}
                  {...invalidProps(valueId, valueError)}
                />
                {valueError && (
                  <p id={`${valueId}-error`} className="text-xs text-red-700">
                    {valueError}
                  </p>
                )}
              </div>
              <div className="flex items-start gap-0.5">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move specification ${i + 1} up`} disabled={i === 0} onClick={() => onChange((p) => move(p, i, i - 1))}>
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move specification ${i + 1} down`}
                  disabled={i === rows.length - 1}
                  onClick={() => onChange((p) => move(p, i, i + 1))}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove specification ${i + 1}`}
                  className="text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={() => onChange((p) => p.filter((r) => r.key !== row.key))}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      {!rows.length && <p className="text-muted-foreground text-sm">No specifications yet. They appear as a table on the product page.</p>}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus /> Add specification
        </Button>
      </div>
    </div>
  );
}
