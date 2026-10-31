// GET /admin/products/api/search?q=…&type=products|kits|all&exclude=<id> — product picker results (max 20).
import type { ProductPick } from "@/components/admin/products/types";
import { CI, db } from "@/db";
import { allOf, pickStages, productSearchCondition } from "../../_lib/data";
import { authoriseProducts } from "../_auth";

export async function GET(request: Request) {
  const auth = await authoriseProducts(request);
  if ("error" in auth) return auth.error;

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 120);
  const type = params.get("type");
  const exclude = params.get("exclude")?.slice(0, 64);
  if (!q) return Response.json({ results: [] });

  const rows = await db.products
    .aggregate<ProductPick>(
      [
        {
          $match: allOf([
            productSearchCondition(q),
            type === "kits" ? { kit: { $ne: null } } : type === "products" ? { kit: null } : undefined,
            exclude ? { _id: { $ne: exclude } } : undefined,
          ]),
        },
        // Exact SKU matches first, then active products, then by name. Comparisons ignore case (CI collation below).
        {
          $addFields: {
            exactSku: { $eq: ["$sku", { $literal: q }] },
            statusRank: {
              $switch: {
                branches: [
                  { case: { $eq: ["$status", "active"] }, then: 0 },
                  { case: { $eq: ["$status", "draft"] }, then: 1 },
                ],
                default: 2,
              },
            },
          },
        },
        { $sort: { exactSku: -1, statusRank: 1, name: 1 } },
        { $limit: 20 },
        ...pickStages(),
      ],
      { collation: CI },
    )
    .toArray();
  const results: ProductPick[] = rows.map((r) => ({ ...r, isKit: !!r.isKit }));
  return Response.json({ results });
}
