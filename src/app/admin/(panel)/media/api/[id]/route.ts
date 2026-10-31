// GET /admin/media/api/<id> — one library entry with every place it is used (for the detail dialog).
import { getMediaItem } from "../../_lib/data";
import { findUsage, usageTotal } from "../../_lib/usage";
import { authoriseMedia } from "../_auth";

export async function GET(request: Request, ctx: RouteContext<"/admin/media/api/[id]">) {
  const auth = await authoriseMedia(request);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return Response.json({ error: "Not found." }, { status: 404 });
  const item = await getMediaItem(n);
  if (!item) return Response.json({ error: "This image is no longer in the library." }, { status: 404 });
  const usage = await findUsage(item.url);
  return Response.json({ item: { ...item, usedIn: usageTotal(usage) }, usage }, { headers: { "cache-control": "no-store" } });
}
