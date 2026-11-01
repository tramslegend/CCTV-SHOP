"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { FieldMessage, invalidProps } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type FaqItem, newId } from "@/lib/content/blocks";
import type { FieldErrors } from "./types";

/** Returns a copy of the list with item `from` moved to index `to`. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Element id for an error key: "faq.2.a" → "pg-faq-2-a". */
export const fieldId = (prefix: string, key: string) => `${prefix}-${key.replace(/\./g, "-")}`;

/**
 * Question-and-answer pairs, in order. `errorKey` is the errors prefix of this list ("faq" or "block.<id>.items"),
 * `idPrefix` the element-id prefix ("pf" / "pg").
 */
export function FaqEditor({
  items,
  onChange,
  errors,
  errorKey,
  idPrefix,
  addLabel = "Add question",
}: {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
  errors: FieldErrors;
  errorKey: string;
  idPrefix: string;
  addLabel?: string;
}) {
  const update = (i: number, patch: Partial<FaqItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div className="flex flex-col gap-3">
      {errors[errorKey] && <p className="text-xs text-red-700">{errors[errorKey]}</p>}
      {items.length > 0 && (
        <ol className="flex flex-col gap-3">
          {items.map((item, i) => {
            const qKey = `${errorKey}.${i}.q`;
            const aKey = `${errorKey}.${i}.a`;
            const qId = fieldId(idPrefix, qKey);
            const aId = fieldId(idPrefix, aKey);
            return (
              <li key={item.id} className="flex gap-2 rounded-lg border bg-surface/60 p-3">
                <span className="text-muted-foreground w-5 pt-2 text-xs tabular-nums">{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <Input
                      id={qId}
                      aria-label={`Question ${i + 1}`}
                      placeholder="Question"
                      value={item.q}
                      maxLength={500}
                      className="bg-white font-medium"
                      onChange={(e) => update(i, { q: e.target.value })}
                      {...invalidProps(qId, errors[qKey])}
                    />
                    <FieldMessage id={qId} error={errors[qKey]} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Textarea
                      id={aId}
                      aria-label={`Answer ${i + 1}`}
                      placeholder="Answer. **Bold** and [links](/delivery) work here."
                      value={item.a}
                      rows={2}
                      maxLength={4000}
                      className="bg-white"
                      onChange={(e) => update(i, { a: e.target.value })}
                      {...invalidProps(aId, errors[aKey])}
                    />
                    <FieldMessage id={aId} error={errors[aKey]} />
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => onChange(move(items, i, i - 1))}>
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Move question ${i + 1} down`}
                    disabled={i === items.length - 1}
                    onClick={() => onChange(move(items, i, i + 1))}
                  >
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove question ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { id: newId("q"), q: "", a: "" }])}>
          <Plus /> {addLabel}
        </Button>
      </div>
    </div>
  );
}
