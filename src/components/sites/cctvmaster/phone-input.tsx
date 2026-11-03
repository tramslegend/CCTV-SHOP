"use client";

import { Popover } from "@base-ui/react/popover";
import { getExampleNumber, parsePhoneNumberFromString } from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import { ChevronsUpDown, Search } from "lucide-react";
import { useMemo, useRef, useState, type ComponentProps } from "react";
import PhoneInputWithCountry, { getCountryCallingCode, type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { phoneCountry, toE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { useShopInfo } from "./shop-info";

// International phone field like the source's: a flag + dialling-code button that opens a searchable country list,
// next to the number, formatted as you type for the chosen country. It starts on the shop's phone country (Admin →
// Settings → Store details). The value is E.164 ("+447400123456") or "" when empty, possibly incomplete while typing:
// check it with normalisePhone() (src/lib/phone.ts) before saving.

type CountryOption = { value?: Country; label: string };

/** Matches the inputs around it: contact and trade forms (sm), enquiry dialog (md), account and checkout (lg). */
type Size = "sm" | "md" | "lg";
const HEIGHT: Record<Size, string> = { sm: "h-9", md: "h-10", lg: "h-11" };

const numberCls =
  "border-input placeholder:text-muted-foreground w-full min-w-0 rounded-md rounded-s-none border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-brand-700 focus-visible:ring-[3px] focus-visible:ring-brand-700/50 aria-[invalid=true]:border-red-600 md:text-sm";

export function PhoneInput({
  value,
  onChange,
  size = "lg",
  className,
  ...inputProps
}: Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "placeholder" | "size" | "ref"> & {
  value: string;
  onChange: (value: string) => void;
  size?: Size;
}) {
  const home = phoneCountry(useShopInfo().phoneCountry);
  const [country, setCountry] = useState<Country>(() => parsePhoneNumberFromString(value, home)?.country ?? home);
  const example = getExampleNumber(country, examples)?.formatNational();
  return (
    <PhoneInputWithCountry
      {...inputProps}
      className={cn("flex", className)}
      value={toE164(value, home)}
      onChange={(v?: string) => onChange(v ?? "")}
      onCountryChange={(c?: Country) => c && setCountry(c)}
      defaultCountry={home}
      addInternationalOption={false}
      smartCaret={false}
      placeholder={example}
      countrySelectComponent={CountrySelect}
      countrySelectProps={{ height: HEIGHT[size] }}
      inputComponent={NumberInput}
      numberInputProps={{ height: HEIGHT[size] }}
    />
  );
}

function NumberInput({ className, height, ...props }: ComponentProps<"input"> & { height: string }) {
  return <input {...props} className={cn(numberCls, height, className)} />;
}

function FlagIcon({ country }: { country?: Country }) {
  const Flag = country ? flags[country] : undefined;
  return (
    <span aria-hidden="true" className="flex h-4 w-6 shrink-0 overflow-hidden rounded-sm bg-border [&_svg]:size-full">
      {Flag ? <Flag title={country ?? ""} /> : null}
    </span>
  );
}

function CountrySelect({
  value,
  onChange,
  options,
  disabled,
  height,
}: {
  value?: Country;
  onChange: (country?: Country) => void;
  options: CountryOption[];
  disabled?: boolean;
  height: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const countries = useMemo(
    () => options.filter((o): o is { value: Country; label: string } => !!o.value).map((o) => ({ ...o, code: getCountryCallingCode(o.value) })),
    [options],
  );
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    const digits = q.replace(/^\+/, "");
    return countries.filter((c) => c.label.toLowerCase().includes(q) || c.value.toLowerCase() === q || (/^\d+$/.test(digits) && c.code.startsWith(digits)));
  }, [countries, query]);
  const current = countries.find((c) => c.value === value);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const pick = (country: Country) => {
    onChange(country);
    close();
  };

  return (
    <Popover.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <Popover.Trigger
        disabled={disabled}
        aria-label={current ? `Country: ${current.label} (+${current.code})` : "Choose country"}
        className={cn(
          "border-input flex shrink-0 items-center gap-1.5 rounded-s-md rounded-e-none border border-r-0 bg-surface px-2.5 shadow-xs outline-none hover:bg-muted focus-visible:border-brand-700 focus-visible:ring-[3px] focus-visible:ring-brand-700/50 disabled:opacity-50",
          height,
        )}
      >
        <FlagIcon country={value} />
        <span className="text-sm font-medium text-foreground/80">{current ? `+${current.code}` : "+"}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-[100]">
          <Popover.Popup initialFocus={search} className="w-[min(18rem,calc(100vw-2rem))] rounded-md border bg-white text-foreground shadow-md outline-none">
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 opacity-50" aria-hidden="true" />
              <input
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (shown[0]) pick(shown[0].value);
                  }
                }}
                placeholder="Search country..."
                aria-label="Search country"
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto p-1">
              {shown.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">No country found.</li>
              ) : (
                shown.map((c) => (
                  <li key={c.value}>
                    <button
                      type="button"
                      onClick={() => pick(c.value)}
                      aria-current={c.value === value || undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted",
                        c.value === value && "bg-muted font-medium",
                      )}
                    >
                      <FlagIcon country={c.value} />
                      <span className="flex-1 truncate">{c.label}</span>
                      <span className="text-muted-foreground">+{c.code}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
