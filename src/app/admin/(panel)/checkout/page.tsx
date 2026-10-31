import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CheckoutForms } from "@/components/admin/checkout/checkout-forms";
import type { PaymentsStatus } from "@/components/admin/checkout/ordering-section";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/session";
import { getCheckoutSettings } from "@/lib/checkout/server";
import { deliveryOptionsToForm, formRulesToForm, messagesToForm, orderingToForm } from "@/lib/checkout/validation";
import { paymentMode } from "@/lib/orders/payments";
import { getStoreDetails } from "@/lib/orders/settings";

export const metadata = { title: "Checkout" };

/** How payments and emails are connected, from the server's environment (keys themselves are never shown). */
function paymentsStatus(): PaymentsStatus {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return {
    mode: paymentMode(),
    stripeKey: key ? (/^(sk|rk)_live_/.test(key) ? "live" : "test") : null,
    webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    emails: !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM,
  };
}

export default async function AdminCheckoutPage() {
  await requireAdmin("settings");
  const [settings, store] = await Promise.all([getCheckoutSettings(), getStoreDetails()]);
  return (
    <>
      <PageHeader
        title="Checkout"
        description="How customers order: whether you're taking orders, delivery options and prices, what the checkout asks for and what it says. Changes apply as soon as you save."
        actions={
          <Link href="/checkout" target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
            View checkout <ExternalLink />
          </Link>
        }
      />
      <CheckoutForms
        initial={{
          ordering: orderingToForm(settings),
          delivery: deliveryOptionsToForm(settings),
          form: formRulesToForm(settings),
          messages: messagesToForm(settings),
        }}
        payments={paymentsStatus()}
        collectFrom={store.address}
      />
    </>
  );
}
