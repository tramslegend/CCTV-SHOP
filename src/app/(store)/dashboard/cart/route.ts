import { NextResponse, type NextRequest } from "next/server";

// The source's older account footer linked /dashboard/cart; the basket lives at /cart.
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/cart", request.url), 307);
}
