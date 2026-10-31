"use client";

import { ArrowDown, ArrowUp, Link2, Trash2 } from "lucide-react";
import { FormField, invalidProps } from "@/components/admin/form-field";
import { SearchPicker } from "@/components/admin/search-picker";
import { SimpleSelect } from "@/components/admin/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatGBP, withVat } from "@/lib/cctvmaster/money";
import { ProductThumb } from "./product-thumb";
import { PickRow } from "./related-editor";
import {
  type ComponentValue,
  type FieldErrors,
  KIT_ROLES,
  KIT_SYSTEMS,
  type KitRole,
  type KitValues,
  type ProductPick,
  ROLE_LABELS,
  SYSTEM_LABELS,
} from "./types";
import { move, newKey, parseAmount, searchProductPicks } from "./utils";

const ROLE_OPTIONS = KIT_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
const SYSTEM_OPTIONS = KIT_SYSTEMS.map((s) => ({ value: s, label: SYSTEM_LABELS[s] }));

/** Best guess at a component's role from its name; the owner can change it. */
function guessRole(name: string): KitRole {
  if (/\b(nvr|dvr|xvr|recorder)\b/i.test(name)) return "recorder";
  if (/\b(hdd|ssd|hard (drive|disk)|surveillance drive|\d+tb)\b/i.test(name)) return "storage";
  if (/\b(power supply|psu|adapter|poe injector)\b/i.test(name)) return "psu";
  if (/\b(cable|cat ?5e?|cat ?6|coax|rg59|lead|patch)\b/i.test(name)) return "cable";
  if (/\b(camera|turret|bullet|dome|ptz|eyeball)\b/i.test(name)) return "camera";
  return "accessory";
}

const STORAGE_TOKEN = /^(?:(\d{1,2})X)?(\d+(?:\.\d+)?)(TB|GB)$/;
function capacityFromToken(token: string): string | null {
  const m = STORAGE_TOKEN.exec(token.trim().toUpperCase());
  if (!m) return null;
  const tb = ((m[1] ? Number(m[1]) : 1) * Number(m[2])) / (m[3] === "GB" ? 1000 : 1);
  return String(Math.round(tb * 1000) / 1000);
}

type UpdateParts = (fn: (prev: ComponentValue[]) => ComponentValue[]) => void;

export function KitFields({ kit, onChange, errors }: { kit: KitValues; onChange: (patch: Partial<KitValues>) => void; errors: FieldErrors }) {
  const field = (key: keyof KitValues) => ({ id: `pf-kit-${key}`, error: errors[`kit.${key}`] });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <FormField {...field("systemType")} label="System type" required>
        <SimpleSelect
          id="pf-kit-systemType"
          value={kit.systemType}
          options={SYSTEM_OPTIONS}
          onValueChange={(systemType) => onChange({ systemType })}
          invalid={!!errors["kit.systemType"]}
        />
      </FormField>
      <FormField {...field("channelCount")} label="Recorder channels" required>
        <Input
          id="pf-kit-channelCount"
          inputMode="numeric"
          value={kit.channelCount}
          onChange={(e) => onChange({ channelCount: e.target.value })}
          {...invalidProps("pf-kit-channelCount", errors["kit.channelCount"])}
        />
      </FormField>
      <FormField {...field("cameraCount")} label="Cameras included" required>
        <Input
          id="pf-kit-cameraCount"
          inputMode="numeric"
          value={kit.cameraCount}
          onChange={(e) => onChange({ cameraCount: e.target.value })}
          {...invalidProps("pf-kit-cameraCount", errors["kit.cameraCount"])}
        />
      </FormField>
      <FormField {...field("resolutionMp")} label="Camera resolution (MP)" hint="Used by the kit range filters.">
        <Input
          id="pf-kit-resolutionMp"
          inputMode="decimal"
          value={kit.resolutionMp}
          onChange={(e) => onChange({ resolutionMp: e.target.value })}
          {...invalidProps("pf-kit-resolutionMp", errors["kit.resolutionMp"])}
        />
      </FormField>
      <FormField {...field("storageToken")} label="Storage" hint="Drive size, e.g. 4TB, or drives × size, e.g. 2X8TB.">
        <Input
          id="pf-kit-storageToken"
          value={kit.storageToken}
          maxLength={20}
          onChange={(e) => {
            const storageToken = e.target.value.toUpperCase();
            const derived = capacityFromToken(storageToken);
            const previous = capacityFromToken(kit.storageToken);
            // Keep the capacity in step with the token unless it was set by hand.
            const follow = !kit.storageCapacityTb || kit.storageCapacityTb === previous;
            onChange({ storageToken, ...(follow && derived ? { storageCapacityTb: derived } : {}) });
          }}
          {...invalidProps("pf-kit-storageToken", errors["kit.storageToken"])}
        />
      </FormField>
      <FormField {...field("storageCapacityTb")} label="Total capacity (TB)" hint="Used to estimate recording days.">
        <Input
          id="pf-kit-storageCapacityTb"
          inputMode="decimal"
          value={kit.storageCapacityTb}
          onChange={(e) => onChange({ storageCapacityTb: e.target.value })}
          {...invalidProps("pf-kit-storageCapacityTb", errors["kit.storageCapacityTb"])}
        />
      </FormField>
    </div>
  );
}

/** What's in the box: linked products with role and quantity, in display order. */
export function KitComponentsEditor({
  parts,
  onChange,
  errors,
  kitPrice,
  cameraCount,
}: {
  parts: ComponentValue[];
  onChange: UpdateParts;
  errors: FieldErrors;
  kitPrice: string;
  cameraCount: string;
}) {
  const update = (key: string, patch: Partial<ComponentValue>) => onChange((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const linked = new Set(parts.map((p) => p.componentId).filter(Boolean));

  const cameras = parts.filter((p) => p.role === "camera").reduce((n, p) => n + (Number(p.qty) || 0), 0);
  const priced = parts.filter((p) => p.price !== null);
  const partsTotal = priced.reduce((sum, p) => sum + withVat(p.price ?? 0) * (Number(p.qty) || 0), 0);
  const price = parseAmount(kitPrice);
  const saving = price !== null && partsTotal > 0 ? Math.round((1 - withVat(price) / partsTotal) * 100) : null;

  return (
    <div className="flex flex-col gap-3">
      <SearchPicker<ProductPick>
        id="pf-components"
        aria-label="Search products to add to the kit"
        placeholder="Search a product by name or SKU to add it to the kit…"
        search={(q) => searchProductPicks(q, "products")}
        getKey={(p) => p.id}
        isDisabled={(p) => linked.has(p.id)}
        renderItem={(p) => <PickRow pick={p} />}
        minChars={2}
        emptyText="No single products match"
        onSelect={(p) =>
          onChange((prev) => [
            ...prev,
            {
              key: newKey("part"),
              componentId: p.id,
              name: p.name,
              sku: p.sku,
              role: guessRole(p.name),
              qty: "1",
              imageUrl: p.image,
              price: p.price,
            },
          ])
        }
      />
      {errors.components && <p className="text-xs text-red-700">{errors.components}</p>}

      {parts.length ? (
        <ol className="divide-y rounded-lg border">
          {parts.map((part, i) => {
            const nameId = `pf-components-${i}-name`;
            const qtyId = `pf-components-${i}-qty`;
            const nameError = errors[`components.${i}.name`];
            const qtyError = errors[`components.${i}.qty`];
            const roleError = errors[`components.${i}.role`];
            return (
              <li key={part.key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <ProductThumb src={part.imageUrl} size={44} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Input
                      id={nameId}
                      aria-label={`Component ${i + 1} name`}
                      value={part.name}
                      maxLength={300}
                      onChange={(e) => update(part.key, { name: e.target.value })}
                      {...invalidProps(nameId, nameError)}
                    />
                    <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                      {part.componentId ? <Link2 className="size-3 shrink-0" aria-label="Linked product" /> : null}
                      {part.sku || "No SKU"}
                      {part.price !== null && ` · ${formatGBP(withVat(part.price))} inc VAT each`}
                    </p>
                    {nameError && (
                      <p id={`${nameId}-error`} className="text-xs text-red-700">
                        {nameError}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:w-auto">
                  <div className="w-36">
                    <SimpleSelect
                      aria-label={`Component ${i + 1} role`}
                      value={part.role}
                      options={ROLE_OPTIONS}
                      onValueChange={(role) => update(part.key, { role })}
                      invalid={!!roleError}
                    />
                  </div>
                  <div className="flex w-20 flex-col gap-1">
                    <Input
                      id={qtyId}
                      aria-label={`Component ${i + 1} quantity`}
                      inputMode="numeric"
                      value={part.qty}
                      onChange={(e) => update(part.key, { qty: e.target.value })}
                      {...invalidProps(qtyId, qtyError)}
                    />
                    {qtyError && (
                      <p id={`${qtyId}-error`} className="text-xs text-red-700">
                        {qtyError}
                      </p>
                    )}
                  </div>
                  <div className="flex">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move component ${i + 1} up`} disabled={i === 0} onClick={() => onChange((l) => move(l, i, i - 1))}>
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move component ${i + 1} down`}
                      disabled={i === parts.length - 1}
                      onClick={() => onChange((l) => move(l, i, i + 1))}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove component ${i + 1}`}
                      className="text-red-700 hover:bg-red-50 hover:text-red-800"
                      onClick={() => onChange((l) => l.filter((x) => x.key !== part.key))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">No components yet. Add the recorder, cameras, storage and cables in the box.</p>
      )}

      {parts.length > 0 && (
        <dl className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <div className="flex gap-1">
            <dt>Cameras in components:</dt>
            <dd className={cameras !== Number(cameraCount) ? "font-medium text-amber-700" : "text-foreground font-medium"}>
              {cameras}
              {cameras !== Number(cameraCount) && ` (kit says ${cameraCount || 0})`}
            </dd>
          </div>
          {partsTotal > 0 && (
            <div className="flex gap-1">
              <dt>Parts bought separately:</dt>
              <dd className="text-foreground font-medium">
                {formatGBP(Math.round(partsTotal * 100) / 100)} inc VAT
                {priced.length < parts.length && " (unlinked parts not counted)"}
                {saving !== null && saving > 0 && ` · kit saves ${saving}%`}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
