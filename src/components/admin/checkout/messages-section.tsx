"use client";

import { saveMessages } from "@/app/admin/(panel)/checkout/actions";
import { SettingsSection } from "@/components/admin/settings/fields";
import { useSectionForm } from "@/components/admin/settings/use-section-form";
import type { MessagesFormValues } from "@/lib/checkout/validation";
import { TextAreaField } from "./fields";

const S = "messages";

export function MessagesSection({ initial, onDirtyChange }: { initial: MessagesFormValues; onDirtyChange: (section: string, dirty: boolean) => void }) {
  const form = useSectionForm({ section: S, initial, save: saveMessages, onDirtyChange });
  const { values: v, errors } = form;
  const set = (key: keyof MessagesFormValues) => (value: string) => form.update((prev) => ({ ...prev, [key]: value }), key);

  return (
    <SettingsSection
      id={S}
      title="Checkout messages"
      description="Your own words at the key moments of an order. Leave a box empty to show nothing extra."
      saveLabel="Save messages"
      dirty={form.dirty}
      saving={form.saving}
      onSave={form.submit}
      onDiscard={form.discard}
    >
      <TextAreaField
        section={S}
        path="notice"
        label="Notice at the top of the checkout"
        value={v.notice}
        onChange={set("notice")}
        error={errors.notice}
        maxLength={500}
        placeholder="e.g. Orders placed after 2pm on Friday are dispatched on Monday."
        hint="Good for holiday dispatch dates or delivery delays."
      />
      <TextAreaField
        section={S}
        path="thankYou"
        label="Thank-you message after payment"
        value={v.thankYou}
        onChange={set("thankYou")}
        error={errors.thankYou}
        maxLength={1000}
        placeholder="e.g. Thanks for shopping with us! Questions about your order? Call us on 0113 000 0000."
        hint="Shown on the order confirmation page customers see after paying."
      />
      <TextAreaField
        section={S}
        path="emailNote"
        label="Extra note in the order confirmation email"
        value={v.emailNote}
        onChange={set("emailNote")}
        error={errors.emailNote}
        maxLength={1000}
        placeholder="e.g. Need help installing? Reply to this email and our team will help."
        hint="Added to every order confirmation email, after the order details."
      />
    </SettingsSection>
  );
}
