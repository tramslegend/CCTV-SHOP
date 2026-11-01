"use client";

import { useRef } from "react";
import { Bold, Heading, Italic, Link as LinkIcon, List, ListOrdered } from "lucide-react";
import { FieldMessage, invalidProps } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent } from "@/components/sites/cctvmaster/product/markdown";

type Edit = (text: string, start: number, end: number) => { text: string; select: [number, number] };

const wrap =
  (before: string, after = before, placeholder = "text"): Edit =>
  (text, start, end) => {
    const inner = text.slice(start, end) || placeholder;
    const next = `${text.slice(0, start)}${before}${inner}${after}${text.slice(end)}`;
    return { text: next, select: [start + before.length, start + before.length + inner.length] };
  };

const linePrefix =
  (prefix: (i: number) => string): Edit =>
  (text, start, end) => {
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const block = text.slice(lineStart, end) || "List item";
    const lines = block.split("\n").map((l, i) => `${prefix(i)}${l}`);
    const replaced = lines.join("\n");
    return { text: `${text.slice(0, lineStart)}${replaced}${text.slice(Math.max(end, lineStart))}`, select: [lineStart, lineStart + replaced.length] };
  };

const TOOLS: { label: string; icon: typeof Bold; edit: Edit }[] = [
  { label: "Heading", icon: Heading, edit: linePrefix(() => "## ") },
  { label: "Bold", icon: Bold, edit: wrap("**") },
  { label: "Italic", icon: Italic, edit: wrap("_") },
  { label: "Bulleted list", icon: List, edit: linePrefix(() => "- ") },
  { label: "Numbered list", icon: ListOrdered, edit: linePrefix((i) => `${i + 1}. `) },
  { label: "Link", icon: LinkIcon, edit: wrap("[", "](https://)", "link text") },
];

const DEFAULT_PLACEHOLDER =
  "Describe what the product does, who it's for and what's in the box. Leave empty to show a summary generated from the specifications.";

/** Markdown description with a small formatting toolbar and a preview rendered exactly as in the shop. */
export function DescriptionEditor({
  value,
  onChange,
  error,
  placeholder = DEFAULT_PLACEHOLDER,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Hint shown in the empty textarea (defaults to the product description hint). */
  placeholder?: string;
}) {
  const area = useRef<HTMLTextAreaElement>(null);

  const apply = (edit: Edit) => {
    const el = area.current;
    if (!el) return;
    const { text, select } = edit(value, el.selectionStart, el.selectionEnd);
    onChange(text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(select[0], select[1]);
    });
  };

  return (
    <Tabs defaultValue="write" className="gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <span className="text-muted-foreground text-xs">Markdown: ## heading, **bold**, - list, [link](https://…)</span>
      </div>
      <TabsContent value="write" className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-0.5 rounded-t-lg border border-b-0 bg-surface p-1">
          {TOOLS.map(({ label, icon: Icon, edit }) => (
            <Button key={label} type="button" variant="ghost" size="icon-sm" aria-label={label} title={label} onClick={() => apply(edit)}>
              <Icon />
            </Button>
          ))}
        </div>
        <Textarea
          ref={area}
          id="pf-description"
          aria-label="Description"
          value={value}
          rows={12}
          maxLength={50_000}
          placeholder={placeholder}
          className="-mt-1.5 min-h-56 rounded-t-none leading-relaxed"
          onChange={(e) => onChange(e.target.value)}
          {...invalidProps("pf-description", error)}
        />
        <FieldMessage id="pf-description" error={error} />
      </TabsContent>
      <TabsContent value="preview">
        <div className="min-h-56 rounded-lg border bg-white p-5">
          {value.trim() ? (
            <MarkdownContent source={value} />
          ) : (
            <p className="text-muted-foreground text-sm">Nothing to preview. Without a description the shop shows a summary generated from the product data.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
