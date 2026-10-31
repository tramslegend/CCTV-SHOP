"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { type MediaListState, mediaListHref } from "./types";

/** Search box for the library (file name or alt text); the query is written to the URL the server page renders from. */
export function MediaSearch({ state }: { state: MediaListState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(state.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const go = (q: string) => startTransition(() => router.replace(mediaListHref(state, { q }), { scroll: false }));

  return (
    <form
      role="search"
      className="relative w-full sm:max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        go(query.trim());
      }}
    >
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden="true" />
      <Input
        type="search"
        aria-label="Search images by file name or alt text"
        placeholder="Search file name or alt text…"
        value={query}
        className="h-9 bg-white pr-8 pl-8"
        onChange={(e) => {
          const q = e.target.value;
          setQuery(q);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => go(q.trim()), 350);
        }}
      />
      {pending && <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin" aria-label="Loading" />}
    </form>
  );
}
