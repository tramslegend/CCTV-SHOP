"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectOption<V extends string> {
  value: V;
  label: string;
}

/** The shadcn Select for a plain list of string options (shows the option's label in the trigger). */
export function SimpleSelect<V extends string>({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  className,
  size,
  invalid,
  describedBy,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: V;
  onValueChange: (value: V) => void;
  options: readonly SelectOption<V>[];
  placeholder?: string;
  className?: string;
  size?: "sm" | "default";
  invalid?: boolean;
  describedBy?: string;
  "aria-label"?: string;
}) {
  return (
    <Select<V> items={options} value={value} onValueChange={(v) => v !== null && onValueChange(v)}>
      <SelectTrigger
        id={id}
        size={size}
        className={cn("w-full", className)}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
