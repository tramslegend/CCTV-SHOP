"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { SimpleSelect } from "@/components/admin/simple-select";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type BlogListState, blogListHref } from "./blog-list-url";
import { POST_STATUS_LABELS, POST_STATUSES } from "./types";

const STATUS_OPTIONS = [{ value: "all" as const, label: "Any status" }, ...POST_STATUSES.map((s) => ({ value: s, label: POST_STATUS_LABELS[s] }))];
const LISTED_OPTIONS = [
  { value: "all" as const, label: "Listed or not" },
  { value: "listed" as const, label: "Listed on /blog" },
  { value: "unlisted" as const, label: "Unlisted" },
];

/** Search box and filters; every change is written to the URL, which the server page renders from. */
export function BlogFilters({ state }: { state: BlogListState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(state.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const go = (patch: Partial<BlogListState>) => startTransition(() => router.replace(blogListHref(state, patch), { scroll: false }));
  const filtered = state.q || state.status !== "all" || state.listed !== "all";

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
          aria-label="Search posts by title, address or topic"
          placeholder="Search title, address or topic…"
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
        <SimpleSelect aria-label="Filter by status" value={state.status} options={STATUS_OPTIONS} onValueChange={(status) => go({ status })} className="h-9 bg-white sm:w-40" />
        <SimpleSelect aria-label="Filter by listing" value={state.listed} options={LISTED_OPTIONS} onValueChange={(listed) => go({ listed })} className="h-9 bg-white sm:w-44" />
        {filtered && (
          <Link
            href={blogListHref({ ...state, q: "", status: "all", listed: "all" })}
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
