"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { logActivity, requireAdmin } from "@/lib/admin/session";
import { auth } from "@/lib/auth";

export type CustomerActionResult = { ok: true; message: string } | { ok: false; error: string };

/** Blocks or restores a shop customer's account (Better Auth admin API). The owner account can't be blocked here. */
export async function setCustomerBlocked(userId: string, blocked: boolean, reason?: string): Promise<CustomerActionResult> {
  const { user: me } = await requireAdmin("customers");
  const doc = await db.users.findOne({ _id: String(userId) }, { projection: { _id: 1, email: 1, role: 1 } });
  if (!doc) return { ok: false, error: "That account no longer exists." };
  // Auth documents keep the id in `_id`; no stored role means a customer (the old column default).
  const target = { id: doc._id, email: doc.email, role: doc.role ?? "customer" };
  if (target.role !== "customer" || target.id === me.id) return { ok: false, error: "The shop owner account can’t be blocked here." };
  const why = z.string().trim().max(200).optional().parse(reason) || "Blocked by the shop";
  const h = await headers();
  if (blocked) {
    await auth.api.banUser({ body: { userId: target.id, banReason: why }, headers: h });
  } else {
    await auth.api.unbanUser({ body: { userId: target.id }, headers: h });
  }
  await logActivity(me, blocked ? "customer.block" : "customer.unblock", "user", target.id, {
    email: target.email,
    ...(blocked ? { reason: why } : {}),
  });
  revalidatePath("/admin/customers", "layout");
  return { ok: true, message: blocked ? "Account blocked and signed out everywhere." : "Account restored." };
}
