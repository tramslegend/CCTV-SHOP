import { requireAdmin } from "@/lib/admin/session";
import { packingSlipHtml } from "@/lib/orders/documents";
import { getOrderById, getOrderItems } from "@/lib/orders/service";
import { getStoreDetails } from "@/lib/orders/settings";

// Printable packing slip (standalone page, no admin chrome).
export async function GET(_request: Request, ctx: RouteContext<"/admin/orders/[id]/packing-slip">) {
  await requireAdmin("orders");
  const order = await getOrderById(Number((await ctx.params).id));
  if (!order) return new Response("Order not found", { status: 404 });
  const [items, store] = await Promise.all([getOrderItems(order.id), getStoreDetails()]);
  return new Response(packingSlipHtml(order, items, store), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
