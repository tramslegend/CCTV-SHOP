// POST /admin/settings/api/logo — uploads a shop logo (multipart field "file"); returns { url, width, height }.
// The URL is only used once the owner saves the Store details section. Uploaded logos are also listed in the media
// library. Uploads go through a route rather than a server action because actions are capped at 1 MB per request.
import { insert } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { UploadError, uploadFile } from "@/lib/storage";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  // Defence in depth on top of SameSite cookies: refuse cross-site requests.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return Response.json({ error: "Cross-site request refused." }, { status: 403 });
  // Redirects (seen by the client as "sign in again") when the session has ended.
  const { user } = await requireAdmin("settings");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Send the logo as multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file received." }, { status: 400 });
  if (file.size > MAX_LOGO_BYTES) return Response.json({ error: "Logos must be 2 MB or smaller." }, { status: 400 });

  try {
    const stored = await uploadFile(file, "branding");
    await insert("media", {
      url: stored.url,
      pathname: stored.pathname,
      alt: "Shop logo",
      contentType: stored.contentType,
      size: stored.size,
      width: stored.width,
      height: stored.height,
      uploadedBy: user.id,
    });
    return Response.json({ url: stored.url, width: stored.width, height: stored.height });
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ error: error.message }, { status: 400 });
    console.error("Logo upload failed", error);
    return Response.json({ error: "The logo couldn't be stored. Try again." }, { status: 500 });
  }
}
