"use client";

import { useCallback, useState } from "react";
import { AdminToaster } from "@/components/admin/toast";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { cn } from "@/lib/utils";
import type { DeliveryFormValues, NotificationFormValues, SeoFormValues, StoreFormValues } from "@/lib/settings/validation";
import { DeliverySection } from "./delivery-section";
import { NotificationsSection } from "./notifications-section";
import { SeoSection } from "./seo-section";
import { StoreSection } from "./store-section";

const SECTIONS = [
  { id: "store", label: "Store details" },
  { id: "delivery", label: "Delivery & VAT" },
  { id: "notifications", label: "Notifications" },
  { id: "seo", label: "SEO & social" },
];

/** The settings page: one card per section, each saved on its own. Leaving with unsaved edits asks first. */
export function SettingsForms({
  initial,
  fallbackEmail,
  siteHost,
}: {
  initial: { store: StoreFormValues; delivery: DeliveryFormValues; notifications: NotificationFormValues; seo: SeoFormValues };
  fallbackEmail: string | null;
  siteHost: string;
}) {
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const onDirtyChange = useCallback((section: string, value: boolean) => setDirty((prev) => (!!prev[section] === value ? prev : { ...prev, [section]: value })), []);
  useUnsavedChanges(Object.values(dirty).some(Boolean));

  return (
    <div className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <AdminToaster />
      <nav aria-label="Settings sections" className="lg:sticky lg:top-20 lg:self-start">
        <ul className="flex flex-wrap gap-1 lg:flex-col">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
              >
                {s.label}
                <span
                  className={cn("size-1.5 rounded-full bg-amber-500", !dirty[s.id] && "invisible")}
                  aria-label={dirty[s.id] ? "unsaved changes" : undefined}
                />
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col gap-6">
        <StoreSection initial={initial.store} onDirtyChange={onDirtyChange} />
        <DeliverySection initial={initial.delivery} onDirtyChange={onDirtyChange} />
        <NotificationsSection
          initial={initial.notifications}
          fallbackEmail={fallbackEmail}
          storeEmail={initial.store.email}
          onDirtyChange={onDirtyChange}
        />
        <SeoSection initial={initial.seo} storeName={initial.store.name} siteHost={siteHost} onDirtyChange={onDirtyChange} />
      </div>
    </div>
  );
}
