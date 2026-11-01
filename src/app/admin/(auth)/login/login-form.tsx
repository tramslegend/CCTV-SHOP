"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setPending(true);
        setError(null);
        const { error: signInError } = await authClient.signIn.email({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        });
        if (signInError) {
          setPending(false);
          setError(
            signInError.status === 429
              ? "Too many attempts. Wait a minute and try again."
              : // Better Auth refuses sign-ins from an address it doesn't trust: not a password problem.
                signInError.code === "INVALID_ORIGIN"
                ? "Signing in isn't allowed from this web address. Open the shop at its usual address and try again."
                : "Email or password is incorrect.",
          );
          return;
        }
        // The server decides whether this account may enter the back office.
        router.replace(next);
        router.refresh();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
