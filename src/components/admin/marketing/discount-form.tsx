"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { ArrowLeft, Dices, Loader2, Percent, PoundSterling, Save, Truck } from "lucide-react";
import { createDiscountCode, updateDiscountCode } from "@/app/admin/(panel)/marketing/actions";
import { FormField, invalidProps } from "@/components/admin/form-field";
import { AdminToaster, toast } from "@/components/admin/toast";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { describeDiscount, DISCOUNT_TYPE_LABEL, type DiscountType, generateCode, normaliseCode } from "@/lib/discounts/rules";
import type { DiscountFormValues } from "@/lib/discounts/validation";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { value: DiscountType; hint: string; Icon: typeof Percent }[] = [
  { value: "percent", hint: "e.g. 10% off the items", Icon: Percent },
  { value: "fixed", hint: "e.g. £5 off the items (inc. VAT)", Icon: PoundSterling },
  { value: "free_delivery", hint: "The delivery charge is waived", Icon: Truck },
];

function focusFirstError() {
  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>("#discount-form [aria-invalid='true']");
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  });
}

/** What the customer gets, in a sentence (live preview). */
function previewText(v: DiscountFormValues) {
  const n = Number(v.value.replace(/[£,%\s]/g, ""));
  const min = Number(v.minSpend.replace(/[£,\s]/g, ""));
  const what =
    v.type === "free_delivery"
      ? "Free delivery"
      : Number.isFinite(n) && n > 0
        ? `${describeDiscount({ type: v.type, value: n })} the items`
        : DISCOUNT_TYPE_LABEL[v.type];
  const parts = [what];
  if (Number.isFinite(min) && min > 0) parts.push(`when the items come to £${min.toFixed(2)} or more`);
  if (v.oncePerCustomer) parts.push("once per customer");
  return parts.join(", ");
}

export function DiscountForm({
  mode,
  id,
  initialValues,
  used = false,
  uses = 0,
  header,
}: {
  mode: "create" | "edit";
  id?: number;
  initialValues: DiscountFormValues;
  /** The code has been used on orders: its text can't change any more. */
  used?: boolean;
  uses?: number;
  /** Status badge and actions shown next to the title (edit). */
  header?: ReactNode;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialValues));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const dirty = JSON.stringify(values) !== baseline;
  useUnsavedChanges(dirty && !saving);

  const set = <K extends keyof DiscountFormValues>(key: K, value: DiscountFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };
  const field = (key: keyof DiscountFormValues) => ({ id: `dc-${key}`, error: errors[key] });

  const save = () => {
    if (saving) return;
    const payload = values;
    startSaving(async () => {
      try {
        const result = mode === "edit" && id ? await updateDiscountCode(id, payload) : await createDiscountCode(payload);
        if (result.ok) {
          setErrors({});
          setBaseline(JSON.stringify(payload));
          toast.success(result.message);
          if (mode === "create") router.push(`/admin/marketing/${result.id}`);
          else router.refresh();
        } else {
          setErrors(result.fieldErrors ?? {});
          toast.error(result.message);
          focusFirstError();
        }
      } catch {
        toast.error("The code couldn’t be saved. Check your connection and try again.");
      }
    });
  };

  const generate = () => {
    const prefix = normaliseCode(values.code).split("-")[0].replace(/[^A-Z]/g, "").slice(0, 12);
    set("code", generateCode(prefix));
  };

  const heading = mode === "create" ? "New discount code" : normaliseCode(JSON.parse(baseline).code as string) || "Discount code";

  return (
    <div
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          save();
        }
      }}
    >
      <AdminToaster />
      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b bg-zinc-50/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/marketing" className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Back to discount codes">
            <ArrowLeft />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-mono text-xl font-semibold tracking-tight">{heading}</h1>
              {header}
            </div>
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {saving ? "Saving…" : dirty ? "Unsaved changes" : mode === "edit" ? "All changes saved" : "Not saved yet"}
            </p>
          </div>
          <Button type="button" onClick={save} disabled={saving || (mode === "edit" && !dirty)}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} {mode === "create" ? "Create code" : "Save"}
          </Button>
        </div>
      </div>

      <form
        id="discount-form"
        noValidate
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Code</CardTitle>
              <CardDescription>What customers type at checkout. Not case-sensitive: it is stored in capitals.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                {...field("code")}
                label="Discount code"
                required
                hint={used ? "This code has been used on orders, so it can’t be renamed." : "3–32 letters and numbers; dashes and underscores are fine."}
              >
                <div className="flex gap-2">
                  <Input
                    id="dc-code"
                    value={values.code}
                    onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    maxLength={32}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="e.g. SPRING10"
                    readOnly={used}
                    className="font-mono uppercase"
                    {...invalidProps("dc-code", errors.code)}
                  />
                  {!used && (
                    <Button type="button" variant="outline" onClick={generate}>
                      <Dices /> Generate
                    </Button>
                  )}
                </div>
              </FormField>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">What it gives</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {TYPE_OPTIONS.map(({ value, hint, Icon }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-white p-3 text-sm transition-colors",
                        values.type === value ? "border-zinc-900 ring-1 ring-zinc-900" : "hover:bg-zinc-50",
                      )}
                    >
                      <input
                        type="radio"
                        name="discount-type"
                        value={value}
                        checked={values.type === value}
                        onChange={() => set("type", value)}
                        className="mt-0.5 accent-zinc-900"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Icon className="size-3.5" aria-hidden="true" /> {DISCOUNT_TYPE_LABEL[value]}
                        </span>
                        <span className="text-muted-foreground block text-xs">{hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {values.type !== "free_delivery" && (
                <FormField
                  {...field("value")}
                  label={values.type === "percent" ? "Percentage off" : "Amount off (£, inc. VAT)"}
                  required
                  hint={
                    values.type === "percent"
                      ? "Taken off the items total (inc. VAT). Delivery isn’t discounted."
                      : "Taken off the items total (inc. VAT), never more than the items cost. Delivery isn’t discounted."
                  }
                >
                  <div className="relative w-48">
                    {values.type === "fixed" && (
                      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">£</span>
                    )}
                    <Input
                      id="dc-value"
                      inputMode="decimal"
                      value={values.value}
                      onChange={(e) => set("value", e.target.value)}
                      placeholder={values.type === "percent" ? "10" : "5.00"}
                      className={cn("tabular-nums", values.type === "fixed" ? "pl-6" : "pr-7")}
                      {...invalidProps("dc-value", errors.value)}
                    />
                    {values.type === "percent" && (
                      <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm">%</span>
                    )}
                  </div>
                </FormField>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
              <CardDescription>Leave any of these empty for no limit.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField {...field("minSpend")} label="Minimum spend (£, inc. VAT)" hint="The items total inc. VAT, before the discount and delivery.">
                <div className="relative w-48">
                  <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">£</span>
                  <Input
                    id="dc-minSpend"
                    inputMode="decimal"
                    value={values.minSpend}
                    onChange={(e) => set("minSpend", e.target.value)}
                    placeholder="No minimum"
                    className="pl-6 tabular-nums"
                    {...invalidProps("dc-minSpend", errors.minSpend)}
                  />
                </div>
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField {...field("startsOn")} label="Valid from" hint="From the start of this day, UK time.">
                  <Input
                    id="dc-startsOn"
                    type="date"
                    value={values.startsOn}
                    onChange={(e) => set("startsOn", e.target.value)}
                    {...invalidProps("dc-startsOn", errors.startsOn)}
                  />
                </FormField>
                <FormField {...field("endsOn")} label="Valid until" hint="Until the end of this day, UK time.">
                  <Input
                    id="dc-endsOn"
                    type="date"
                    value={values.endsOn}
                    min={values.startsOn || undefined}
                    onChange={(e) => set("endsOn", e.target.value)}
                    {...invalidProps("dc-endsOn", errors.endsOn)}
                  />
                </FormField>
              </div>
              <FormField
                {...field("maxUses")}
                label="Maximum uses in total"
                hint={`Counted when an order is paid (unpaid or cancelled checkouts don’t count).${mode === "edit" ? ` Used ${uses} ${uses === 1 ? "time" : "times"} so far.` : ""}`}
              >
                <Input
                  id="dc-maxUses"
                  inputMode="numeric"
                  value={values.maxUses}
                  onChange={(e) => set("maxUses", e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Unlimited"
                  className="w-48 tabular-nums"
                  {...invalidProps("dc-maxUses", errors.maxUses)}
                />
              </FormField>
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="dc-oncePerCustomer"
                  checked={values.oncePerCustomer}
                  onCheckedChange={(checked) => set("oncePerCustomer", checked === true)}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="dc-oncePerCustomer">One use per customer</Label>
                  <p className="text-muted-foreground text-xs">Each email address can use the code on one paid order.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="dc-active">Active</Label>
                  <p className="text-muted-foreground text-xs">Switched off, customers can’t use the code.</p>
                </div>
                <Switch id="dc-active" checked={values.active} onCheckedChange={(checked) => set("active", checked)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Customers get</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm" data-testid="discount-preview">
                {previewText(values)}.
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                One code per order. Quote-only products can’t be bought online, so they’re never discounted. The VAT invoice shows the discount
                as its own line.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
