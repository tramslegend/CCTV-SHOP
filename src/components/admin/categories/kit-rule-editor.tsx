"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { FormField, invalidProps } from "@/components/admin/form-field";
import { SimpleSelect } from "@/components/admin/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  COLOUR_OPTIONS,
  describeRule,
  type KitFacts,
  type KitRuleValues,
  MAX_RULE_CAMERAS,
  RES_RULE_OPTIONS,
  ruleMatches,
  sameRule,
  SYSTEM_OPTIONS,
} from "@/lib/admin/categories/kit-rule";
import type { FieldErrors } from "@/lib/admin/categories/types";
import { cn } from "@/lib/utils";

const n = (v: number) => v.toLocaleString("en-GB");

/** Which ready-made kits a kit range lists, with a live count of the kits in the shop that match. */
export function KitRuleEditor({
  rule,
  onChange,
  kits,
  builtIn,
  saved,
  errors,
}: {
  rule: KitRuleValues;
  onChange: (patch: Partial<KitRuleValues>) => void;
  kits: KitFacts[];
  /** The rule the slug gets without one set here (null for new ranges). */
  builtIn: KitRuleValues | null;
  /** The rule as last saved (null when creating). */
  saved: KitRuleValues | null;
  errors: FieldErrors;
}) {
  const count = useMemo(() => kits.filter((k) => ruleMatches(k, rule)).length, [kits, rule]);
  const savedCount = useMemo(() => (saved ? kits.filter((k) => ruleMatches(k, saved)).length : null), [kits, saved]);
  const changed = saved !== null && !sameRule(rule, saved);
  const isBuiltIn = builtIn !== null && sameRule(rule, builtIn);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="cf-kitRule-system" label="System" error={errors["kitRule.system"]}>
          <SimpleSelect id="cf-kitRule-system" value={rule.system} options={SYSTEM_OPTIONS} onValueChange={(system) => onChange({ system })} />
        </FormField>
        <FormField
          id="cf-kitRule-cameras"
          label="Number of cameras"
          error={errors["kitRule.cameras"]}
          hint={errors["kitRule.cameras"] ? undefined : "Exact number in the kit. Leave empty for any."}
        >
          <Input
            id="cf-kitRule-cameras"
            inputMode="numeric"
            placeholder="Any"
            value={rule.cameras}
            maxLength={2}
            onChange={(e) => onChange({ cameras: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            aria-label={`Number of cameras (1 to ${MAX_RULE_CAMERAS})`}
            {...invalidProps("cf-kitRule-cameras", errors["kitRule.cameras"])}
          />
        </FormField>
        <FormField id="cf-kitRule-res" label="Camera resolution" error={errors["kitRule.res"]}>
          <SimpleSelect id="cf-kitRule-res" value={rule.res} options={RES_RULE_OPTIONS} onValueChange={(res) => onChange({ res })} />
        </FormField>
        <FormField id="cf-kitRule-colour" label="Camera colour" error={errors["kitRule.colour"]}>
          <SimpleSelect id="cf-kitRule-colour" value={rule.colour} options={COLOUR_OPTIONS} onValueChange={(colour) => onChange({ colour })} />
        </FormField>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
          count === 0 ? "border-amber-200 bg-amber-50" : "bg-zinc-50",
        )}
        aria-live="polite"
        data-testid="kit-rule-count"
      >
        <div className="min-w-0">
          <p className="text-sm">
            <span className="font-semibold tabular-nums">{n(count)}</span> {count === 1 ? "kit matches" : "kits match"}{" "}
            <span className="text-muted-foreground">({describeRule(rule)})</span>
          </p>
          <p className="text-muted-foreground text-xs">
            {count === 0
              ? "No kit in the shop matches: the range page would be empty."
              : changed && savedCount !== null
                ? `Currently ${n(savedCount)} with the saved rule. Save to update the range page.`
                : "Counted from the kits customers can see now."}
          </p>
        </div>
        {builtIn && !isBuiltIn && (
          <Button type="button" variant="outline" size="xs" onClick={() => onChange(builtIn)} title={describeRule(builtIn)}>
            <RotateCcw /> Use the built-in rule
          </Button>
        )}
        {builtIn && isBuiltIn && <span className="text-muted-foreground text-xs">Built-in rule for this address</span>}
      </div>
    </div>
  );
}
