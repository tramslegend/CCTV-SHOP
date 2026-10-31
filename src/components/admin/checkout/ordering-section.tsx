"use client";

import { CircleAlert, CircleCheck, FlaskConical } from "lucide-react";
import { saveOrdering } from "@/app/admin/(panel)/checkout/actions";
import { FieldGroup, SettingsSection } from "@/components/admin/settings/fields";
import { useSectionForm } from "@/components/admin/settings/use-section-form";
import type { OrderingFormValues } from "@/lib/checkout/validation";
import { cn } from "@/lib/utils";
import { SwitchField, TextAreaField } from "./fields";

const S = "ordering";

/** How payments and order emails are connected on this server (read from its environment, never editable here). */
export interface PaymentsStatus {
  mode: "stripe" | "test" | "disabled";
  stripeKey: "live" | "test" | null;
  webhook: boolean;
  emails: boolean;
}

export const PAUSED_FALLBACK = "We're not taking online orders at the moment. Please call or email us to order.";

export function OrderingSection({
  initial,
  payments,
  onDirtyChange,
}: {
  initial: OrderingFormValues;
  payments: PaymentsStatus;
  onDirtyChange: (section: string, dirty: boolean) => void;
}) {
  const form = useSectionForm({ section: S, initial, save: saveOrdering, onDirtyChange });
  const { values: v, errors } = form;

  return (
    <SettingsSection
      id={S}
      title="Online ordering & payments"
      description="Whether customers can place orders, and how card payments are connected."
      saveLabel="Save ordering"
      dirty={form.dirty}
      saving={form.saving}
      onSave={form.submit}
      onDiscard={form.discard}
    >
      <FieldGroup title="Online ordering">
        <SwitchField
          section={S}
          path="enabled"
          label="Take orders online"
          hint="Turn off to pause the checkout, e.g. for holidays or a stocktake. Customers can still browse and fill their basket."
          checked={v.enabled}
          onChange={(enabled) => form.update((prev) => ({ ...prev, enabled }), "enabled")}
        />
        {!v.enabled && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            When you save, the checkout stops taking orders and shows the message below instead.
          </p>
        )}
        <TextAreaField
          section={S}
          path="pausedMessage"
          label="Message while ordering is paused"
          value={v.pausedMessage}
          onChange={(pausedMessage) => form.update((prev) => ({ ...prev, pausedMessage }), "pausedMessage")}
          error={errors.pausedMessage}
          maxLength={500}
          placeholder={PAUSED_FALLBACK}
          hint="Shown on the checkout page while ordering is off. Left empty, customers see the example text."
        />
      </FieldGroup>

      <FieldGroup title="Payments" description="Connected on the hosting (Vercel) by whoever deploys the shop. Shown here so you can check it.">
        <ul className="divide-y rounded-lg border text-sm">
          <StatusRow
            label="Card payments"
            tone={payments.mode === "stripe" && payments.stripeKey === "live" ? "good" : payments.mode === "disabled" ? "bad" : "test"}
            value={
              payments.mode === "stripe"
                ? payments.stripeKey === "live"
                  ? "Stripe: live. Customers pay by card, Apple Pay or Google Pay."
                  : "Stripe: test mode. Orders work end to end but no real money is taken (test card 4242 4242 4242 4242)."
                : payments.mode === "test"
                  ? "Test payments on this computer only. No card is asked for and nothing is charged."
                  : "Not connected. The checkout can't take payment, so customers are asked to call or email instead."
            }
          />
          {payments.mode === "stripe" && (
            <StatusRow
              label="Payment confirmations"
              tone={payments.webhook ? "good" : "bad"}
              value={
                payments.webhook
                  ? "Stripe tells the shop the moment an order is paid."
                  : "Not set up (STRIPE_WEBHOOK_SECRET). Orders are confirmed when the customer returns from Stripe, but can be missed if they close the page."
              }
            />
          )}
          <StatusRow
            label="Order emails"
            tone={payments.emails ? "good" : payments.mode === "test" ? "test" : "bad"}
            value={
              payments.emails
                ? "Sent with Resend: confirmations, dispatch and refund emails, and new-order alerts."
                : payments.mode === "test"
                  ? "Not connected. On this computer emails are saved to a folder instead of being sent."
                  : "Not connected (RESEND_API_KEY and EMAIL_FROM). Customers don't get order emails yet."
            }
          />
        </ul>
        <p className="text-muted-foreground text-xs">
          To connect payments or emails, add the keys in Vercel → Settings → Environment Variables, then redeploy. The step-by-step guide is in
          docs/GO-LIVE.md.
        </p>
      </FieldGroup>
    </SettingsSection>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone: "good" | "test" | "bad" }) {
  const Icon = tone === "good" ? CircleCheck : tone === "test" ? FlaskConical : CircleAlert;
  return (
    <li className="flex gap-3 px-3 py-2.5">
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", tone === "good" ? "text-emerald-600" : tone === "test" ? "text-amber-600" : "text-red-600")}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{value}</p>
      </div>
    </li>
  );
}
