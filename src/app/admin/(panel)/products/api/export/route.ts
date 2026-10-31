// GET /admin/products/api/export — every single product as a CSV in the import's columns, to edit and import back.
// GET /admin/products/api/export?template=1 — the empty import template with two example rows.
import { logActivity } from "@/lib/admin/session";
import { exportProductsCsv, templateCsv } from "../../_lib/import";
import { authoriseProducts } from "../_auth";

const download = (csv: string, filename: string) =>
  new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });

export async function GET(request: Request) {
  const auth = await authoriseProducts(request);
  if ("error" in auth) return auth.error;

  if (new URL(request.url).searchParams.has("template")) return download(templateCsv(), "product-import-template.csv");

  const { csv, count } = await exportProductsCsv();
  await logActivity(auth.user, "product.export", "product", null, { products: count });
  const date = new Date().toISOString().slice(0, 10);
  return download(csv, `products-${date}.csv`);
}
