import { ensureCatalog, searchSuggestions } from "@/lib/cctvmaster/catalog";

// Instant search suggestions for the header search box.
export async function GET(request: Request) {
  await ensureCatalog();
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json(searchSuggestions(q.slice(0, 100)));
}
