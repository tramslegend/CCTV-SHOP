"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Power, PowerOff, Trash2 } from "lucide-react";
import { deleteDiscountCode, setDiscountCodeActive } from "@/app/admin/(panel)/marketing/actions";
import { toast } from "@/components/admin/toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Switch a code on/off, and delete it (only while it has never been used: otherwise the dialog explains why and
 * offers switching it off). `afterDelete` is where to go once deleted (the list when on the code's own page).
 */
export function DiscountCodeActions({
  id,
  code,
  active,
  used,
  size = "sm",
  afterDelete,
}: {
  id: number;
  code: string;
  active: boolean;
  /** Counted uses, paid orders or checkouts awaiting payment with this code. */
  used: boolean;
  size?: "sm" | "default";
  afterDelete?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const toggle = () =>
    start(async () => {
      try {
        const result = await setDiscountCodeActive(id, !active);
        if (result.ok) {
          toast.success(result.message);
          router.refresh();
        } else toast.error(result.message);
      } catch {
        toast.error("The code couldn’t be updated. Try again.");
      }
    });

  const remove = () =>
    start(async () => {
      try {
        const result = await deleteDiscountCode(id);
        setConfirm(false);
        if (!result.ok) return void toast.error(result.message);
        toast.success(result.message);
        if (afterDelete) router.push(afterDelete);
        else router.refresh();
      } catch {
        toast.error("The code couldn’t be deleted. Try again.");
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button type="button" variant="outline" size={size} onClick={toggle} disabled={pending} aria-label={`${active ? "Deactivate" : "Activate"} ${code}`}>
        {active ? <PowerOff /> : <Power />} {active ? "Deactivate" : "Activate"}
      </Button>
      <Button type="button" variant="outline" size={size} onClick={() => setConfirm(true)} disabled={pending} aria-label={`Delete ${code}`}>
        <Trash2 /> Delete
      </Button>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{used ? `${code} can’t be deleted` : `Delete ${code}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {used
                ? "It has been used on orders, and those orders refer to it. Deactivate it instead: customers can’t use it any more, and its history stays."
                : "Customers won’t be able to use this code. It has never been used, so no orders are affected. This can’t be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{used ? "Close" : "Cancel"}</AlertDialogCancel>
            {used ? (
              active && (
                <Button
                  type="button"
                  onClick={() => {
                    setConfirm(false);
                    toggle();
                  }}
                  disabled={pending}
                >
                  <PowerOff /> Deactivate instead
                </Button>
              )
            ) : (
              <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete code
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
