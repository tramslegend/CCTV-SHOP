"use client";

import type { FormEvent, ReactNode } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { FormField, invalidProps } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Field id for a section's field path: ("store", "address.postcode") → "store-address-postcode". */
export const fieldId = (section: string, path: string) => `${section}-${path.replace(/\./g, "-")}`;

/** One settings section: a titled card that is its own form, with a save bar at the bottom. */
export function SettingsSection({
  id,
  title,
  description,
  saveLabel,
  dirty,
  saving,
  busy,
  onSave,
  onDiscard,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  saveLabel: string;
  dirty: boolean;
  saving: boolean;
  /** Something else is in progress (e.g. a logo upload): saving waits for it. */
  busy?: string;
  onSave: () => void;
  onDiscard: () => void;
  children: ReactNode;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave();
  };
  return (
    <form
      id={id}
      aria-labelledby={`${id}-title`}
      noValidate
      onSubmit={submit}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          onSave();
        }
      }}
      className="scroll-mt-20 rounded-xl bg-white ring-1 ring-black/10"
    >
      <header className="border-b px-5 py-4">
        <h2 id={`${id}-title`} className="text-base font-semibold">
          {title}
        </h2>
        {description && <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>}
      </header>
      <div className="flex flex-col gap-6 p-5">{children}</div>
      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t bg-zinc-50/70 px-5 py-3">
        <p className={cn("text-xs", dirty ? "font-medium text-amber-700" : "text-muted-foreground")} aria-live="polite">
          {saving ? "Saving…" : busy ? busy : dirty ? "Unsaved changes" : "All changes saved"}
        </p>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
              <RotateCcw /> Discard
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!dirty || saving || !!busy}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saveLabel}
          </Button>
        </div>
      </footer>
    </form>
  );
}

/** Heading for a group of fields inside a section. */
export function FieldGroup({ title, description, children, className }: { title: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-4", className)}>
      <legend className="mb-3 text-sm font-semibold">
        {title}
        {description && <span className="text-muted-foreground mt-0.5 block text-xs font-normal">{description}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/** Text input wired to a section field: label, hint, inline error and aria attributes. */
export function TextField({
  section,
  path,
  label,
  value,
  onChange,
  error,
  hint,
  required,
  className,
  prefix,
  suffix,
  labelAside,
  ...input
}: {
  section: string;
  path: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  /** Short text inside the input on the left, e.g. "£". */
  prefix?: string;
  /** Short text inside the input on the right, e.g. "%". */
  suffix?: string;
  labelAside?: ReactNode;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "email" | "url";
  maxLength?: number;
  spellCheck?: boolean;
}) {
  const id = fieldId(section, path);
  return (
    <FormField id={id} label={label} hint={hint} error={error} required={required} className={className} labelAside={labelAside}>
      <div className="relative">
        {prefix && (
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">{prefix}</span>
        )}
        <Input
          id={id}
          name={path}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={cn(prefix && "pl-6", suffix && "pr-8", (prefix || suffix) && "tabular-nums")}
          {...input}
          {...invalidProps(id, error)}
        />
        {suffix && (
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm">{suffix}</span>
        )}
      </div>
    </FormField>
  );
}
