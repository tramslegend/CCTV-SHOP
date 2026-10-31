"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Ban, CheckCheck, FileText, Mail, PackageCheck, Printer, ReceiptText, RotateCcw, Truck } from "lucide-react";
import {
  addNote,
  cancelOrder,
  markDelivered,
  markDispatched,
  markProcessing,
  refund,
  resendConfirmation,
  type OrderActionResult,
} from "@/app/admin/(panel)/orders/actions";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { CARRIERS, type OrderStatus } from "@/lib/orders/status";

export interface OrderActionsProps {
  orderId: number;
  status: OrderStatus;
  paid: boolean;
  provider: string | null;
  remaining: number;
  carrier: string | null;
  trackingNumber: string | null;
  hasTrackedStock: boolean;
}

const selectClass = "border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm";

function useRun(onDone?: (result: OrderActionResult) => void) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<OrderActionResult | null>(null);
  const run = (action: () => Promise<OrderActionResult>, onOk?: () => void) =>
    start(async () => {
      try {
        const r = await action();
        setResult(r);
        if (r.ok) {
          onOk?.();
          onDone?.(r);
          router.refresh();
        }
      } catch {
        setResult({ ok: false, error: "Something went wrong. Please try again." });
      }
    });
  return { pending, result, run, setResult };
}

function Notice({ result }: { result: OrderActionResult | null }) {
  if (!result) return null;
  return (
    <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>
      {result.ok ? result.message : result.error}
    </p>
  );
}

function ActionDialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function OrderActions(props: OrderActionsProps) {
  const { orderId, status, paid, provider, remaining, hasTrackedStock } = props;
  const main = useRun();
  const canDispatch = status === "paid" || status === "processing";
  const canCancel = status === "pending_payment" || status === "paid" || status === "processing";
  const canRefund = paid && remaining > 0 && status !== "pending_payment";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {status === "paid" && (
          <Button disabled={main.pending} onClick={() => main.run(() => markProcessing(orderId))}>
            <PackageCheck /> Mark processing
          </Button>
        )}
        {canDispatch && <DispatchDialog {...props} onResult={main.setResult} />}
        {status === "dispatched" && (
          <>
            <Button disabled={main.pending} onClick={() => main.run(() => markDelivered(orderId))}>
              <CheckCheck /> Mark delivered
            </Button>
            <DispatchDialog {...props} onResult={main.setResult} update />
          </>
        )}
        {canRefund && <RefundDialog orderId={orderId} remaining={remaining} provider={provider} hasTrackedStock={hasTrackedStock} onResult={main.setResult} />}
        {canCancel && (
          <CancelDialog orderId={orderId} paid={paid} remaining={remaining} provider={provider} hasTrackedStock={hasTrackedStock} onResult={main.setResult} />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <NoteDialog orderId={orderId} onResult={main.setResult} />
        {paid && (
          <Button variant="outline" disabled={main.pending} onClick={() => main.run(() => resendConfirmation(orderId))}>
            <Mail /> Resend confirmation
          </Button>
        )}
        <a href={`/admin/orders/${orderId}/packing-slip`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
          <Printer /> Packing slip
        </a>
        {paid && (
          <a href={`/admin/orders/${orderId}/invoice`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            <ReceiptText /> VAT invoice
          </a>
        )}
      </div>
      <Notice result={main.result} />
    </div>
  );
}

function DispatchDialog({
  orderId,
  carrier,
  trackingNumber,
  update,
  onResult,
}: OrderActionsProps & { update?: boolean; onResult: (r: OrderActionResult) => void }) {
  const [open, setOpen] = useState(false);
  const { pending, result, run } = useRun(onResult);
  return (
    <ActionDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <>
          <Truck /> {update ? "Update tracking" : "Mark dispatched"}
        </>
      }
      title={update ? "Update tracking" : "Mark as dispatched"}
      description="The customer gets an email with the tracking number and a link to follow the parcel."
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          run(
            () =>
              markDispatched(orderId, {
                carrier: String(form.get("carrier") ?? ""),
                trackingNumber: String(form.get("tracking") ?? ""),
                notify: form.get("notify") === "on",
              }),
            () => setOpen(false),
          );
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dispatch-carrier">Carrier</Label>
          <select id="dispatch-carrier" name="carrier" defaultValue={carrier ?? "Royal Mail"} className={selectClass}>
            {CARRIERS.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dispatch-tracking">Tracking number</Label>
          <Input id="dispatch-tracking" name="tracking" required defaultValue={trackingNumber ?? ""} autoComplete="off" className="font-mono uppercase" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="notify" defaultChecked className="size-4" /> Email the customer
        </label>
        <Notice result={result?.ok ? null : result} />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Close</DialogClose>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : update ? "Save tracking" : "Mark dispatched"}
          </Button>
        </DialogFooter>
      </form>
    </ActionDialog>
  );
}

function RefundDialog({
  orderId,
  remaining,
  provider,
  hasTrackedStock,
  onResult,
}: {
  orderId: number;
  remaining: number;
  provider: string | null;
  hasTrackedStock: boolean;
  onResult: (r: OrderActionResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const { pending, result, run } = useRun(onResult);
  return (
    <ActionDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <>
          <RotateCcw /> Refund
        </>
      }
      title="Refund"
      description={
        provider === "stripe"
          ? "The money goes back to the customer’s card through Stripe. It can’t be undone."
          : provider === "test"
            ? "This order was paid with the local test payment, so the refund is recorded only."
            : "No online payment is recorded, so the refund is recorded only. Return the money yourself."
      }
    >
      <form
        key={remaining.toFixed(2)}
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          run(
            () =>
              refund(orderId, {
                amount: Number(form.get("amount")),
                reason: String(form.get("reason") ?? ""),
                restock: form.get("restock") === "on",
                notify: form.get("notify") === "on",
              }),
            () => setOpen(false),
          );
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="refund-amount">Amount (£, inc. VAT)</Label>
          <Input id="refund-amount" name="amount" type="number" step="0.01" min="0.01" max={remaining.toFixed(2)} defaultValue={remaining.toFixed(2)} required />
          <p className="text-muted-foreground text-xs">Up to £{remaining.toFixed(2)}. A full refund marks the order refunded.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="refund-reason">Reason (internal)</Label>
          <Input id="refund-reason" name="reason" maxLength={300} placeholder="e.g. Returned unopened" />
        </div>
        {hasTrackedStock && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="restock" className="size-4" /> Put the items back in stock
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="notify" defaultChecked className="size-4" /> Email the customer
        </label>
        <Notice result={result?.ok ? null : result} />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Close</DialogClose>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Refunding…" : "Refund"}
          </Button>
        </DialogFooter>
      </form>
    </ActionDialog>
  );
}

function CancelDialog({
  orderId,
  paid,
  remaining,
  provider,
  hasTrackedStock,
  onResult,
}: {
  orderId: number;
  paid: boolean;
  remaining: number;
  provider: string | null;
  hasTrackedStock: boolean;
  onResult: (r: OrderActionResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const { pending, result, run } = useRun(onResult);
  return (
    <ActionDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <>
          <Ban /> Cancel order
        </>
      }
      title="Cancel this order?"
      description={
        paid
          ? `It has been paid, so £${remaining.toFixed(2)} is refunded first${provider === "stripe" ? " through Stripe" : " (recorded only)"}.`
          : "It hasn’t been paid yet. The payment page is closed so it can’t be paid later."
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          run(
            () =>
              cancelOrder(orderId, {
                reason: String(form.get("reason") ?? ""),
                restock: form.get("restock") === "on",
                notify: form.get("notify") === "on",
              }),
            () => setOpen(false),
          );
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cancel-reason">Reason (internal)</Label>
          <Input id="cancel-reason" name="reason" maxLength={300} placeholder="e.g. Customer changed their mind" />
        </div>
        {paid && hasTrackedStock && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="restock" defaultChecked className="size-4" /> Put the items back in stock
          </label>
        )}
        {paid && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notify" defaultChecked className="size-4" /> Email the customer
          </label>
        )}
        <Notice result={result?.ok ? null : result} />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Keep order</DialogClose>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Cancelling…" : paid ? "Cancel and refund" : "Cancel order"}
          </Button>
        </DialogFooter>
      </form>
    </ActionDialog>
  );
}

function NoteDialog({ orderId, onResult }: { orderId: number; onResult: (r: OrderActionResult) => void }) {
  const [open, setOpen] = useState(false);
  const { pending, result, run } = useRun(onResult);
  return (
    <ActionDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <>
          <FileText /> Add note
        </>
      }
      title="Internal note"
      description="Only the shop sees notes. They appear in the order timeline."
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const note = String(new FormData(e.currentTarget).get("note") ?? "");
          run(() => addNote(orderId, note), () => setOpen(false));
        }}
      >
        <Textarea name="note" rows={4} maxLength={2000} required aria-label="Note" />
        <Notice result={result?.ok ? null : result} />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Close</DialogClose>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Add note"}
          </Button>
        </DialogFooter>
      </form>
    </ActionDialog>
  );
}
