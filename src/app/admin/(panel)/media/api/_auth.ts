// Authorisation for the media library's JSON endpoints (fetch() from the library, the product form and the Blob
// upload client). Non-owners get a JSON 401/403 instead of a redirect, so API callers see a clear refusal; then
// requireAdmin("media") runs as the real check (it redirects if anything is still wrong).
import { canAccess } from "@/lib/admin/permissions";
import { getSession, requireAdmin } from "@/lib/admin/session";

export async function authoriseMedia(request: Request) {
  // Defence in depth on top of SameSite cookies: refuse cross-site requests.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return { error: Response.json({ error: "Cross-site request refused." }, { status: 403 }) };

  const session = await getSession();
  if (!session) return { error: Response.json({ error: "Sign in to the back office first." }, { status: 401 }) };
  if (session.user.banned || !canAccess(session.user.role, "media"))
    return { error: Response.json({ error: "Only the shop owner can manage images." }, { status: 403 }) };

  const { user } = await requireAdmin("media");
  return { user };
}
