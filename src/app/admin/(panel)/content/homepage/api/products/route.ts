// GET /admin/content/homepage/api/products?q=…&type=kits|products|all — product picker results for the homepage
// editor (max 20, active first).
import { contains, db } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { type PickedProduct, pickedStages } from "@/lib/homepage/admin";

export async function GET(request: Request) {
  // Defence in depth on top of SameSite cookies: refuse cross-site requests.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return Response.json({ error: "Cross-site request refused." }, { status: 403 });
  await requireAdmin("content");

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 120);
  const type = params.get("type");
  const words = q.split(/\s+/).filter(Boolean).slice(0, 8);
  if (!words.length) return Response.json({ results: [] });

  const rows = await db.products
    .aggregate<PickedProduct>([
      {
        $match: {
          $and: words.map((w) => ({ $or: [{ name: contains(w) }, { sku: contains(w) }, { brand: contains(w) }] })),
          ...(type === "kits" ? { kit: { $ne: null } } : type === "products" ? { kit: null } : {}),
        },
      },
      {
        // Exact SKU first, then active, draft, archived, then by name (case-insensitive). `$literal`: the query is text,
        // never a field path.
        $addFields: {
          skuMatch: { $eq: [{ $toLower: "$sku" }, { $toLower: { $literal: q } }] },
          statusRank: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "active"] }, then: 0 },
                { case: { $eq: ["$status", "draft"] }, then: 1 },
              ],
              default: 2,
            },
          },
          nameKey: { $toLower: "$name" },
        },
      },
      { $sort: { skuMatch: -1, statusRank: 1, nameKey: 1 } },
      { $limit: 20 },
      ...pickedStages,
    ])
    .toArray();
  const results: PickedProduct[] = rows.map((r) => ({ ...r, isKit: !!r.isKit }));
  return Response.json({ results }, { headers: { "cache-control": "no-store" } });
}
