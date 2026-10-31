"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { saveDeliverySettings } from "@/app/admin/(panel)/settings/actions";
import { FormField } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { formatGBP, VAT_RATE, withVat } from "@/lib/cctvmaster/money";
import { cutoffLabel, transitLabel, vatPercent } from "@/lib/settings/format";
import type { DeliveryFormValues } from "@/lib/settings/validation";
import { FieldGroup, SettingsSection, TextField } from "./fields";
import { useSectionForm } from "./use-section-form";

const S = "delivery";

/** Parses a typed amount ("£5.99", "150") for the live previews; null when it isn't a number yet. */
const amountOf = (v: string) => {
  const n = Number(v.replace(/[£,\s%]/g, ""));
  return v.trim() && Number.isFinite(n) && n >= 0 ? n : null;
};

export function DeliverySection({ initial, onDirtyChange }: { initial: DeliveryFormValues; onDirtyChange: (section: string, dirty: boolean) => void }) {
  const form = useSectionForm({ section: S, initial, save: saveDeliverySettings, onDirtyChange });
  const { values: v, errors } = form;
  const set = (key: keyof DeliveryFormValues) => (value: string) => form.update((prev) => ({ ...prev, [key]: value }), key);

  const fee = amountOf(v.fee);
  const freeFrom = amountOf(v.freeFrom);
  const min = Number(v.transitMin);
  const max = Number(v.transitMax);
  const transit = Number.isInteger(min) && Number.isInteger(max) && min <= max ? transitLabel([min, max]) : null;
  const cutoff = /^\d{1,2}:\d{2}$/.test(v.cutoff) ? cutoffLabel(v.cutoff) : null;
  const exampleNet = 100;
  const exampleGross = withVat(exampleNet);

  return (
    <SettingsSection
      id={S}
      title="Delivery & VAT"
      description="Dispatch cut-off, delivery days and VAT, used in the delivery messages on product, basket and help pages. Delivery prices and options are set in Checkout."
      saveLabel="Save delivery"
      dirty={form.dirty}
      saving={form.saving}
      onSave={form.submit}
      onDiscard={form.discard}
    >
      <FieldGroup title="UK delivery" description="Dispatch times shown around the shop. Amounts include VAT.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
          <p>
            <span className="text-muted-foreground">Standard delivery:</span>{" "}
            <strong className="tabular-nums">
              {fee === null ? "—" : fee === 0 || freeFrom === 0 ? "free on every order" : `${formatGBP(fee)}, free from ${formatGBP(freeFrom ?? 0)}`}
            </strong>
          </p>
          <Link href="/admin/checkout#delivery" className="font-medium underline underline-offset-4 hover:no-underline">
            Change prices and delivery options in Checkout
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            section={S}
            path="cutoff"
            label="Same-day dispatch cut-off"
            type="time"
            value={v.cutoff}
            onChange={set("cutoff")}
            error={errors.cutoff}
            hint={`In-stock orders paid before this time on a weekday leave the same day${cutoff ? ` (shown as “Order before ${cutoff}”)` : ""}.`}
            className="sm:max-w-56"
          />
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-3">
              <TextField
                section={S}
                path="transitMin"
                label="Days in transit: quickest"
                inputMode="numeric"
                autoComplete="off"
                value={v.transitMin}
                onChange={set("transitMin")}
                error={errors.transitMin}
              />
              <TextField
                section={S}
                path="transitMax"
                label="Longest"
                inputMode="numeric"
                autoComplete="off"
                value={v.transitMax}
                onChange={set("transitMax")}
                error={errors.transitMax}
              />
            </div>
            <p className="text-muted-foreground text-xs">Working days after dispatch{transit ? `: ${transit}` : ""}.</p>
          </div>
        </div>
        <div className="rounded-lg border bg-zinc-50 px-4 py-3 text-sm" aria-live="polite">
          <p className="text-muted-foreground mb-1 text-xs font-medium">What customers see</p>
          {fee === null || freeFrom === null ? (
            <p className="text-muted-foreground">Enter the charge and threshold to preview the delivery message.</p>
          ) : fee === 0 || freeFrom === 0 ? (
            <p>
              <strong>Free UK delivery</strong> on every order.
            </p>
          ) : (
            <p>
              <strong>UK delivery {formatGBP(fee)}</strong> · Free when you spend {formatGBP(freeFrom)} or more (inc. VAT)
              {cutoff ? ` · Order before ${cutoff} on a weekday for same-day dispatch` : ""}
              {transit ? ` · Arrives ${transit} after dispatch` : ""}
            </p>
          )}
        </div>
      </FieldGroup>

      <FieldGroup title="VAT">
        <FormField
          id="delivery-vatRate"
          label="VAT rate"
          className="sm:max-w-40"
          hint="Prices across the shop are calculated at 20% UK VAT. Catalogue prices are entered ex VAT."
        >
          <div className="relative">
            <Input id="delivery-vatRate" value={`${vatPercent(VAT_RATE)}`} readOnly aria-readonly="true" className="bg-zinc-50 pr-12 tabular-nums" />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1 text-sm">
              % <Lock className="size-3" aria-hidden="true" />
            </span>
          </div>
        </FormField>
        <p className="text-sm">
          Worked example: <strong className="tabular-nums">{formatGBP(exampleNet)} ex VAT</strong> →{" "}
          <strong className="tabular-nums">{formatGBP(exampleGross)} inc VAT</strong>{" "}
          <span className="text-muted-foreground">(VAT {formatGBP(Math.round((exampleGross - exampleNet) * 100) / 100)})</span>
        </p>
      </FieldGroup>
    </SettingsSection>
  );
}
