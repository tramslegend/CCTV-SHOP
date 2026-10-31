import { DiscountForm } from "@/components/admin/marketing/discount-form";
import { requireAdmin } from "@/lib/admin/session";
import { EMPTY_DISCOUNT } from "@/lib/discounts/validation";

export const metadata = { title: "New discount code" };

export default async function NewDiscountCodePage() {
  await requireAdmin("marketing");
  return <DiscountForm mode="create" initialValues={EMPTY_DISCOUNT} />;
}
