import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/sites/cctvmaster/account/checkout-flow";
import { getShopSession, listAddresses } from "@/lib/orders/customer";
import { paymentMode } from "@/lib/orders/payments";
import { getCheckoutSettings } from "@/lib/checkout/server";
import { toPublicCheckout } from "@/lib/checkout/settings";
import { getPricingSettings, getStoreDetails } from "@/lib/orders/settings";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function CheckoutPage(props: PageProps<"/checkout">) {
  const query = await props.searchParams;
  const session = await getShopSession();
  const user = session && !session.user.banned ? session.user : null;
  const [pricing, addresses, checkout, store] = await Promise.all([
    getPricingSettings(),
    user ? listAddresses(user.id) : Promise.resolve([]),
    getCheckoutSettings(),
    getStoreDetails(),
  ]);
  return (
    <CheckoutFlow
      pricing={pricing}
      checkout={toPublicCheckout(checkout, store.address || store.name)}
      mode={paymentMode()}
      returnedFromPayment={typeof query.cancelled === "string"}
      account={
        user ? { name: user.name, email: user.email, phone: user.phone ?? undefined, company: user.company ?? undefined } : null
      }
      addresses={addresses.map((a) => ({
        id: a.id,
        label: a.label ?? undefined,
        name: a.name,
        company: a.company ?? undefined,
        line1: a.line1,
        line2: a.line2 ?? undefined,
        city: a.city,
        county: a.county ?? undefined,
        postcode: a.postcode,
        phone: a.phone ?? undefined,
        isDefault: a.isDefault,
      }))}
    />
  );
}
