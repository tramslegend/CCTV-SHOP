import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/sites/cctvmaster/account/dashboard-views";
import { getCheckoutSettings } from "@/lib/checkout/server";
import { optionNamed } from "@/lib/checkout/settings";
import { getCustomerOrder, requireCustomer } from "@/lib/orders/customer";
import { getStoreDetails } from "@/lib/orders/settings";
import { toReceipt } from "@/lib/orders/receipt";

export async function generateMetadata(props: PageProps<"/dashboard/orders/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `Order ${decodeURIComponent(id)}` };
}

export default async function OrderPage(props: PageProps<"/dashboard/orders/[id]">) {
  const { id } = await props.params;
  const number = decodeURIComponent(id);
  const user = await requireCustomer(`/dashboard/orders/${encodeURIComponent(number)}`);
  const order = await getCustomerOrder(user, number);
  if (!order) notFound();
  const [checkout, store] = await Promise.all([getCheckoutSettings(), getStoreDetails()]);
  const collect = optionNamed(checkout.delivery, order.deliveryMethod)?.kind === "collect";
  return (
    <OrderDetail
      order={{
        ...toReceipt(order, order.items),
        timeline: order.events.map((e) => ({ id: e.id, type: e.type, at: e.createdAt.toISOString() })),
      }}
      collectFrom={collect ? store.address || store.name : null}
    />
  );
}
