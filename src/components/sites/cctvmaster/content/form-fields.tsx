import { ChevronDown } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// shadcn-style form controls with the source's exact utility classes (label, input, select trigger, textarea).

const labelCls = "flex items-center gap-2 text-sm leading-none font-medium select-none";

const inputCls =
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive mt-1.5";

const textareaCls =
  "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm mt-1.5";

const selectCls =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex h-9 w-full appearance-none items-center rounded-md border bg-transparent py-2 pr-9 pl-3 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({ id, label, error, hint, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label className={labelCls} htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-destructive mt-1.5 text-sm" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

type WithError = { invalid?: boolean; describedBy?: string };

export function TextInput({ invalid, describedBy, className, ...props }: InputHTMLAttributes<HTMLInputElement> & WithError) {
  return (
    <input
      data-slot="input"
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? describedBy : undefined}
      className={cn(inputCls, className)}
      {...props}
    />
  );
}

export function TextArea({
  invalid,
  describedBy,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & WithError) {
  return (
    <textarea
      data-slot="textarea"
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? describedBy : undefined}
      className={cn(textareaCls, className)}
      {...props}
    />
  );
}

/** Native select styled like the source's Radix select trigger (fit-content width, chevron on the right). */
export function SelectInput({
  invalid,
  describedBy,
  className,
  wrapperClassName,
  placeholderShown,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & WithError & { wrapperClassName?: string; placeholderShown?: boolean }) {
  return (
    <div className={cn("relative mt-1.5 w-fit", wrapperClassName)}>
      <select
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? describedBy : undefined}
        className={cn(selectCls, placeholderShown && "text-muted-foreground", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-50"
        aria-hidden="true"
      />
    </div>
  );
}

// Shared with the enquiry server actions so both sides apply the same rules.
export { isEmail, isPhone } from "@/lib/enquiries/rules";
