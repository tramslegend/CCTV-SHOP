import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/sites/cctvmaster/account/auth-forms";
import { AuthHeading, AuthShell } from "@/components/sites/cctvmaster/account/auth-shell";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Enter your email and we'll send you a reset link.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell variant="plain">
      <ForgotPasswordForm
        heading={
          <AuthHeading
            kicker="Password reset"
            title="Forgot your password?"
            lede="Enter your email and we'll send you a reset link."
          />
        }
      />
    </AuthShell>
  );
}
