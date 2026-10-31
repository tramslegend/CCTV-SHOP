import { headers } from "next/headers";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/session";
import { auth } from "@/lib/auth";
import { ChangePasswordForm, ProfileForm, SignOutOthersButton } from "./account-forms";

export const metadata = { title: "My account" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

/** Short "Chrome on Windows"-style label from a user agent string. */
function deviceLabel(ua: string | null | undefined) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export default async function AccountPage() {
  const { user } = await requireAdmin("account");
  const h = await headers();
  const [sessions, current] = await Promise.all([auth.api.listSessions({ headers: h }), auth.api.getSession({ headers: h })]);

  return (
    <>
      <PageHeader title="My account" description="You are the shop owner: the only person who can sign in to this admin." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm name={user.name} email={user.email} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Signed-in devices</CardTitle>
            {sessions.length > 1 && <SignOutOthersButton />}
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="font-medium">
                    {deviceLabel(s.userAgent)}
                    {s.id === current?.session.id && <span className="ml-2 text-xs font-normal text-emerald-700">This device</span>}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {s.ipAddress ? `${s.ipAddress} · ` : ""}signed in {when.format(new Date(s.createdAt))}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
