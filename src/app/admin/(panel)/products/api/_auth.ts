// Authorisation for the products module's JSON endpoints (called with fetch() from the product form).
// requireAdmin("products") is the real check: when it fails it redirects (to the login or no-access page), which the
// client sees as a redirected response and reports as "sign in again".
import { requireAdmin } from "@/lib/admin/session";

export async function authoriseProducts(request: Request) {
  // Defence in depth on top of SameSite cookies: refuse cross-site requests.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return { error: Response.json({ error: "Cross-site request refused." }, { status: 403 }) };
  const { user } = await requireAdmin("products");
  return { user };
}
