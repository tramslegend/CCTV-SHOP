import type { Metadata } from "next";
import { connection } from "next/server";
import { CartView } from "@/components/sites/cctvmaster/account/cart-view";
import { getPricingSettings } from "@/lib/orders/settings";

export const metadata: Metadata = {
  title: "Shopping Cart",
  robots: { index: false },
};

export default async function CartPage() {
  // Delivery and VAT settings can change in the admin at any time: read them per request.
  await connection();
  return <CartView pricing={await getPricingSettings()} />;
}
