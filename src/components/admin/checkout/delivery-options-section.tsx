"use client";

import { ArrowDown, ArrowUp, MapPinOff, Plus, Store, Trash2, Truck } from "lucide-react";
import { saveDeliveryOptions } from "@/app/admin/(panel)/checkout/actions";
import { move } from "@/components/admin/products/utils";
import { SettingsSection, TextField } from "@/components/admin/settings/fields";
import { useSectionForm } from "@/components/admin/settings/use-section-form";
import { SimpleSelect } from "@/components/admin/simple-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatGBP } from "@/lib/cctvmaster/money";
import { parseAreas, REMOTE_UK_AREAS, type DeliveryKind } from "@/lib/checkout/settings";
import type { DeliveryOptionsFormValues, DeliveryOptionValues } from "@/lib/checkout/validation";
import { cn } from "@/lib/utils";
import { SwitchField, TextAreaField } from "./fields";

const S = "delivery";
const KINDS = [
  { value: "delivery", label: "Delivery to the customer" },
  { value: "collect", label: "Click & collect" },
] as const;

const amountOf = (v: string) => {
  const n = Number(v.replace(/[£,\s]/g, ""));
  return v.trim() && Number.isFinite(n) && n >= 0 ? n : null;
};

/** What a customer sees for this option at checkout, worked out from the form as typed. */
function preview(o: DeliveryOptionValues, collectFrom: string) {
  const price = amountOf(o.price);
  const free = amountOf(o.freeFrom);
  const parts = [
    o.name.trim() || "(no name yet)",
    price === null ? null : price === 0 || free === 0 ? "Free" : formatGBP(price),
    price && free ? `free from ${formatGBP(free)}` : null,
    o.estimate.trim() || null,
    o.kind === "collect" ? `collect from ${collectFrom || "your shop (add the address in Settings)"}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

let nextKey = 0;
const blankOption = (kind: DeliveryKind): DeliveryOptionValues => ({
  key: `new-${Date.now()}-${nextKey++}`,
  id: "",
  name: kind === "collect" ? "Click & collect" : "",
  kind,
  price: kind === "collect" ? "0.00" : "",
  freeFrom: "",
  estimate: kind === "collect" ? "Ready to collect the next working day" : "",
  excludedAreas: "",
  enabled: true,
});

export function DeliveryOptionsSection({
  initial,
  collectFrom,
  onDirtyChange,
}: {
  initial: DeliveryOptionsFormValues;
  collectFrom: string;
  onDirtyChange: (section: string, dirty: boolean) => void;
}) {
  const form = useSectionForm({ section: S, initial, save: saveDeliveryOptions, onDirtyChange });
  const { values, errors } = form;
  const options = values.options;

  const setOption = (i: number, patch: Partial<DeliveryOptionValues>) =>
    form.update(
      (prev) => ({ options: prev.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }),
      ...Object.keys(patch).map((k) => `options.${i}.${k}`),
    );
  const setOptions = (next: DeliveryOptionValues[]) => form.update(() => ({ options: next }), "options");

  return (
    <SettingsSection
      id={S}
      title="Delivery options"
      description="What customers can choose at checkout. Prices include VAT. Standard delivery comes first and is the price shown in the delivery messages across the shop."
      saveLabel="Save delivery options"
      dirty={form.dirty}
      saving={form.saving}
      onSave={form.submit}
      onDiscard={form.discard}
    >
      {errors.options && <p className="text-sm text-red-700">{errors.options}</p>}
      <ol className="flex flex-col gap-4">
        {options.map((o, i) => {
          const standard = i === 0;
          const areas = parseAreas(o.excludedAreas).areas;
          return (
            <li key={o.key} className={cn("rounded-lg border p-4", !o.enabled && "bg-zinc-50")}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {o.kind === "collect" ? (
                    <Store className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Truck className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  )}
                  <p className="truncate font-medium">{o.name.trim() || "New delivery option"}</p>
                  {standard && <Badge variant="secondary">Standard</Badge>}
                  {!o.enabled && <Badge variant="outline">Off</Badge>}
                </div>
                {!standard && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${o.name || "option"} up`}
                      disabled={i <= 1}
                      onClick={() => setOptions(move(options, i, i - 1))}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${o.name || "option"} down`}
                      disabled={i === options.length - 1}
                      onClick={() => setOptions(move(options, i, i + 1))}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${o.name || "option"}`}
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  section={S}
                  path={`options.${i}.name`}
                  label="Name customers see"
                  value={o.name}
                  onChange={(name) => setOption(i, { name })}
                  error={errors[`options.${i}.name`]}
                  placeholder={o.kind === "collect" ? "Click & collect (Leeds store)" : "Next working day · DPD"}
                  maxLength={80}
                />
                {standard ? (
                  <div className="text-muted-foreground flex items-end pb-2 text-xs">Standard delivery always goes to the customer and can&apos;t be turned off.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Type</span>
                    <SimpleSelect
                      aria-label="Type"
                      value={o.kind}
                      onValueChange={(kind) => setOption(i, { kind })}
                      options={KINDS}
                    />
                  </div>
                )}
                <TextField
                  section={S}
                  path={`options.${i}.price`}
                  label="Price"
                  prefix="£"
                  inputMode="decimal"
                  autoComplete="off"
                  value={o.price}
                  onChange={(price) => setOption(i, { price })}
                  error={errors[`options.${i}.price`]}
                  placeholder="4.99"
                  hint="0 for free."
                />
                <TextField
                  section={S}
                  path={`options.${i}.freeFrom`}
                  label="Free when the items come to"
                  prefix="£"
                  inputMode="decimal"
                  autoComplete="off"
                  value={o.freeFrom}
                  onChange={(freeFrom) => setOption(i, { freeFrom })}
                  error={errors[`options.${i}.freeFrom`]}
                  placeholder={standard ? "100.00" : "Leave empty: never free"}
                  hint={standard ? "Required. 0 makes standard delivery free on every order." : "Leave empty if this option is never free."}
                />
                <TextField
                  section={S}
                  path={`options.${i}.estimate`}
                  label={o.kind === "collect" ? "When it's ready" : "Delivery time"}
                  value={o.estimate}
                  onChange={(estimate) => setOption(i, { estimate })}
                  error={errors[`options.${i}.estimate`]}
                  placeholder={o.kind === "collect" ? "Ready to collect the next working day" : "1–2 working days"}
                  hint={standard ? "Leave empty to show the dispatch cut-off from Settings → Delivery." : undefined}
                  maxLength={80}
                />
                {!standard && (
                  <div className="flex items-end pb-1.5">
                    <SwitchField
                      section={S}
                      path={`options.${i}.enabled`}
                      label="Offer at checkout"
                      checked={o.enabled}
                      onChange={(enabled) => setOption(i, { enabled })}
                    />
                  </div>
                )}
                {o.kind === "delivery" && (
                  <TextAreaField
                    section={S}
                    path={`options.${i}.excludedAreas`}
                    className="sm:col-span-2"
                    label="Postcode areas it doesn't go to"
                    value={o.excludedAreas}
                    onChange={(excludedAreas) => setOption(i, { excludedAreas })}
                    error={errors[`options.${i}.excludedAreas`]}
                    maxLength={2000}
                    rows={2}
                    placeholder="e.g. BT, IM, GY, JE, HS, IV1-28, PA20-49"
                    hint={
                      <>
                        Separate with commas: whole areas (BT), districts (IV1) or ranges (PA20-49). Customers there won&apos;t see this
                        option.{" "}
                        <button
                          type="button"
                          className="font-medium text-zinc-900 underline underline-offset-2 hover:no-underline"
                          onClick={() =>
                            setOption(i, { excludedAreas: parseAreas([o.excludedAreas, REMOTE_UK_AREAS].filter(Boolean).join(", ")).areas.join(", ") })
                          }
                        >
                          Add typical remote UK areas
                        </button>{" "}
                        (Highlands &amp; islands, Northern Ireland, Channel Islands…; check with your courier).
                      </>
                    }
                  />
                )}
              </div>

              <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-xs" aria-live="polite">
                <span className="text-muted-foreground">Customers see: </span>
                {preview(o, collectFrom)}
                {o.kind === "delivery" && areas.length > 0 && (
                  <span className="text-muted-foreground ml-1 inline-flex items-center gap-1">
                    <MapPinOff className="size-3" aria-hidden="true" /> not offered in {areas.length} {areas.length === 1 ? "area" : "areas"}
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, blankOption("delivery")])} disabled={options.length >= 12}>
          <Plus /> Add delivery option
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, blankOption("collect")])} disabled={options.length >= 12}>
          <Store /> Add click &amp; collect
        </Button>
      </div>
    </SettingsSection>
  );
}
