// GET /admin/media/api/list?q=&filter=&page= — one page of the library as JSON, for the "Choose from library" picker.
import { MEDIA_PAGE_SIZE } from "@/components/admin/media/types";
import { listMedia, parseMediaParams } from "../../_lib/data";
import { authoriseMedia } from "../_auth";

export async function GET(request: Request) {
  const auth = await authoriseMedia(request);
  if ("error" in auth) return auth.error;
  const state = parseMediaParams(Object.fromEntries(new URL(request.url).searchParams));
  const { items, total } = await listMedia(state);
  return Response.json(
    { items, total, page: state.page, hasMore: state.page * MEDIA_PAGE_SIZE < total },
    { headers: { "cache-control": "no-store" } },
  );
}
