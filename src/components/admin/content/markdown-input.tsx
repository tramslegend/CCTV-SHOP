"use client";

import { useRef } from "react";
import { Bold, Heading, Italic, Link as LinkIcon, List, ListOrdered } from "lucide-react";
import { invalidProps } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Edit = (text: string, start: number, end: number) => { text: string; select: [number, number] };

const wrap =
  (before: string, after = before, placeholder = "text"): Edit =>
  (text, start, end) => {
    const inner = text.slice(start, end) || placeholder;
    return { text: `${text.slice(0, start)}${before}${inner}${after}${text.slice(end)}`, select: [start + before.length, start + before.length + inner.length] };
  };

const linePrefix =
  (prefix: (i: number) => string, placeholder: string): Edit =>
  (text, start, end) => {
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const block = text.slice(lineStart, end) || placeholder;
    const replaced = block
      .split("\n")
      .map((l, i) => `${prefix(i)}${l}`)
      .join("\n");
    return { text: `${text.slice(0, lineStart)}${replaced}${text.slice(Math.max(end, lineStart))}`, select: [lineStart, lineStart + replaced.length] };
  };

const TOOLS: { label: string; icon: typeof Bold; edit: Edit; heading?: boolean }[] = [
  { label: "Sub-heading", icon: Heading, edit: linePrefix(() => "### ", "Sub-heading"), heading: true },
  { label: "Bold", icon: Bold, edit: wrap("**") },
  { label: "Italic", icon: Italic, edit: wrap("_") },
  { label: "Bulleted list", icon: List, edit: linePrefix(() => "- ", "List item") },
  { label: "Numbered list", icon: ListOrdered, edit: linePrefix((i) => `${i + 1}. `, "List item") },
  { label: "Link", icon: LinkIcon, edit: wrap("[", "](/contact)", "link text") },
];

/** Markdown textarea with a small formatting toolbar (bold, italic, lists, links). */
export function MarkdownInput({
  id,
  value,
  onChange,
  error,
  rows = 5,
  placeholder,
  headings = true,
  "aria-label": ariaLabel,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  rows?: number;
  placeholder?: string;
  /** Offer the sub-heading button. */
  headings?: boolean;
  "aria-label"?: string;
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
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-0.5 rounded-t-lg border border-b-0 bg-zinc-50 p-1">
        {TOOLS.filter((t) => headings || !t.heading).map(({ label, icon: Icon, edit }) => (
          <Button key={label} type="button" variant="ghost" size="icon-xs" aria-label={label} title={label} onClick={() => apply(edit)}>
            <Icon />
          </Button>
        ))}
      </div>
      <Textarea
        ref={area}
        id={id}
        aria-label={ariaLabel}
        value={value}
        rows={rows}
        placeholder={placeholder}
        className={cn("rounded-t-none leading-relaxed")}
        onChange={(e) => onChange(e.target.value)}
        {...invalidProps(id, error)}
      />
    </div>
  );
}
