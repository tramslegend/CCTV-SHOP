import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Access gate while the shop still shows the reference site's branding: with SITE_PASSWORD set, every page needs
// either the access link (/?access=SITE_ACCESS_KEY, remembered in a cookie for 30 days) or the username "demo" and
// that password, and tells search engines not to index it. Unset (local development, or once the shop has its own
// branding) it does nothing. Everything except the build's JS/CSS bundles is gated, images included: the image
// optimiser forwards the visitor's cookie to the source image.
const sitePassword = process.env.SITE_PASSWORD;
const accessKey = process.env.SITE_ACCESS_KEY;
const ACCESS_COOKIE = "demo_access";
const NOINDEX = "noindex, nofollow";

function passwordOk(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  return i >= 0 && decoded.slice(0, i) === "demo" && decoded.slice(i + 1) === sitePassword;
}

// Optimistic check only: visitors without a session cookie are sent to the admin login before any admin page
// renders. Real authorisation (role, ban, area) happens server-side in requireAdmin().
function adminGate(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!(pathname === "/admin" || pathname.startsWith("/admin/")) || pathname === "/admin/login") return NextResponse.next();
  if (!getSessionCookie(request)) {
    const login = new URL("/admin/login", request.url);
    if (pathname !== "/admin") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export function proxy(request: NextRequest) {
  if (!sitePassword) return adminGate(request);
  if (accessKey && request.nextUrl.searchParams.get("access") === accessKey) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("access");
    const response = NextResponse.redirect(clean);
    response.cookies.set(ACCESS_COOKIE, accessKey, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    response.headers.set("X-Robots-Tag", NOINDEX);
    return response;
  }
  const hasAccessCookie = !!accessKey && request.cookies.get(ACCESS_COOKIE)?.value === accessKey;
  if (!hasAccessCookie && !passwordOk(request)) {
    return new NextResponse("This preview is password protected.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Preview", charset="UTF-8"', "X-Robots-Tag": NOINDEX },
    });
  }
  const response = adminGate(request);
  response.headers.set("X-Robots-Tag", NOINDEX);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|favicon.ico).*)"],
};
