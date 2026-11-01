import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isBackOffice } from "@/lib/admin/permissions";
import { getSession } from "@/lib/admin/session";
import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next, error } = await searchParams;
  const session = await getSession();
  const target = typeof next === "string" && next.startsWith("/admin") ? next : "/admin";
  if (session && isBackOffice(session.user.role) && !session.user.banned) redirect(target);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Sign in to the admin</h1>
        <p className="text-muted-foreground mt-1 text-sm">For the shop owner only.</p>
        {error === "not-staff" && (
          <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Only the shop owner can sign in here.
          </p>
        )}
        <AdminLoginForm next={target} />
      </div>
    </main>
  );
}
