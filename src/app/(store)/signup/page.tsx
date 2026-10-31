import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/components/sites/cctvmaster/account/validation";
import { SignupForm } from "@/components/sites/cctvmaster/account/auth-forms";
import { AuthDivider, AuthHeading, AuthShell } from "@/components/sites/cctvmaster/account/auth-shell";
import { secondaryButton } from "@/components/sites/cctvmaster/account/styles";
import { loadSiteSettings } from "@/lib/settings/storefront";

export const metadata: Metadata = {
  title: "Create an Account",
  description: "Order tracking, saved addresses, faster checkout. No application, no minimums.",
};

export default async function SignupPage(props: PageProps<"/signup">) {
  const query = await props.searchParams;
  const next = safeNext(query.next ?? query.callbackUrl);
  const loginHref = next === "/dashboard" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
  const { store } = await loadSiteSettings();
  return (
    <AuthShell variant="signup">
      <AuthHeading
        kicker="Create your account"
        title={`Join ${store.name}`}
        lede="Order tracking, saved addresses, faster checkout. No application, no minimums."
      />
      <SignupForm next={next} />
      <AuthDivider label="Already have an account?" />
      <Link className={`mt-4 ${secondaryButton}`} href={loginHref}>
        Sign in instead
      </Link>
    </AuthShell>
  );
}
