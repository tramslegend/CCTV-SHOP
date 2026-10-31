import type { Metadata } from "next";
import { OrderNotFound, OrderPlaced } from "@/components/sites/cctvmaster/account/order-placed";
import { paymentIntentId, retrieveCheckoutSession } from "@/lib/orders/checkout";
import { getShopSession } from "@/lib/orders/customer";
import { toReceipt } from "@/lib/orders/receipt";
import { getOrderByNumber, getOrderItems, markOrderPaid } from "@/lib/orders/service";
import { getCheckoutSettings } from "@/lib/checkout/server";
import { optionNamed } from "@/lib/checkout/settings";
import { getPricingSettings, getStoreDetails } from "@/lib/orders/settings";
import { verifyOrderToken } from "@/lib/orders/token";

export const metadata: Metadata = {
  title: "Order placed",
  robots: { index: false },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// The receipt is shown only to the order's owner: the signed-in customer it belongs to, the browser coming back from
// Stripe with that order's checkout session, or a signed receipt link (test payment, confirmation email).
export default async function CheckoutSuccessPage(props: PageProps<"/checkout/success">) {
  const query = await props.searchParams;
  const number = one(query.order);
  const sessionId = one(query.session_id);
  const token = one(query.token);

  let order = number ? await getOrderByNumber(number) : undefined;
  if (!order) return <OrderNotFound />;

  const session = await getShopSession();
  const user = session?.user;
  const ownsInAccount =
    !!user && (order.userId === user.id || (!order.userId && user.emailVerified && user.email.toLowerCase() === order.email.toLowerCase()));

  let allowed = ownsInAccount || verifyOrderToken(order.number, token);
  if (sessionId) {
    const checkout = await retrieveCheckoutSession(order, sessionId);
    if (checkout) {
      allowed = true;
      // The webhook normally confirms payment first; if it hasn't arrived yet, confirm from the session itself.
      if (!order.paidAt && checkout.payment_status === "paid") {
        const result = await markOrderPaid(order.id, { provider: "stripe", ref: paymentIntentId(checkout), amountPence: checkout.amount_total });
        order = result.order ?? order;
      }
    }
  }
  if (!allowed || !order) return <OrderNotFound />;

  const [items, pricing, checkout, store] = await Promise.all([getOrderItems(order.id), getPricingSettings(), getCheckoutSettings(), getStoreDetails()]);
  const collect = optionNamed(checkout.delivery, order.deliveryMethod)?.kind === "collect";
  return (
    <OrderPlaced
      order={toReceipt(order, items)}
      cutoff={pricing.cutoff}
      justPlaced={!!sessionId || one(query.placed) === "1"}
      signedIn={ownsInAccount && !!order.paidAt}
      thankYou={checkout.messages.thankYou}
      collectFrom={collect ? store.address || store.name : null}
    />
  );
}
