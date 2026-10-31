"use client";

import { ArrowDown, ArrowUp, BookOpen, X } from "lucide-react";
import { SearchPicker } from "@/components/admin/search-picker";
import { Button } from "@/components/ui/button";
import type { FieldErrors, GuideOption } from "./types";
import { move } from "./utils";

/** Blog posts shown under "Helpful guides for this item", in order. */
export function GuidesEditor({
  options,
  value,
  onChange,
  errors,
}: {
  options: GuideOption[];
  value: string[];
  onChange: (slugs: string[]) => void;
  errors: FieldErrors;
}) {
  const bySlug = new Map(options.map((g) => [g.slug, g]));
  const search = (q: string) => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return options.filter((g) => words.every((w) => `${g.title} ${g.slug}`.toLowerCase().includes(w))).slice(0, 40);
  };
  return (
    <div className="flex flex-col gap-3">
      <SearchPicker<GuideOption>
        id="pf-guides"
        aria-label="Search blog posts to add as guides"
        placeholder="Search blog posts…"
        search={search}
        getKey={(g) => g.slug}
        isDisabled={(g) => value.includes(g.slug)}
        renderItem={(g) => <span className="block truncate">{g.title}</span>}
        onSelect={(g) => onChange([...value, g.slug])}
        minChars={0}
      />
      {errors.guides && <p className="text-xs text-red-700">{errors.guides}</p>}
      {value.length ? (
        <ol className="divide-y rounded-lg border">
          {value.map((slug, i) => (
            <li key={slug} className="flex items-center gap-2 px-3 py-2">
              <BookOpen className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{bySlug.get(slug)?.title ?? slug}</p>
                <p className="text-muted-foreground truncate text-xs">/blog/{slug}</p>
                {errors[`guides.${i}`] && <p className="text-xs text-red-700">{errors[`guides.${i}`]}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Move guide up" disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))}>
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Move guide down" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))}>
                <ArrowDown />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove guide" onClick={() => onChange(value.filter((s) => s !== slug))}>
                <X />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">No guides linked.</p>
      )}
    </div>
  );
}
