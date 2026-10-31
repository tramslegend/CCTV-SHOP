"use client";

import type { ReactNode } from "react";
import { AlignLeft, ArrowDown, ArrowUp, Heading2, Image as ImageIcon, Info, LayoutGrid, MessagesSquare, Plus, Trash2, X } from "lucide-react";
import { FieldMessage, FormField, invalidProps } from "@/components/admin/form-field";
import { SimpleSelect } from "@/components/admin/simple-select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  BLOCK_HINTS,
  BLOCK_LABELS,
  BLOCK_TYPES,
  type BlockOf,
  type BlockType,
  CALLOUT_TONES,
  type FactItem,
  newId,
  type PageBlock,
  TONE_LABELS,
} from "@/lib/content/blocks";
import { cn } from "@/lib/utils";
import { FaqEditor, fieldId, move } from "./faq-editor";
import { ImageField } from "./image-field";
import { MarkdownInput } from "./markdown-input";
import type { FieldErrors } from "./types";

export const BLOCK_ICONS: Record<BlockType, typeof Heading2> = {
  heading: Heading2,
  text: AlignLeft,
  faq: MessagesSquare,
  callout: Info,
  image: ImageIcon,
  facts: LayoutGrid,
};

const TONE_OPTIONS = CALLOUT_TONES.map((t) => ({ value: t, label: TONE_LABELS[t] }));

/** "Add block" menu: one item per block type. */
export function AddBlockMenu({ onAdd, label = "Add block", size = "sm", variant = "outline" }: { onAdd: (type: BlockType) => void; label?: string; size?: "sm" | "xs"; variant?: "outline" | "ghost" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant={variant} size={size} />}>
        <Plus /> {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {BLOCK_TYPES.map((type) => {
          const Icon = BLOCK_ICONS[type];
          return (
            <DropdownMenuItem key={type} onClick={() => onAdd(type)} className="items-start">
              <Icon className="mt-0.5" />
              <span>
                <span className="block font-medium">{BLOCK_LABELS[type]}</span>
                <span className="text-muted-foreground block text-xs">{BLOCK_HINTS[type]}</span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FactsEditor({
  block,
  onChange,
  errors,
}: {
  block: BlockOf<"facts">;
  onChange: (items: FactItem[]) => void;
  errors: FieldErrors;
}) {
  const key = `block.${block.id}.items`;
  const items = block.items;
  const update = (i: number, patch: Partial<FactItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div className="flex flex-col gap-3">
      {errors[key] && <p className="text-xs text-red-700">{errors[key]}</p>}
      {items.length > 0 && (
        <ol className="flex flex-col gap-2">
          {items.map((item, i) => {
            const k = (f: string) => `${key}.${i}.${f}`;
            return (
              <li key={item.id} className="flex gap-2 rounded-lg border bg-zinc-50/60 p-3">
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_1fr]">
                  <div className="flex flex-col gap-1">
                    <Input
                      id={fieldId("pg", k("label"))}
                      aria-label={`Fact ${i + 1} label`}
                      placeholder="Label, e.g. Free delivery"
                      value={item.label}
                      maxLength={120}
                      className="bg-white"
                      onChange={(e) => update(i, { label: e.target.value })}
                      {...invalidProps(fieldId("pg", k("label")), errors[k("label")])}
                    />
                    <FieldMessage id={fieldId("pg", k("label"))} error={errors[k("label")]} />
                  </div>
                  <Input
                    aria-label={`Fact ${i + 1} value`}
                    placeholder="Figure, e.g. {{delivery.freeFrom}} or more"
                    value={item.value}
                    maxLength={120}
                    className="bg-white font-semibold"
                    onChange={(e) => update(i, { value: e.target.value })}
                  />
                  <Input
                    aria-label={`Fact ${i + 1} note`}
                    placeholder="Small print (optional)"
                    value={item.note}
                    maxLength={300}
                    className="bg-white sm:col-span-2"
                    onChange={(e) => update(i, { note: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`Move fact ${i + 1} up`} disabled={i === 0} onClick={() => onChange(move(items, i, i - 1))}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`Move fact ${i + 1} down`} disabled={i === items.length - 1} onClick={() => onChange(move(items, i, i + 1))}>
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove fact ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= 12}
          onClick={() => onChange([...items, { id: newId("f"), label: "", value: "", note: "" }])}
        >
          <Plus /> Add fact
        </Button>
      </div>
    </div>
  );
}

/** One block of the page: its type-specific fields plus move / insert / remove controls. */
export function BlockEditor({
  block,
  index,
  count,
  errors,
  onChange,
  onMove,
  onRemove,
  onInsertAfter,
  onUploadingChange,
}: {
  block: PageBlock;
  index: number;
  count: number;
  errors: FieldErrors;
  onChange: (block: PageBlock) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
  onInsertAfter: (type: BlockType) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const Icon = BLOCK_ICONS[block.type];
  const k = (field: string) => `block.${block.id}.${field}`;
  const f = (field: string) => ({ id: fieldId("pg", k(field)), error: errors[k(field)] });
  const hasError = Object.keys(errors).some((key) => key.startsWith(`block.${block.id}.`) || key === `block.${block.id}`);
  const summary = block.type === "heading" ? block.text : block.type === "text" ? block.markdown.split("\n")[0] : "";

  let fields: ReactNode = null;
  switch (block.type) {
    case "heading":
      fields = (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Input
              id={f("text").id}
              aria-label="Heading text"
              placeholder="Heading"
              value={block.text}
              maxLength={300}
              className={cn("font-semibold", block.level === 2 ? "text-base" : "text-sm")}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
              {...invalidProps(f("text").id, f("text").error)}
            />
            <FieldMessage id={f("text").id} error={f("text").error} />
          </div>
          <div className="inline-flex shrink-0 rounded-lg bg-zinc-100 p-0.5 text-xs" role="radiogroup" aria-label="Heading size">
            {([2, 3] as const).map((level) => (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={block.level === level}
                onClick={() => onChange({ ...block, level })}
                className={cn("rounded-md px-2.5 py-1.5 font-medium", block.level === level ? "bg-white shadow-sm" : "text-zinc-600 hover:text-zinc-950")}
              >
                {level === 2 ? "Main heading" : "Sub-heading"}
              </button>
            ))}
          </div>
        </div>
      );
      break;
    case "text":
      fields = (
        <div className="flex flex-col gap-1">
          <MarkdownInput
            id={f("markdown").id}
            aria-label="Text"
            value={block.markdown}
            rows={Math.min(14, Math.max(4, block.markdown.split("\n").length + 1))}
            placeholder={"Write paragraphs here. Leave a blank line between paragraphs.\n- Start lines with a dash for a list\n**Bold**, _italic_ and [links](/delivery) work too."}
            onChange={(markdown) => onChange({ ...block, markdown })}
            error={f("markdown").error}
          />
          <FieldMessage id={f("markdown").id} error={f("markdown").error} />
        </div>
      );
      break;
    case "faq":
      fields = <FaqEditor items={block.items} onChange={(items) => onChange({ ...block, items })} errors={errors} errorKey={k("items")} idPrefix="pg" />;
      break;
    case "callout":
      fields = (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <FormField id={f("title").id} label="Title" error={f("title").error}>
              <Input id={f("title").id} value={block.title} maxLength={200} placeholder="e.g. Closed over the bank holiday" onChange={(e) => onChange({ ...block, title: e.target.value })} {...invalidProps(f("title").id, f("title").error)} />
            </FormField>
            <FormField id={f("tone").id} label="Colour">
              <SimpleSelect id={f("tone").id} value={block.tone} options={TONE_OPTIONS} onValueChange={(tone) => onChange({ ...block, tone })} />
            </FormField>
          </div>
          <FormField id={f("body").id} label="Text" error={f("body").error}>
            <MarkdownInput id={f("body").id} value={block.body} rows={3} headings={false} onChange={(body) => onChange({ ...block, body })} error={f("body").error} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id={f("linkLabel").id} label="Button text" hint="Optional." error={f("linkLabel").error}>
              <Input id={f("linkLabel").id} value={block.linkLabel} maxLength={80} placeholder="e.g. See trade options" onChange={(e) => onChange({ ...block, linkLabel: e.target.value })} {...invalidProps(f("linkLabel").id, f("linkLabel").error)} />
            </FormField>
            <FormField id={f("linkHref").id} label="Button link" hint="A shop path such as /contact, or https://…" error={f("linkHref").error}>
              <Input id={f("linkHref").id} value={block.linkHref} maxLength={500} placeholder="/contact" onChange={(e) => onChange({ ...block, linkHref: e.target.value.trim() })} {...invalidProps(f("linkHref").id, f("linkHref").error)} />
            </FormField>
          </div>
        </div>
      );
      break;
    case "image":
      fields = (
        <div className="grid gap-4 md:grid-cols-[minmax(0,20rem)_1fr]">
          <ImageField
            id={f("url").id}
            value={block.url || null}
            onChange={(url) => onChange({ ...block, url: url ?? "" })}
            onUploadingChange={onUploadingChange}
            error={f("url").error}
            alt={block.alt || "Image"}
            aspect="aspect-[4/3]"
            fit="contain"
          />
          <div className="flex flex-col gap-3">
            <FormField id={f("alt").id} label="Alt text" required hint="What the image shows, for people using screen readers." error={f("alt").error}>
              <Input id={f("alt").id} value={block.alt} maxLength={300} onChange={(e) => onChange({ ...block, alt: e.target.value })} {...invalidProps(f("alt").id, f("alt").error)} />
            </FormField>
            <FormField id={f("caption").id} label="Caption" hint="Optional, shown under the image." error={f("caption").error}>
              <Input id={f("caption").id} value={block.caption} maxLength={500} onChange={(e) => onChange({ ...block, caption: e.target.value })} />
            </FormField>
          </div>
        </div>
      );
      break;
    case "facts":
      fields = <FactsEditor block={block} errors={errors} onChange={(items) => onChange({ ...block, items })} />;
      break;
  }

  return (
    <li
      id={fieldId("pg", `block.${block.id}`)}
      tabIndex={-1}
      data-block-type={block.type}
      className={cn("rounded-xl bg-white ring-1 ring-black/10 outline-none", hasError && "ring-red-300")}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="text-muted-foreground w-5 text-right text-xs tabular-nums">{index + 1}</span>
        <Icon className="text-muted-foreground size-4" aria-hidden="true" />
        <span className="text-sm font-medium">{BLOCK_LABELS[block.type]}</span>
        {summary && block.type !== "heading" && <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">{summary}</span>}
        <span className="flex-1" />
        <Button type="button" variant="ghost" size="icon-xs" aria-label={`Move block ${index + 1} up`} title="Move up" disabled={index === 0} onClick={() => onMove(index - 1)}>
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`Move block ${index + 1} down`}
          title="Move down"
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
        >
          <ArrowDown />
        </Button>
        <AddBlockMenu onAdd={onInsertAfter} label="Insert below" size="xs" variant="ghost" />
        <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove block ${index + 1}`} title="Remove block" onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
      <div className="p-4">{fields}</div>
    </li>
  );
}
