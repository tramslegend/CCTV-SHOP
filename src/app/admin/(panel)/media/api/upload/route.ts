// /admin/media/api/upload
//   GET  → { mode: "blob" | "server" } — how the browser should upload: straight to Vercel Blob in production
//          (BLOB_READ_WRITE_TOKEN set; see ../blob) or through this route locally.
//   POST → one image (multipart field "file"), stored with uploadFile() and added to the library. Returns the
//          stored image and its library entry. A route rather than a server action: actions are capped at 1 MB.
import { directUploadsEnabled, UploadError } from "@/lib/storage";
import { storeUpload } from "../../_lib/record";
import { authoriseMedia } from "../_auth";

export async function GET(request: Request) {
  const auth = await authoriseMedia(request);
  if ("error" in auth) return auth.error;
  return Response.json({ mode: directUploadsEnabled() ? "blob" : "server" }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await authoriseMedia(request);
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
    const { stored, id, media } = await storeUpload(file, "media", auth.user.id);
    return Response.json({ id, url: stored.url, contentType: stored.contentType, size: stored.size, width: stored.width, height: stored.height, media });
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ error: error.message }, { status: 400 });
    console.error("Media upload failed", error);
    return Response.json({ error: "The image couldn't be stored. Try again." }, { status: 500 });
  }
}
