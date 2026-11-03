"use client";

import { Search } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { UK_POSTCODE_RE, formatPostcode } from "./validation";
import { linkButton } from "./styles";

export interface AddressValue {
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
}
export type AddressErrors = Partial<Record<"line1" | "city" | "postcode", string>>;
export type AddressMode = "find" | "manual";

export const emptyAddress: AddressValue = { line1: "", line2: "", city: "", county: "", postcode: "" };

/** Same rules and messages as the source's guest checkout. */
export function validateAddress(a: AddressValue, billing = false): AddressErrors {
  const errors: AddressErrors = {};
  if (!a.line1.trim()) errors.line1 = billing ? "Billing address line 1 is required." : "Address line 1 is required.";
  if (!a.city.trim()) errors.city = billing ? "Billing town or city is required." : "City is required.";
  if (!a.postcode.trim()) errors.postcode = billing ? "Billing postcode is required." : "Postcode is required.";
  else if (!UK_POSTCODE_RE.test(a.postcode.trim())) errors.postcode = "Enter a valid UK postcode (e.g. SW1A 1AA).";
  return errors;
}

const shadcnLabel = "flex items-center gap-1 text-sm leading-none font-medium select-none";
const shadcnInput =
  "placeholder:text-muted-foreground border-input h-11 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-brand-700 focus-visible:ring-[3px] focus-visible:ring-brand-700/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-base";

function Field({
  id,
  label,
  required,
  value,
  onChange,
  placeholder,
  autoComplete,
  maxLength,
  error,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  error?: string;
  className?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={shadcnLabel}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(shadcnInput, className)}
      />
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The source's address block: a postcode finder with "Enter the address myself", or the manual fields.
 * The clone has no address-lookup service, so a full postcode in the finder opens the manual form with it filled in.
 */
export function AddressFields({
  idPrefix,
  value,
  onChange,
  errors,
  mode,
  onModeChange,
}: {
  idPrefix: string;
  value: AddressValue;
  onChange: (patch: Partial<AddressValue>) => void;
  errors: AddressErrors;
  mode: AddressMode;
  onModeChange: (mode: AddressMode) => void;
}) {
  const [query, setQuery] = useState("");

  const focusLater = (id: string) => window.setTimeout(() => document.getElementById(id)?.focus(), 0);
  const toManual = (postcode?: string) => {
    if (postcode) onChange({ postcode });
    onModeChange("manual");
    focusLater(`${idPrefix}-line1`);
  };

  if (mode === "find") {
    const candidate = UK_POSTCODE_RE.test(query.trim()) ? formatPostcode(query.trim()) : null;
    const findError = errors.line1 || errors.city || errors.postcode ? "Enter the address: find it above, or type it in yourself." : null;
    const status = candidate
      ? "1 postcode found"
      : query.trim().length >= 2
        ? "Keep typing the full postcode, or enter the address yourself."
        : "";
    return (
      <div className="checkout-address space-y-3">
        <div className="checkout-address-find space-y-1.5">
          <label htmlFor={`${idPrefix}-find`} className="block text-sm font-semibold">
            Find your address
          </label>
          <p id={`${idPrefix}-find-hint`} className="text-muted-foreground text-sm">
            Start typing your postcode or first line
          </p>
          <div className="relative">
            <div className="relative">
              <span
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
                aria-hidden="true"
              >
                <Search className="h-5 w-5" />
              </span>
              <input
                id={`${idPrefix}-find`}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={!!candidate}
                aria-controls={`${idPrefix}-find-list`}
                aria-describedby={`${idPrefix}-find-hint ${idPrefix}-find-status${findError ? ` ${idPrefix}-find-error` : ""}`}
                aria-invalid={findError ? true : undefined}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="search"
                placeholder="e.g. SW1A 2AA"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (candidate) toManual(candidate);
                  }
                }}
                className="border-foreground/40 bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/15 aria-[invalid=true]:border-destructive h-12 w-full rounded-lg border-2 pr-20 pl-11 text-base font-medium shadow-sm transition-colors outline-none placeholder:font-normal focus:ring-4"
              />
            </div>
            <span id={`${idPrefix}-find-status`} className={cn("mt-1.5 block text-sm", status ? "text-muted-foreground" : "sr-only")} aria-live="polite">
              {status}
            </span>
            <ul
              id={`${idPrefix}-find-list`}
              role="listbox"
              hidden={!candidate}
              className="mt-1 overflow-hidden rounded-lg border border-border bg-white shadow-sm"
            >
              {candidate && (
                <li
                  role="option"
                  aria-selected="true"
                  tabIndex={-1}
                  onClick={() => toManual(candidate)}
                  className="cursor-pointer px-4 py-3 text-sm hover:bg-surface"
                >
                  <span className="font-semibold">{candidate}</span>
                  <span className="text-muted-foreground"> — enter the house number and street</span>
                </li>
              )}
            </ul>
          </div>
          {findError && (
            <p id={`${idPrefix}-find-error`} className="text-destructive text-sm">
              {findError}
            </p>
          )}
          <button type="button" onClick={() => toManual()} className={linkButton}>
            Enter the address myself
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-address space-y-3">
      <div className="checkout-address-manual space-y-3">
        <Field
          id={`${idPrefix}-line1`}
          label="Address line 1"
          required
          value={value.line1}
          onChange={(line1) => onChange({ line1 })}
          placeholder="House number and street"
          autoComplete="address-line1"
          error={errors.line1}
        />
        <Field
          id={`${idPrefix}-line2`}
          label="Address line 2"
          value={value.line2}
          onChange={(line2) => onChange({ line2 })}
          placeholder="Flat, unit or building (optional)"
          autoComplete="address-line2"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            id={`${idPrefix}-city`}
            label="Town or city"
            required
            value={value.city}
            onChange={(city) => onChange({ city })}
            autoComplete="address-level2"
            error={errors.city}
          />
          <Field
            id={`${idPrefix}-county`}
            label="County"
            value={value.county}
            onChange={(county) => onChange({ county })}
            placeholder="Optional"
            autoComplete="address-level1"
          />
        </div>
        <Field
          id={`${idPrefix}-postcode`}
          label="Postcode"
          required
          value={value.postcode}
          onChange={(postcode) => onChange({ postcode: formatPostcode(postcode) })}
          placeholder="e.g. SW1A 1AA"
          autoComplete="postal-code"
          maxLength={8}
          error={errors.postcode}
          className="font-mono tracking-wider uppercase sm:max-w-[12rem]"
        />
        <button
          type="button"
          onClick={() => {
            setQuery(value.postcode);
            onModeChange("find");
          }}
          className={linkButton}
        >
          Find the address by postcode instead
        </button>
      </div>
    </div>
  );
}
