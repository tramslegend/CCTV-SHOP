import Link from "next/link";
import { Boxes, FolderTree, Mail, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { formatGBP } from "@/lib/cctvmaster/money";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const { user } = await requireAdmin("dashboard");
  const n = (count: Promise<number>) => count.then((value) => ({ n: value }));
  const [products, kits, categories, orders, openOrders, newMessages, revenue] = await Promise.all([
    n(db.products.countDocuments({ kit: null })),
    n(db.products.countDocuments({ kit: { $ne: null } })),
    n(db.categories.countDocuments({})),
    n(db.orders.countDocuments({})),
    n(db.orders.countDocuments({ status: { $in: ["paid", "processing"] } })),
    n(db.enquiries.countDocuments({ status: "new" })),
    db.orders
      .aggregate<{ total: number }>([
        { $match: { status: { $nin: ["pending_payment", "cancelled", "refunded"] } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ])
      .toArray()
      // Added up in floating point: back to whole pence, as the exact database sum was.
      .then(([r]) => ({ total: Math.round((r?.total ?? 0) * 100) / 100 })),
  ]);

  const tiles = [
    { label: "Orders to fulfil", value: openOrders.n, sub: `${orders.n} orders in total`, href: "/admin/orders", icon: ShoppingCart },
    { label: "New messages", value: newMessages.n, sub: "Contact, quote and trade enquiries", href: "/admin/messages", icon: Mail },
    { label: "Products", value: products.n, sub: `plus ${kits.n} ready-made kits`, href: "/admin/products", icon: Boxes },
    { label: "Categories", value: categories.n, sub: "Shop categories and kit ranges", href: "/admin/categories", icon: FolderTree },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={`Revenue from paid orders: ${formatGBP(Number(revenue.total))}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ label, value, sub, href, icon: Icon }) => (
          <Link key={label} href={href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
                <Icon className="text-muted-foreground size-4" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{value.toLocaleString("en-GB")}</p>
                <p className="text-muted-foreground mt-1 text-xs">{sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
