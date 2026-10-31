"use client";

import { type ReactNode, useId, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Type-ahead picker (ARIA combobox). `search` may filter a local list or call the server; stale responses are ignored.
 * Note: the popup is absolutely positioned, so the surrounding container must not clip overflow.
 */
export function SearchPicker<T>({
  id,
  placeholder,
  search,
  getKey,
  renderItem,
  onSelect,
  isDisabled,
  disabledLabel = "Added",
  minChars = 1,
  emptyText = "No matches",
  className,
  invalid,
  describedBy,
  "aria-label": ariaLabel,
}: {
  id?: string;
  placeholder: string;
  search: (query: string) => T[] | Promise<T[]>;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  isDisabled?: (item: T) => boolean;
  disabledLabel?: string;
  /** 0 = show suggestions as soon as the field is focused. */
  minChars?: number;
  emptyText?: string;
  className?: string;
  invalid?: boolean;
  describedBy?: string;
  "aria-label"?: string;
}) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const listId = `${autoId}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < minChars) {
      seq.current++;
      setResults([]);
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    const out = search(q.trim());
    if (!(out instanceof Promise)) {
      setResults(out);
      setActive(out.length ? 0 : -1);
      return;
    }
    setLoading(true);
    out
      .then((list) => {
        if (mine !== seq.current) return;
        setResults(list);
        setActive(list.length ? 0 : -1);
      })
      .catch(() => {
        if (mine === seq.current) setResults([]);
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  };

  /** Async searches are debounced; local filtering runs on every keystroke. */
  const schedule = (q: string, immediate = false) => {
    if (timer.current) clearTimeout(timer.current);
    if (immediate) run(q);
    else timer.current = setTimeout(() => run(q), 200);
  };

  const choose = (item: T) => {
    if (isDisabled?.(item)) return;
    onSelect(item);
    setQuery("");
    setResults([]);
    setOpen(false);
    setActive(-1);
  };

  const showList = open && (query.trim().length >= minChars || minChars === 0);
  const activeId = active >= 0 && results[active] ? `${listId}-${active}` : undefined;

  return (
    <div className={cn("relative", className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" aria-hidden="true" />
      <Input
        id={inputId}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        className="pl-8"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          schedule(e.target.value, false);
        }}
        onFocus={() => {
          setOpen(true);
          if (minChars === 0 || query.trim().length >= minChars) schedule(query, true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            if (!results.length) return;
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (i + step + results.length) % results.length);
          } else if (e.key === "Enter") {
            // Never submit the surrounding form from the picker.
            e.preventDefault();
            if (showList && results[active]) choose(results[active]);
          } else if (e.key === "Escape" && open) {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      {loading && (
        <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin" aria-hidden="true" />
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          // Keep focus in the input while clicking an option.
          onMouseDown={(e) => e.preventDefault()}
          className="bg-popover absolute top-full right-0 left-0 z-40 mt-1 max-h-80 overflow-y-auto rounded-lg p-1 shadow-lg ring-1 ring-black/10"
        >
          {results.length === 0 ? (
            <li className="text-muted-foreground px-2 py-2 text-sm">{loading ? "Searching…" : emptyText}</li>
          ) : (
            results.map((item, i) => {
              const disabled = isDisabled?.(item) ?? false;
              return (
                <li
                  key={getKey(item)}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  aria-disabled={disabled || undefined}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    i === active && "bg-zinc-100",
                    disabled && "cursor-default opacity-50",
                  )}
                >
                  <div className="min-w-0 flex-1">{renderItem(item)}</div>
                  {disabled && <span className="text-muted-foreground shrink-0 text-xs">{disabledLabel}</span>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
