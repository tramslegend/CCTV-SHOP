"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type Status = { ok: boolean; text: string } | null;

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p role={status.ok ? "status" : "alert"} className={status.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>
      {status.text}
    </p>
  );
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const next = String(new FormData(e.currentTarget).get("name") ?? "").trim();
        if (next.length < 2) return setStatus({ ok: false, text: "Enter your name." });
        setPending(true);
        const { error } = await authClient.updateUser({ name: next });
        setPending(false);
        setStatus(error ? { ok: false, text: "Couldn't save your name. Try again." } : { ok: true, text: "Saved." });
        if (!error) router.refresh();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acc-name">Name</Label>
        <Input id="acc-name" name="name" defaultValue={name} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acc-email">Email (used to sign in)</Label>
        <Input id="acc-email" value={email} readOnly disabled />
      </div>
      <StatusLine status={status} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const currentPassword = String(data.get("current") ?? "");
        const newPassword = String(data.get("new") ?? "");
        if (newPassword.length < 10) return setStatus({ ok: false, text: "Use at least 10 characters for the new password." });
        if (newPassword !== data.get("confirm")) return setStatus({ ok: false, text: "The new passwords don't match." });
        setPending(true);
        const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
        setPending(false);
        if (error) return setStatus({ ok: false, text: "Your current password is incorrect." });
        form.reset();
        setStatus({ ok: true, text: "Password changed. Other devices have been signed out." });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-current">Current password</Label>
        <Input id="pw-current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-new">New password</Label>
        <Input id="pw-new" name="new" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-confirm">Confirm new password</Label>
        <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      <StatusLine status={status} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}

export function SignOutOthersButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.revokeOtherSessions();
        setPending(false);
        router.refresh();
      }}
    >
      Sign out other devices
    </Button>
  );
}
