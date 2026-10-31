"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { SimpleSelect } from "@/components/admin/simple-select";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { type ListState, listHref } from "./list-url";
import { AVAILABILITIES, AVAILABILITY_LABELS, type CategoryOption, PRODUCT_STATUSES, STATUS_LABELS } from "./types";

const STATUS_OPTIONS = [{ value: "all" as const, label: "Any status" }, ...PRODUCT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))];
const AVAILABILITY_OPTIONS = [
  { value: "all" as const, label: "Any availability" },
  ...AVAILABILITIES.map((a) => ({ value: a, label: AVAILABILITY_LABELS[a] })),
];

/** Search box and filters; every change is written to the URL, which the server page renders from. */
export function ProductsFilters({ state, categories }: { state: ListState; categories: CategoryOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(state.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (patch: Partial<ListState>) => startTransition(() => router.replace(listHref(state, patch), { scroll: false }));

  const categoryItems = [{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))];
  const filtered = state.q || state.status !== "all" || state.availability !== "all" || state.category !== null;

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <form
        role="search"
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (timer.current) clearTimeout(timer.current);
          go({ q: query.trim() });
        }}
      >
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden="true" />
        <Input
          type="search"
          aria-label="Search products by name, SKU or brand"
          placeholder="Search name, SKU or brand…"
          value={query}
          className="h-9 bg-white pr-8 pl-8"
          onChange={(e) => {
            const q = e.target.value;
            setQuery(q);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => go({ q: q.trim() }), 350);
          }}
        />
        {pending && <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin" aria-label="Loading" />}
      </form>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <SimpleSelect
          aria-label="Filter by status"
          value={state.status}
          options={STATUS_OPTIONS}
          onValueChange={(status) => go({ status })}
          className="h-9 bg-white sm:w-40"
        />
        <SimpleSelect
          aria-label="Filter by availability"
          value={state.availability}
          options={AVAILABILITY_OPTIONS}
          onValueChange={(availability) => go({ availability })}
          className="h-9 bg-white sm:w-44"
        />
        <Select
          items={categoryItems}
          value={state.category === null ? "all" : String(state.category)}
          onValueChange={(v) => v !== null && go({ category: v === "all" ? null : Number(v) })}
        >
          <SelectTrigger aria-label="Filter by category" className="col-span-2 h-9 w-full bg-white sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="max-h-96">
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                <span style={{ paddingLeft: `${(c.path.length - 1) * 0.875}rem` }} className={c.path.length === 1 ? "font-medium" : undefined}>
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Link
            href={listHref({ ...state, q: "", status: "all", availability: "all", category: null })}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "col-span-2 h-9" })}
            onClick={() => setQuery("")}
          >
            <X /> Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}
