"use client";

import type { ReactNode } from "react";
import { FormField, invalidProps } from "@/components/admin/form-field";
import { fieldId } from "@/components/admin/settings/fields";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** An on/off setting: switch, label and a line explaining what it does. */
export function SwitchField({
  section,
  path,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  section: string;
  path: string;
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = fieldId(section, path);
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5" aria-describedby={hint ? `${id}-hint` : undefined} />
      <div className="min-w-0">
        <label htmlFor={id} className={cn("text-sm font-medium", disabled && "text-muted-foreground")}>
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-muted-foreground text-xs">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/** Multi-line text wired to a section field, with a character count. */
export function TextAreaField({
  section,
  path,
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  maxLength,
  rows = 3,
  className,
}: {
  section: string;
  path: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  placeholder?: string;
  maxLength: number;
  rows?: number;
  className?: string;
}) {
  const id = fieldId(section, path);
  return (
    <FormField
      id={id}
      label={label}
      hint={hint}
      error={error}
      className={className}
      labelAside={
        <span className={cn("text-xs tabular-nums", value.length > maxLength ? "text-red-700" : "text-muted-foreground")}>
          {value.length}/{maxLength}
        </span>
      }
    >
      <Textarea id={id} name={path} value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} {...invalidProps(id, error)} />
    </FormField>
  );
}
