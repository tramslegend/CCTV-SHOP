"use client";

import { useCallback, useState } from "react";
import { AdminToaster } from "@/components/admin/toast";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import type { DeliveryOptionsFormValues, FormRulesValues, MessagesFormValues, OrderingFormValues } from "@/lib/checkout/validation";
import { cn } from "@/lib/utils";
import { DeliveryOptionsSection } from "./delivery-options-section";
import { FormRulesSection } from "./form-rules-section";
import { MessagesSection } from "./messages-section";
import { OrderingSection, type PaymentsStatus } from "./ordering-section";

const SECTIONS = [
  { id: "ordering", label: "Ordering & payments" },
  { id: "delivery", label: "Delivery options" },
  { id: "form", label: "Checkout form" },
  { id: "messages", label: "Messages" },
];

/** Admin → Checkout: one card per section, each saved on its own. Leaving with unsaved edits asks first. */
export function CheckoutForms({
  initial,
  payments,
  collectFrom,
}: {
  initial: { ordering: OrderingFormValues; delivery: DeliveryOptionsFormValues; form: FormRulesValues; messages: MessagesFormValues };
  payments: PaymentsStatus;
  collectFrom: string;
}) {
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const onDirtyChange = useCallback((section: string, value: boolean) => setDirty((prev) => (!!prev[section] === value ? prev : { ...prev, [section]: value })), []);
  useUnsavedChanges(Object.values(dirty).some(Boolean));

  return (
    <div className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <AdminToaster />
      <nav aria-label="Checkout sections" className="lg:sticky lg:top-20 lg:self-start">
        <ul className="flex flex-wrap gap-1 lg:flex-col">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              >
                {s.label}
                <span className={cn("size-1.5 rounded-full bg-amber-500", !dirty[s.id] && "invisible")} aria-label={dirty[s.id] ? "unsaved changes" : undefined} />
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col gap-6">
        <OrderingSection initial={initial.ordering} payments={payments} onDirtyChange={onDirtyChange} />
        <DeliveryOptionsSection initial={initial.delivery} collectFrom={collectFrom} onDirtyChange={onDirtyChange} />
        <FormRulesSection initial={initial.form} onDirtyChange={onDirtyChange} />
        <MessagesSection initial={initial.messages} onDirtyChange={onDirtyChange} />
      </div>
    </div>
  );
}
