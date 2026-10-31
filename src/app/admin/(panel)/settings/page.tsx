import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForms } from "@/components/admin/settings/settings-forms";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/session";
import { getShopSettings } from "@/lib/settings/server";
import { deliveryToForm, seoToForm, storeToForm } from "@/lib/settings/validation";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin("settings");
  const settings = await getShopSettings();
  const siteHost = (process.env.SITE_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <>
      <PageHeader
        title="Settings"
        description="Your shop's details, delivery charges, VAT, notification emails and search appearance. Changes show on the shop as soon as you save."
        actions={
          <Link href="/" target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
            View shop <ExternalLink />
          </Link>
        }
      />
      <SettingsForms
        initial={{
          store: storeToForm(settings.store),
          delivery: deliveryToForm(settings.delivery),
          notifications: { ...settings.notifications },
          seo: seoToForm(settings.seo, settings.social),
        }}
        fallbackEmail={process.env.SHOP_NOTIFY_EMAIL || null}
        siteHost={siteHost}
      />
    </>
  );
}
