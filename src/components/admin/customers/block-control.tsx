"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldBan, ShieldCheck } from "lucide-react";
import { setCustomerBlocked, type CustomerActionResult } from "@/app/admin/(panel)/customers/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BlockControl({ userId, banned }: { userId: string; banned: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<CustomerActionResult | null>(null);

  const run = (blocked: boolean, reason?: string) =>
    start(async () => {
      const r = await setCustomerBlocked(userId, blocked, reason);
      setResult(r);
      if (r.ok) {
        setOpen(false);
        router.refresh();
      }
    });

  const notice = result && (
    <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>
      {result.ok ? result.message : result.error}
    </p>
  );

  if (banned) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" disabled={pending} onClick={() => run(false)}>
          <ShieldCheck /> Restore account
        </Button>
        {notice}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="destructive" />}>
          <ShieldBan /> Block account
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block this account?</DialogTitle>
            <DialogDescription>
              They’re signed out everywhere and can’t sign in until you restore the account. Their orders are kept.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(true, String(new FormData(e.currentTarget).get("reason") ?? ""));
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block-reason">Reason (internal)</Label>
              <Input id="block-reason" name="reason" maxLength={200} placeholder="e.g. Repeated chargebacks" />
            </div>
            {notice}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>Keep active</DialogClose>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Blocking…" : "Block account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {!open && notice}
    </div>
  );
}
