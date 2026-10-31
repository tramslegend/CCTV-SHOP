import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + hint/error, with the error wired to the control via `${id}-error` (use aria-describedby). */
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  className,
  labelAside,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  /** Right-aligned extra next to the label (character count, action link…). */
  labelAside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && (
            <span className="text-red-600" aria-hidden="true">
              *
            </span>
          )}
        </Label>
        {labelAside}
      </div>
      {children}
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

/** Error (or hint) under a control. */
export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: ReactNode }) {
  if (error)
    return (
      <p id={`${id}-error`} className="text-xs leading-snug text-red-700">
        {error}
      </p>
    );
  if (hint) return <p className="text-muted-foreground text-xs leading-snug">{hint}</p>;
  return null;
}

/** Props that mark a control invalid and point it at its error message. */
export const invalidProps = (id: string, error?: string) =>
  error ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};

/** Character counter that turns amber past the recommended length and red past the maximum. */
export function CharCount({ value, recommended, max }: { value: string; recommended: number; max?: number }) {
  const n = value.length;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        max && n > max ? "text-red-700" : n > recommended ? "text-amber-700" : "text-muted-foreground",
      )}
    >
      {n}/{recommended}
    </span>
  );
}
