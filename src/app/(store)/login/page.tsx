import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/components/sites/cctvmaster/account/validation";
import { LoginForm } from "@/components/sites/cctvmaster/account/auth-forms";
import { AuthDivider, AuthHeading, AuthShell } from "@/components/sites/cctvmaster/account/auth-shell";
import { secondaryButton } from "@/components/sites/cctvmaster/account/styles";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to track orders, manage saved addresses and view your purchase history.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const query = await props.searchParams;
  const next = safeNext(query.next ?? query.callbackUrl);
  const signupHref = next === "/dashboard" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;
  return (
    <AuthShell variant="login">
      <AuthHeading
        kicker="Customer login"
        title="Welcome Back"
        lede="Sign in to track orders, manage saved addresses and view your purchase history."
      />
      <LoginForm next={next} />
      <AuthDivider label="No account?" />
      <Link className={`mt-4 ${secondaryButton}`} href={signupHref}>
        Create an account
      </Link>
    </AuthShell>
  );
}
