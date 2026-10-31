import type { Metadata } from "next";
import { WishlistView } from "@/components/sites/cctvmaster/account/dashboard-views";
import { requireCustomer } from "@/lib/orders/customer";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  await requireCustomer("/dashboard/wishlist");
  return <WishlistView />;
}
