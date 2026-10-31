"use client";

import { saveNotificationSettings } from "@/app/admin/(panel)/settings/actions";
import type { NotificationFormValues } from "@/lib/settings/validation";
import { SettingsSection, TextField } from "./fields";
import { useSectionForm } from "./use-section-form";

const S = "notifications";

export function NotificationsSection({
  initial,
  fallbackEmail,
  storeEmail,
  onDirtyChange,
}: {
  initial: NotificationFormValues;
  /** SHOP_NOTIFY_EMAIL on the server, if set. */
  fallbackEmail: string | null;
  /** The shop's public email (Store details), the last fallback for new messages. */
  storeEmail: string;
  onDirtyChange: (section: string, dirty: boolean) => void;
}) {
  const form = useSectionForm({ section: S, initial, save: saveNotificationSettings, onDirtyChange });
  const { values: v, errors } = form;
  const set = (key: keyof NotificationFormValues) => (value: string) => form.update((prev) => ({ ...prev, [key]: value }), key);

  const ordersFallback = fallbackEmail
    ? `Leave empty to use ${fallbackEmail} (the server's SHOP_NOTIFY_EMAIL).`
    : "Leave empty to use the server's SHOP_NOTIFY_EMAIL. It isn't set, so no new-order emails are sent until you add an address.";
  const messagesFallback = fallbackEmail
    ? `Leave empty to use ${fallbackEmail} (the server's SHOP_NOTIFY_EMAIL).`
    : storeEmail
      ? `Leave empty to use the shop email, ${storeEmail}.`
      : "Leave empty to use the server's SHOP_NOTIFY_EMAIL or the shop email; neither is set yet.";

  return (
    <SettingsSection
      id={S}
      title="Notifications"
      description="Where the shop emails you when something needs attention. Customers never see these addresses."
      saveLabel="Save notifications"
      dirty={form.dirty}
      saving={form.saving}
      onSave={form.submit}
      onDiscard={form.discard}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          section={S}
          path="ordersEmail"
          label="New orders"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={v.ordersEmail}
          onChange={set("ordersEmail")}
          error={errors.ordersEmail}
          placeholder={fallbackEmail ?? "orders@yourshop.co.uk"}
          hint={`An email for every paid order. ${ordersFallback}`}
        />
        <TextField
          section={S}
          path="messagesEmail"
          label="New messages"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={v.messagesEmail}
          onChange={set("messagesEmail")}
          error={errors.messagesEmail}
          placeholder={fallbackEmail ?? (storeEmail || "hello@yourshop.co.uk")}
          hint={`Contact, quote and trade enquiries; customers' replies come here too. ${messagesFallback}`}
        />
      </div>
    </SettingsSection>
  );
}
