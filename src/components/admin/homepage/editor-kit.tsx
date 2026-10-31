"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ImageOff, Images, Loader2, RotateCcw, Save, Trash2, Upload, X } from "lucide-react";
import { FormField, invalidProps } from "@/components/admin/form-field";
import { MediaPickerDialog } from "@/components/admin/media/media-picker-dialog";
import { ACCEPTED_TYPES, checkImageFile, uploadImage } from "@/components/admin/media/upload-client";
import { SimpleSelect } from "@/components/admin/simple-select";
import { toast } from "@/components/admin/toast";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { MONO } from "@/components/admin/products/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FEATURE_ICON_LABELS, FEATURE_ICONS, type FeatureIconName, type LinkSetting } from "@/lib/homepage/schema";
import { TOKEN_HELP, TOKENS } from "@/lib/homepage/text";
import type { ContentActionResult, FieldMessages } from "@/lib/homepage/validation";
import { cn } from "@/lib/utils";

// Building blocks shared by the homepage and navigation editors (/admin/content/homepage, /admin/content/navigation).

/** Field id for a form path: ("hp", "hero.primary.href") → "hp-hero-primary-href". */
export const fieldId = (prefix: string, path: string) => `${prefix}-${path.replace(/\./g, "-")}`;

/** Returns a copy of the list with item `from` moved to index `to`. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const dropPaths = (messages: FieldMessages, paths: string[]) => {
  if (!paths.some((p) => Object.keys(messages).some((k) => k === p || k.startsWith(`${p}.`)))) return messages;
  return Object.fromEntries(Object.entries(messages).filter(([k]) => !paths.some((p) => k === p || k.startsWith(`${p}.`))));
};

/**
 * Editor state: values, the saved baseline (for "unsaved changes" and the leave-page guard), inline errors and
 * warnings, and saving through a server action that returns the normalised values.
 */
export function useContentForm<V>({
  prefix,
  initial,
  initialWarnings,
  save,
  onErrors,
}: {
  prefix: string;
  initial: V;
  initialWarnings: FieldMessages;
  save: (values: V) => Promise<ContentActionResult<V>>;
  /** Called with the fields that failed, before focusing the first one (e.g. to expand their panels). */
  onErrors?: (paths: string[]) => void;
}) {
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [errors, setErrors] = useState<FieldMessages>({});
  const [warnings, setWarnings] = useState<FieldMessages>(initialWarnings);
  const [saving, startSaving] = useTransition();
  const dirty = JSON.stringify(values) !== baseline;
  useUnsavedChanges(dirty);
  // Latest values, so edits made while a save is in flight aren't replaced by the saved result.
  const latest = useRef(values);
  useEffect(() => {
    latest.current = values;
  }, [values]);

  /** Updates values and clears the messages of the fields that changed (`paths`, and anything below them). */
  const update = (fn: (prev: V) => V, ...paths: string[]) => {
    setValues(fn);
    if (paths.length) {
      setErrors((prev) => dropPaths(prev, paths));
      setWarnings((prev) => dropPaths(prev, paths));
    }
  };

  const submit = () => {
    if (saving) return;
    const submitted = JSON.stringify(values);
    startSaving(async () => {
      try {
        const result = await save(values);
        setWarnings(result.warnings ?? {});
        if (result.ok) {
          if (JSON.stringify(latest.current) === submitted) setValues(result.data);
          setBaseline(JSON.stringify(result.data));
          setErrors({});
          toast.success(result.message);
        } else {
          const fieldErrors = result.fieldErrors ?? {};
          setErrors(fieldErrors);
          toast.error(result.message);
          const paths = Object.keys(fieldErrors);
          onErrors?.(paths);
          if (paths[0])
            setTimeout(() => {
              const el = document.getElementById(fieldId(prefix, paths[0])) ?? document.querySelector<HTMLElement>(`[data-field="${paths[0]}"]`);
              el?.scrollIntoView({ block: "center" });
              el?.focus();
            }, 50);
        }
      } catch {
        toast.error("The changes couldn't be saved. Check your connection and try again.");
      }
    });
  };

  const discard = () => {
    if (!dirty || window.confirm("Discard your unsaved changes?")) {
      setValues(JSON.parse(baseline) as V);
      setErrors({});
    }
  };

  return { values, update, errors, warnings, saving, dirty, submit, discard };
}

/** Title and save bar that stays under the admin header while scrolling. */
export function EditorBar({
  title,
  backHref,
  backLabel,
  dirty,
  saving,
  busy,
  onDiscard,
  actions,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  dirty: boolean;
  saving: boolean;
  busy?: string;
  onDiscard: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="sticky top-14 z-20 -mx-4 mb-6 border-b bg-zinc-50/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={backHref} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label={backLabel}>
          <ArrowLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          <p className={cn("text-xs", dirty ? "font-medium text-amber-700" : "text-muted-foreground")} aria-live="polite">
            {saving ? "Saving…" : busy ? busy : dirty ? "Unsaved changes" : "All changes saved"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {dirty && (
            <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
              <RotateCcw /> Discard
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!dirty || saving || !!busy}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Warning (amber) under a field, or its hint. */
function hintWith(warning: string | undefined, hint: ReactNode) {
  if (!warning) return hint;
  return <span className="font-medium text-amber-700">⚠ {warning}</span>;
}

export interface FieldProps {
  prefix: string;
  path: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  warning?: string;
  hint?: ReactNode;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  multiline?: boolean;
  rows?: number;
}

/** Labelled text input (or textarea) with inline error / warning / hint. */
export function TextInput({ prefix, path, label, value, onChange, error, warning, hint, required, placeholder, maxLength, className, multiline, rows }: FieldProps) {
  const id = fieldId(prefix, path);
  return (
    <FormField id={id} label={label} hint={hintWith(warning, hint)} error={error} required={required} className={className}>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows ?? 3}
          {...invalidProps(id, error)}
        />
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} {...invalidProps(id, error)} />
      )}
    </FormField>
  );
}

/** Text + link pair. */
export function LinkFields({
  prefix,
  path,
  value,
  onChange,
  errors,
  warnings,
  labelLabel = "Button text",
  hrefLabel = "Link",
  hrefHint,
}: {
  prefix: string;
  path: string;
  value: LinkSetting;
  onChange: (value: LinkSetting, changed: string) => void;
  errors: FieldMessages;
  warnings: FieldMessages;
  labelLabel?: string;
  hrefLabel?: string;
  hrefHint?: ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextInput
        prefix={prefix}
        path={`${path}.label`}
        label={labelLabel}
        value={value.label}
        onChange={(label) => onChange({ ...value, label }, `${path}.label`)}
        error={errors[`${path}.label`]}
        maxLength={80}
      />
      <TextInput
        prefix={prefix}
        path={`${path}.href`}
        label={hrefLabel}
        value={value.href}
        onChange={(href) => onChange({ ...value, href }, `${path}.href`)}
        error={errors[`${path}.href`]}
        warning={warnings[`${path}.href`]}
        placeholder="/products"
        maxLength={500}
        hint={hrefHint ?? "A page on the shop such as /contact, or a full web address."}
      />
    </div>
  );
}

/** Up / down / remove buttons for a list row. */
export function RowActions({ index, count, label, onMove, onRemove }: { index: number; count: number; label: string; onMove: (to: number) => void; onRemove?: () => void }) {
  return (
    <div className="flex shrink-0 items-center">
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(index - 1)}>
        <ArrowUp />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(index + 1)}>
        <ArrowDown />
      </Button>
      {onRemove && (
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${label}`} onClick={onRemove}>
          <X />
        </Button>
      )}
    </div>
  );
}

/** "Add …" button that disables itself at the limit. */
export function AddButton({ onClick, label, count, max }: { onClick: () => void; label: string; count: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={count >= max}>
        {label}
      </Button>
      <span className="text-muted-foreground text-xs tabular-nums">
        {count} of {max}
      </span>
    </div>
  );
}

const ICON_OPTIONS = FEATURE_ICONS.map((value) => ({ value, label: FEATURE_ICON_LABELS[value] }));

export function IconSelect({ id, value, onChange }: { id: string; value: FeatureIconName; onChange: (v: FeatureIconName) => void }) {
  return <SimpleSelect id={id} value={value} onValueChange={onChange} options={ICON_OPTIONS} aria-label="Icon" />;
}

/** Labelled on/off switch. */
export function SwitchField({ id, label, hint, checked, onChange, disabled }: { id: string; label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5" />
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm leading-tight font-medium">
          {label}
        </label>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </div>
    </div>
  );
}

/** Which {tokens} can be used in a text. */
export function TokenHelp({ only }: { only?: readonly (typeof TOKENS)[number][] }) {
  const list = only ?? TOKENS;
  return (
    <p className="text-muted-foreground text-xs leading-relaxed">
      You can write{" "}
      {list.map((t, i) => (
        <span key={t}>
          <code className={cn("rounded bg-zinc-100 px-1 text-[11px] text-zinc-800", MONO)}>{`{${t}}`}</code> for {TOKEN_HELP[t]}
          {i < list.length - 1 ? (i === list.length - 2 ? " and " : ", ") : "."}
        </span>
      ))}{" "}
      They follow your Settings automatically.
    </p>
  );
}

/**
 * Image chooser: upload (straight to Blob in production, through the media upload route locally), pick from the media
 * library, or clear. When cleared, `fallback` (e.g. the category's own image) is shown and used.
 */
export function ImagePicker({
  id,
  value,
  onChange,
  fallback,
  fallbackLabel = "Default",
  size = 56,
  error,
  onUploadingChange,
  compact,
}: {
  id: string;
  value: string;
  onChange: (url: string) => void;
  fallback?: string;
  fallbackLabel?: string;
  size?: number;
  error?: string;
  onUploadingChange?: (uploading: boolean) => void;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const shown = value || fallback || "";

  const upload = (file: File | undefined) => {
    if (!file || uploading) return;
    const problem = checkImageFile(file);
    if (problem) return void toast.error(problem);
    setUploading(true);
    onUploadingChange?.(true);
    uploadImage(file, { folder: "media", serverEndpoint: "/admin/media/api/upload" })
      .then((r) => {
        onChange(r.url);
        toast.success("Image uploaded. Save to use it on the shop.");
      })
      .catch((e: Error) => toast.error(`${file.name}: ${e.message}`))
      .finally(() => {
        setUploading(false);
        onUploadingChange?.(false);
      });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-field={id}>
      <span
        className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white", error && "border-red-400")}
        style={{ width: size, height: size }}
      >
        {shown ? (
          <Image src={shown} alt="" fill sizes={`${size * 2}px`} className={cn("object-contain p-0.5", uploading && "opacity-40")} />
        ) : (
          <ImageOff className="text-muted-foreground size-4" aria-hidden="true" />
        )}
        {uploading && <Loader2 className="absolute size-4 animate-spin text-zinc-700" aria-label="Uploading" />}
      </span>
      <div className={cn("flex flex-wrap gap-1", !compact && "gap-2")}>
        <Button id={id} type="button" variant="outline" size={compact ? "xs" : "sm"} onClick={() => setPickerOpen(true)} disabled={uploading}>
          <Images /> Library
        </Button>
        <Button type="button" variant="outline" size={compact ? "xs" : "sm"} onClick={() => input.current?.click()} disabled={uploading}>
          <Upload /> Upload
        </Button>
        {value && (
          <Button type="button" variant="ghost" size={compact ? "xs" : "sm"} onClick={() => onChange("")} disabled={uploading}>
            {fallback ? <RotateCcw /> : <Trash2 />} {fallback ? fallbackLabel : "Remove"}
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        hidden
        onChange={(e) => {
          upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        existingUrls={new Set(value ? [value] : [])}
        limit={1}
        onPick={([picked]) => picked && onChange(picked.url)}
      />
    </div>
  );
}

/** A collapsible panel for one homepage section or navigation area. */
export function Panel({
  id,
  title,
  description,
  open,
  onOpenChange,
  errorCount = 0,
  header,
  muted,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorCount?: number;
  /** Controls on the right of the title (switch, reorder). */
  header?: ReactNode;
  /** Section switched off. */
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 rounded-xl bg-white ring-1 ring-black/10">
      <header className={cn("flex flex-wrap items-center gap-3 px-4 py-3", open && "border-b")}>
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:ring-zinc-900/30 focus-visible:outline-none"
        >
          <ChevronDown className={cn("size-4 shrink-0 text-zinc-500 transition-transform", !open && "-rotate-90")} aria-hidden="true" />
          <span className="min-w-0">
            <span id={`${id}-title`} className={cn("block text-[15px] font-semibold", muted && "text-zinc-500")}>
              {title}
              {muted && <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 align-middle text-[11px] font-medium text-zinc-600">Hidden</span>}
              {errorCount > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 align-middle text-[11px] font-medium text-red-800">
                  {errorCount === 1 ? "1 problem" : `${errorCount} problems`}
                </span>
              )}
            </span>
            {description && <span className="text-muted-foreground mt-0.5 block text-xs">{description}</span>}
          </span>
        </button>
        {header && <div className="flex items-center gap-2">{header}</div>}
      </header>
      {open && (
        <div id={`${id}-body`} className="flex flex-col gap-5 p-5">
          {children}
        </div>
      )}
    </section>
  );
}

/** Heading for a group of fields inside a panel. */
export function Group({ title, description, children, className }: { title: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-3", className)}>
      <legend className="mb-2 text-sm font-semibold">
        {title}
        {description && <span className="text-muted-foreground mt-0.5 block text-xs font-normal">{description}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/** Error or warning for a whole list. */
export function ListMessage({ error, warning }: { error?: string; warning?: string }) {
  if (error) return <p className="text-xs text-red-700">{error}</p>;
  if (warning) return <p className="text-xs font-medium text-amber-700">⚠ {warning}</p>;
  return null;
}
