"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, stripId } from "@/db";
import { logActivity, requireAdmin } from "@/lib/admin/session";
import { sendCancelledEmail, sendDispatchEmail, sendOrderConfirmation, sendRefundEmail } from "@/lib/orders/emails";
import { round2 } from "@/lib/orders/pricing";
import {
  addOrderEvent,
  cancelUnpaidOrder,
  getOrderById,
  getOrderItems,
  refundOrder,
  restockOrder,
  type OrderRow,
} from "@/lib/orders/service";
import { CARRIERS, EVENT, STATUS_LABEL, type OrderStatus } from "@/lib/orders/status";

export type OrderActionResult = { ok: true; message: string } | { ok: false; error: string };

const fail = (error: string): OrderActionResult => ({ ok: false, error });

async function load(orderId: number) {
  const { user } = await requireAdmin("orders");
  const order = Number.isInteger(orderId) ? await getOrderById(orderId) : undefined;
  return { user, order };
}

function done(order: Pick<OrderRow, "id">, message: string): OrderActionResult {
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/customers", "layout");
  return { ok: true, message };
}

/** Moves an order on from one of `from` to `to`; false if someone else changed it first. */
async function transition(order: OrderRow, from: OrderStatus[], to: OrderStatus, extra: Partial<OrderRow> = {}) {
  // Conditional and atomic: only one of two simultaneous changes from the same status gets through.
  const row = await db.orders.findOneAndUpdate(
    { _id: order.id, status: { $in: from } },
    { $set: { ...extra, status: to, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return row ? stripId(row) : undefined;
}

const notAllowed = (order: OrderRow, what: string) => fail(`An order that is “${STATUS_LABEL[order.status]}” can’t be ${what}.`);

export async function markProcessing(orderId: number): Promise<OrderActionResult> {
  const { user, order } = await load(orderId);
  if (!order) return fail("Order not found.");
  const updated = await transition(order, ["paid"], "processing");
  if (!updated) return notAllowed(order, "marked as processing");
  await addOrderEvent(order.id, EVENT.processing, "Marked as processing (being picked and packed).", user.id);
  await logActivity(user, "order.processing", "order", order.id, { number: order.number, status: { from: order.status, to: "processing" } });
  return done(order, "Marked as processing.");
}

const dispatchSchema = z.object({
  carrier: z.enum(CARRIERS.map((c) => c.name) as [string, ...string[]], { message: "Choose the carrier." }),
  trackingNumber: z
    .string()
    .trim()
    .min(4, "Enter the tracking number.")
    .max(60)
    .regex(/^[A-Za-z0-9 -]+$/, "Tracking numbers only use letters, numbers, spaces and dashes."),
  notify: z.boolean().default(true),
});

export async function markDispatched(orderId: number, input: z.input<typeof dispatchSchema>): Promise<OrderActionResult> {
  const { user, order } = await load(orderId);
  if (!order) return fail("Order not found.");
  const parsed = dispatchSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the dispatch details.");
  const { carrier, notify } = parsed.data;
  const trackingNumber = parsed.data.trackingNumber.replace(/\s+/g, " ").toUpperCase();
  const updated = await transition(order, ["paid", "processing", "dispatched"], "dispatched", {
    carrier,
    trackingNumber,
    dispatchedAt: order.dispatchedAt ?? new Date(),
  });
  if (!updated) return notAllowed(order, "dispatched");
  const resend = order.status === "dispatched";
  await addOrderEvent(
    order.id,
    EVENT.dispatched,
    `${resend ? "Tracking updated" : "Dispatched"}: ${carrier}, tracking ${trackingNumber}.`,
    user.id,
  );
  let emailNote = "";
  if (notify) {
    const sent = await sendDispatchEmail(updated, await getOrderItems(order.id));
    await addOrderEvent(order.id, EVENT.email, sent.ok ? `Dispatch email sent to ${order.email}.` : `Dispatch email failed: ${sent.error}`, user.id);
    emailNote = sent.ok ? " The customer has been emailed." : " The email to the customer failed.";
  }
  await logActivity(user, resend ? "order.tracking" : "order.dispatch", "order", order.id, {
    number: order.number,
    carrier,
    trackingNumber,
    status: { from: order.status, to: "dispatched" },
  });
  return done(order, `${resend ? "Tracking updated." : "Marked as dispatched."}${emailNote}`);
}

export async function markDelivered(orderId: number): Promise<OrderActionResult> {
  const { user, order } = await load(orderId);
  if (!order) return fail("Order not found.");
  const updated = await transition(order, ["dispatched"], "delivered", { deliveredAt: new Date() });
  if (!updated) return notAllowed(order, "marked as delivered");
  await addOrderEvent(order.id, EVENT.delivered, "Marked as delivered.", user.id);
  await logActivity(user, "order.delivered", "order", order.id, { number: order.number, status: { from: order.status, to: "delivered" } });
  return done(order, "Marked as delivered.");
}

const reasonSchema = z.string().trim().max(300).optional();

/** Cancels an order. A paid order is refunded in full first (Stripe or recorded) and its stock can be returned. */
export async function cancelOrder(orderId: number, input: { reason?: string; restock?: boolean; notify?: boolean }): Promise<OrderActionResult> {
  const { user, order } = await load(orderId);
  if (!order) return fail("Order not found.");
  const reason = reasonSchema.parse(input.reason) || undefined;

  if (!order.paidAt) {
    const ok = await cancelUnpaidOrder(order.id, `Cancelled by the shop before payment.${reason ? ` Reason: ${reason}` : ""}`, user.id);
    if (!ok) return notAllowed(order, "cancelled");
    await logActivity(user, "order.cancel", "order", order.id, { number: order.number, reason, status: { from: order.status, to: "cancelled" } });
    return done(order, "Order cancelled.");
  }
  if (!["paid", "processing"].includes(order.status)) {
    return fail("Only orders that haven’t been dispatched can be cancelled. Use a refund instead.");
  }
  const remaining = round2(order.total - order.refundedAmount);
  let refunded = 0;
  if (remaining > 0) {
    const result = await refundOrder(order, remaining, { actorId: user.id, reason: reason ?? "Order cancelled" });
    if (!result.ok) return fail(result.error);
    refunded = result.amount;
  }
  const row = await db.orders.findOneAndUpdate(
    { _id: order.id },
    { $set: { status: "cancelled", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!row) throw new Error(`Order ${order.number} no longer exists, so it couldn’t be cancelled`);
  const updated = stripId(row);
  await addOrderEvent(order.id, EVENT.cancelled, `Cancelled by the shop.${reason ? ` Reason: ${reason}` : ""}`, user.id);
  if (input.restock) await restockOrder(order.id);
  if (input.notify !== false) {
    const sent = await sendCancelledEmail(updated, refunded);
    await addOrderEvent(order.id, EVENT.email, sent.ok ? `Cancellation email sent to ${order.email}.` : `Cancellation email failed: ${sent.error}`, user.id);
  }
  await logActivity(user, "order.cancel", "order", order.id, {
    number: order.number,
    reason,
    refunded,
    restocked: !!input.restock,
    status: { from: order.status, to: "cancelled" },
  });
  return done(order, refunded > 0 ? `Order cancelled and £${refunded.toFixed(2)} refunded.` : "Order cancelled.");
}

export async function refund(
  orderId: number,
  input: { amount: number; reason?: string; restock?: boolean; notify?: boolean },
): Promise<OrderActionResult> {
  const { user, order } = await load(orderId);
  if (!order) return fail("Order not found.");
  if (order.status === "refunded") return fail("This order has already been refunded in full.");
  const reason = reasonSchema.parse(input.reason) || undefined;
  const amount = Number(input.amount);
  if (!Number.isFinite(amount)) return fail("Enter the amount to refund.");
  const result = await refundOrder(order, amount, { actorId: user.id, reason });
  if (!result.ok) return fail(result.error);
  if (input.restock) await restockOrder(order.id);
  if (input.notify !== false) {
    const sent = await sendRefundEmail(result.order, result.amount);
    await addOrderEvent(order.id, EVENT.email, sent.ok ? `Refund email sent to ${order.email}.` : `Refund email failed: ${sent.error}`, user.id);
  }
  await logActivity(user, "order.refund", "order", order.id, {
    number: order.number,
    amount: result.amount,
    reason,
    restocked: !!input.restock,
    provider: order.paymentProvider,
    ...(result.order.status !== order.status ? { status: { from: order.status, to: result.order.status } } : {}),
  });
  return done(order, `Refunded £${result.amount.toFixed(2)}${order.paymentProvider === "stripe" ? " through Stripe" : ""}.`);
}

export async function addNote(orderId: number, note: string): Promise<OrderActionResult> {
  const { user, order } = await load(orderId);
  if (!order) return fail("Order not found.");
  const text = z.string().trim().min(1, "Write the note first.").max(2000).safeParse(note);
  if (!text.success) return fail(text.error.issues[0]?.message ?? "Write the note first.");
  await db.orders.updateOne({ _id: order.id }, { $set: { internalNote: text.data, updatedAt: new Date() } });
  await addOrderEvent(order.id, EVENT.note, text.data, user.id);
  await logActivity(user, "order.note", "order", order.id, { number: order.number, note: text.data });
  return done(order, "Note added.");
}

export async function resendConfirmation(orderId: number): Promise<OrderActionResult> {
  const { user, order } = await load(orderId);
  if (!order) return fail("Order not found.");
  if (!order.paidAt) return fail("The confirmation is only sent for paid orders.");
  const sent = await sendOrderConfirmation(order, await getOrderItems(order.id));
  await addOrderEvent(
    order.id,
    EVENT.email,
    sent.ok ? `Order confirmation re-sent to ${order.email}.` : `Re-sending the confirmation failed: ${sent.error}`,
    user.id,
  );
  await logActivity(user, "order.resend_confirmation", "order", order.id, { number: order.number, email: order.email, ok: sent.ok });
  return sent.ok ? done(order, `Confirmation re-sent to ${order.email}.`) : fail(`The email couldn’t be sent: ${sent.error}`);
}
