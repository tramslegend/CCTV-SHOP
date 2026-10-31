// POST /admin/products/api/import — { mode: "preview" | "run", csv } → ImportResponse (see import-types.ts).
// "preview" only reads; "run" creates and updates products. A route handler rather than a server action because
// actions are capped at 1 MB per request and a catalogue spreadsheet can be larger.
import { z } from "zod";
import { IMPORT_MAX_BYTES, type ImportResponse } from "@/components/admin/products/import-types";
import { siteUrl } from "@/lib/orders/settings";
import { previewImport, runImport } from "../../_lib/import";
import { authoriseProducts } from "../_auth";

// Downloading images for a large file takes a while (the import stops taking new rows before this limit).
export const maxDuration = 300;

const bodySchema = z.object({
  mode: z.enum(["preview", "run"]),
  csv: z.string().min(1).max(IMPORT_MAX_BYTES),
});

export async function POST(request: Request) {
  const auth = await authoriseProducts(request);
  if ("error" in auth) return auth.error;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return Response.json({ ok: false, error: "The file couldn't be read. Choose a CSV file of up to 4 MB." } satisfies ImportResponse, { status: 400 });
  }
  // Image addresses on this shop's own site are used as they are rather than downloaded again.
  const ownOrigins = [...new Set([new URL(request.url).origin, siteUrl()])];
  try {
    const result = body.mode === "preview" ? await previewImport(body.csv, ownOrigins) : await runImport(body.csv, auth.user, ownOrigins);
    return Response.json(result satisfies ImportResponse, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("[import] failed", error);
    const message =
      body.mode === "run"
        ? "The import stopped because of a server error. Rows saved before it stay saved; import the file again to finish."
        : "The file couldn't be checked because of a server error. Try again.";
    return Response.json({ ok: false, error: message } satisfies ImportResponse, { status: 500 });
  }
}
