import { requireAdmin } from "@/lib/admin/session";
import { invoiceHtml } from "@/lib/orders/documents";
import { getOrderById, getOrderItems } from "@/lib/orders/service";
import { getStoreDetails } from "@/lib/orders/settings";

// Printable VAT invoice for a paid order (standalone page, no admin chrome).
export async function GET(_request: Request, ctx: RouteContext<"/admin/orders/[id]/invoice">) {
  await requireAdmin("orders");
  const order = await getOrderById(Number((await ctx.params).id));
  if (!order) return new Response("Order not found", { status: 404 });
  if (!order.paidAt) return new Response("Invoices are only issued for paid orders.", { status: 409 });
  const [items, store] = await Promise.all([getOrderItems(order.id), getStoreDetails()]);
  return new Response(invoiceHtml(order, items, store), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
