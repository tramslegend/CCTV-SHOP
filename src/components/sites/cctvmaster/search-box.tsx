"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchSuggestions } from "@/lib/cctvmaster/types";
import { PackageIcon, SearchIcon, XIcon } from "./icons";

const inputClass =
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive pr-10 pl-10";

// Header search with instant suggestions from the local catalogue (/api/search), like the source.
export function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(() => params.get("search") ?? "");
  const [results, setResults] = useState<SearchSuggestions | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<SearchSuggestions>)
        .then(setResults)
        .catch(() => {});
    }, 150);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const close = () => setOpen(false);
  const showList = open && query.trim().length >= 2 && results !== null;
  const hasResults = results && (results.products.length > 0 || results.categories.length > 0);

  return (
    <div ref={wrapRef} className="relative">
      <form
        className="relative"
        action="/products"
        method="GET"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          close();
          router.push(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
        }}
      >
        <input
          type="search"
          name="search"
          className={inputClass}
          placeholder="Search for CCTV cameras, systems, and accessories..."
          aria-label="Search products"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showList}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && close()}
        />
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
            }}
            className="hover:bg-accent hover:text-accent-foreground absolute top-1/2 right-1 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </form>
      {showList && (
        <div
          id={listId}
          className="bg-background absolute top-full right-0 left-0 z-50 mt-2 max-h-[400px] overflow-y-auto rounded-lg border shadow-xl"
        >
          {!hasResults && <p className="text-muted-foreground p-4 text-sm">No products found for &ldquo;{query.trim()}&rdquo;</p>}
          {results.categories.length > 0 && (
            <div className="border-b p-3">
              <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold uppercase">
                <SearchIcon className="h-3 w-3" />
                Categories
              </div>
              <div className="flex flex-wrap gap-2">
                {results.categories.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    onClick={close}
                    className="hover:bg-muted rounded-full border px-3 py-1 text-sm transition-colors"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {results.products.length > 0 && (
            <div className="p-3">
              <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold uppercase">
                <PackageIcon className="h-3 w-3" />
                Products
              </div>
              <div className="space-y-1">
                {results.products.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={close}
                    className="hover:bg-muted flex items-center gap-3 rounded-md p-2 transition-colors"
                  >
                    <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
                      {p.image && <Image src={p.image} alt={p.name} width={48} height={48} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-primary text-sm font-semibold">{p.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href={`/products?search=${encodeURIComponent(query.trim())}`}
                onClick={close}
                className="text-primary mt-2 block w-full rounded-md p-2 text-center text-sm font-medium hover:underline"
              >
                View all results for &ldquo;{query.trim()}&rdquo;
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
