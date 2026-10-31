// POST /admin/categories/api/upload — the category image (multipart field "file"). Returns
// { id, url, contentType, size, width, height } and adds the image to the media library.
// This is the local-development path of the shared uploader (src/components/admin/media/upload-client.ts): in
// production (BLOB_READ_WRITE_TOKEN set) the browser uploads straight to Vercel Blob instead, since Vercel caps request
// bodies at ~4.5 MB. The URL is saved on the category when the form is saved.
import { storeUpload } from "@/app/admin/(panel)/media/_lib/record";
import { requireAdmin } from "@/lib/admin/session";
import { UploadError } from "@/lib/storage";

export async function POST(request: Request) {
  // Defence in depth on top of SameSite cookies: refuse cross-site requests.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return Response.json({ error: "Cross-site request refused." }, { status: 403 });
  const { user } = await requireAdmin("categories");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Send the image as multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file received." }, { status: 400 });

  try {
    const { stored, id } = await storeUpload(file, "categories", user.id);
    return Response.json({ id, url: stored.url, contentType: stored.contentType, size: stored.size, width: stored.width, height: stored.height });
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ error: error.message }, { status: 400 });
    console.error("Category image upload failed", error);
    return Response.json({ error: "The image couldn't be stored. Try again." }, { status: 500 });
  }
}
