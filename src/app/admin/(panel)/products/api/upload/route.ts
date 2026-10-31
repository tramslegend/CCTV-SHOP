// POST /admin/products/api/upload — one image per request (multipart field "file"). Returns
// { id, url, contentType, size, width, height } and adds the image to the media library.
// Uploads go through this route rather than a server action because actions are capped at 1 MB per request.
// This is the local-development path: in production (BLOB_READ_WRITE_TOKEN set) the images editor uploads straight
// from the browser to Vercel Blob (see /admin/media/api/blob), since Vercel caps request bodies at ~4.5 MB.
import { storeUpload } from "@/app/admin/(panel)/media/_lib/record";
import { UploadError } from "@/lib/storage";
import { authoriseProducts } from "../_auth";

export async function POST(request: Request) {
  const auth = await authoriseProducts(request);
  if ("error" in auth) return auth.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Send the image as multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file received." }, { status: 400 });

  try {
    const { stored, id } = await storeUpload(file, "products", auth.user.id);
    return Response.json({ id, url: stored.url, contentType: stored.contentType, size: stored.size, width: stored.width, height: stored.height });
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ error: error.message }, { status: 400 });
    console.error("Image upload failed", error);
    return Response.json({ error: "The image couldn't be stored. Try again." }, { status: 500 });
  }
}
