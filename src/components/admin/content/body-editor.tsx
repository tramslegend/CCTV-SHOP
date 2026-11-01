"use client";

import { useMemo, useState } from "react";
import { ListTree } from "lucide-react";
import { FieldMessage } from "@/components/admin/form-field";
import { ContentMarkdown } from "@/components/sites/cctvmaster/content/content-markdown";
import { POST_BODY } from "@/components/sites/cctvmaster/content/post-prose";
import { countWords, markdownHeadings, readingMinutes } from "@/lib/content/markdown";
import { cn } from "@/lib/utils";
import { MarkdownInput } from "./markdown-input";

/**
 * The article body (markdown) with a preview in the post page's own type styles, the outline its ## and ### headings
 * make (the post's "On this page" list), and the word count behind the reading time.
 */
export function BodyEditor({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const headings = useMemo(() => markdownHeadings(value), [value]);
  const words = useMemo(() => countWords(value), [value]);
  const headingIds = useMemo(() => Object.fromEntries(headings.map((h) => [h.line, h.id])), [headings]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-muted p-0.5 text-sm" role="tablist" aria-label="Body editor">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("rounded-md px-3 py-1 font-medium capitalize", tab === t ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
          {value.trim() ? `${words.toLocaleString("en-GB")} words · ${readingMinutes(words)} min read · ${headings.length} headings` : "Markdown: ## heading, ### sub-heading, **bold**, - list, [link](/products)"}
        </span>
      </div>
      {tab === "write" ? (
        <>
          <MarkdownInput
            id="pf-body"
            aria-label="Article body"
            value={value}
            rows={18}
            onChange={onChange}
            error={error}
            placeholder={"## First section heading\n\nWrite the article here. Each ## heading becomes an entry in the post's “On this page” list.\n\n### A sub-section\n\n- Lists, **bold** text and [links](/categories/cameras) work too."}
          />
          <FieldMessage id="pf-body" error={error} />
        </>
      ) : (
        <div className="grid gap-4 rounded-lg border bg-white p-5 md:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="min-h-56 min-w-0 text-[oklab(0.1912_0_0)]">
            {value.trim() ? (
              <ContentMarkdown source={value} classes={POST_BODY} headingIds={headingIds} />
            ) : (
              <p className="text-muted-foreground text-sm">Nothing to preview yet.</p>
            )}
          </div>
          <nav aria-label="Outline preview" className="border-t pt-3 text-xs md:border-t-0 md:border-l md:pt-0 md:pl-4">
            <p className="text-muted-foreground mb-2 flex items-center gap-1.5 font-semibold tracking-wide uppercase">
              <ListTree className="size-3.5" aria-hidden="true" /> On this page
            </p>
            {headings.length ? (
              <ul className="space-y-1">
                {headings.map((h) => (
                  <li key={`${h.line}-${h.id}`} className={cn("leading-snug", h.level === 3 ? "text-muted-foreground pl-3" : "font-medium")}>
                    {h.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Add ## headings to build the table of contents.</p>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
