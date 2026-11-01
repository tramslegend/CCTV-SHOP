import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/sites/cctvmaster/account/auth-forms";
import { AuthShell } from "@/components/sites/cctvmaster/account/auth-shell";
import { primaryButton } from "@/components/sites/cctvmaster/account/styles";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false },
};

// The emailed link goes through /api/auth/reset-password/<token>, which checks the token and lands here with
// ?token=… (valid) or ?error=INVALID_TOKEN (missing, used or expired).
export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const query = await props.searchParams;
  const token = typeof query.token === "string" && !query.error ? query.token : null;
  return (
    <AuthShell variant="plain">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <TriangleAlert className="h-7 w-7 text-amber-600" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Invalid link</h1>
            <p className="text-sm text-muted-foreground">This reset link is invalid or has expired.</p>
          </div>
          <Link className={primaryButton} href="/forgot-password">
            Request a new link
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
