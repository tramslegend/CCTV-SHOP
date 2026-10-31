"use client";

import { saveFormRules } from "@/app/admin/(panel)/checkout/actions";
import { FieldGroup, SettingsSection, TextField } from "@/components/admin/settings/fields";
import { useSectionForm } from "@/components/admin/settings/use-section-form";
import { SimpleSelect } from "@/components/admin/simple-select";
import type { PhoneRule } from "@/lib/checkout/settings";
import type { FormRulesValues } from "@/lib/checkout/validation";
import { SwitchField } from "./fields";

const S = "form";
const PHONE_OPTIONS: { value: PhoneRule; label: string }[] = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
  { value: "hidden", label: "Don't ask" },
];

export function FormRulesSection({ initial, onDirtyChange }: { initial: FormRulesValues; onDirtyChange: (section: string, dirty: boolean) => void }) {
  const form = useSectionForm({ section: S, initial, save: saveFormRules, onDirtyChange });
  const { values: v, errors } = form;
  const toggle = (key: "guestCheckout" | "company" | "notes" | "requireTerms") => (checked: boolean) =>
    form.update((prev) => ({ ...prev, [key]: checked }), key);

  return (
    <SettingsSection
      id={S}
      title="Checkout form"
      description="What the checkout asks customers for, and the rules an order must meet. Checked again on the server when the order is placed."
      saveLabel="Save checkout form"
      dirty={form.dirty}
      saving={form.saving}
      onSave={form.submit}
      onDiscard={form.discard}
    >
      <FieldGroup title="Accounts">
        <SwitchField
          section={S}
          path="guestCheckout"
          label="Allow guest checkout"
          hint="Off: customers must sign in or create an account before they can pay."
          checked={v.guestCheckout}
          onChange={toggle("guestCheckout")}
        />
      </FieldGroup>

      <FieldGroup title="Customer details">
        <div className="flex flex-col gap-1.5 sm:max-w-56">
          <label htmlFor="form-phone" className="text-sm font-medium">
            Phone number
          </label>
          <SimpleSelect
            id="form-phone"
            value={v.phone}
            onValueChange={(phone) => form.update((prev) => ({ ...prev, phone }), "phone")}
            options={PHONE_OPTIONS}
          />
          <p className="text-muted-foreground text-xs">Couriers often text the phone number about the delivery.</p>
        </div>
        <SwitchField
          section={S}
          path="company"
          label="Ask for a company name (optional for the customer)"
          hint="Printed on the invoice."
          checked={v.company}
          onChange={toggle("company")}
        />
        <SwitchField
          section={S}
          path="notes"
          label="Let customers add an order note"
          hint="e.g. delivery instructions. The note appears on the order and in your new-order email."
          checked={v.notes}
          onChange={toggle("notes")}
        />
      </FieldGroup>

      <FieldGroup title="Rules">
        <SwitchField
          section={S}
          path="requireTerms"
          label="Customers must tick “I agree to the terms of sale”"
          hint="Off: the checkout says that paying means agreeing to your terms of sale. Either way it links to your Terms page."
          checked={v.requireTerms}
          onChange={toggle("requireTerms")}
        />
        <TextField
          section={S}
          path="minimumOrder"
          label="Minimum order"
          prefix="£"
          inputMode="decimal"
          autoComplete="off"
          className="sm:max-w-56"
          value={v.minimumOrder}
          onChange={(minimumOrder) => form.update((prev) => ({ ...prev, minimumOrder }), "minimumOrder")}
          error={errors.minimumOrder}
          placeholder="No minimum"
          hint="Items total including VAT, after any discount. Leave empty for no minimum."
        />
      </FieldGroup>
    </SettingsSection>
  );
}
