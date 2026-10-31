// POST /admin/media/api/blob — client-token route for browser → Vercel Blob uploads (`upload()` from
// @vercel/blob/client, used by the media library and the product images editor when BLOB_READ_WRITE_TOKEN is set).
// Vercel caps request bodies at ~4.5 MB, so production uploads must not pass through the server.
//
// Only the owner gets a token, only for one JPEG/PNG/WebP/AVIF/GIF content type and at most 8 MB, valid 15 minutes.
// The library row is recorded by the browser right after the upload (recordDirectUpload action), which re-checks the
// blob server-side. There is no onUploadCompleted callback: Vercel's callback carries no session cookie, so the admin
// proxy would bounce it to the login page (and it can't reach localhost anyway).
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { directUploadsEnabled, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { checkDirectUpload, TOKEN_LIFETIME_MS } from "../../_lib/direct-upload";
import { authoriseMedia } from "../_auth";

const tokenRequest = z.object({
  type: z.literal("blob.generate-client-token"),
  payload: z.object({
    pathname: z.string().max(200),
    clientPayload: z.string().max(1000).nullable(),
    multipart: z.boolean(),
  }),
});

export async function POST(request: Request) {
  const auth = await authoriseMedia(request);
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON token request." }, { status: 400 });
  }
  const parsed = tokenRequest.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Unsupported upload request." }, { status: 400 });

  const { pathname, clientPayload } = parsed.data.payload;
  const check = checkDirectUpload(pathname, clientPayload);
  if (!check.ok) return Response.json({ error: check.message }, { status: 400 });

  if (!directUploadsEnabled())
    return Response.json({ error: "Direct uploads aren't configured here (BLOB_READ_WRITE_TOKEN is not set). Use the server upload." }, { status: 409 });

  try {
    const body: HandleUploadBody = parsed.data;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [check.contentType],
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        addRandomSuffix: true,
        allowOverwrite: false,
        validUntil: Date.now() + TOKEN_LIFETIME_MS,
        tokenPayload: JSON.stringify({ userId: auth.user.id }),
      }),
    });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Blob client token failed", error);
    return Response.json({ error: "The upload couldn't be started. Try again." }, { status: 500 });
  }
}
