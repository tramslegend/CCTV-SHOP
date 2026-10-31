"use server";

// Discount code mutations for the back office. Every action: requireAdmin("marketing") → zod validation → database
// write → activity log entry → revalidate the marketing pages. A code that has been used (counted uses, paid orders or
// checkouts awaiting payment) can't be renamed or deleted, only switched off, so orders keep pointing at it.
import { revalidatePath } from "next/cache";
import { CI, db, insert, transaction } from "@/db";
import { logActivity, requireAdmin } from "@/lib/admin/session";
import { describeDiscount, ukDateInput } from "@/lib/discounts/rules";
import { blockingOrders, getCodeWithStats, setOncePerCustomer, type AdminCode } from "@/lib/discounts/service";
import { codeIdSchema, discountInputSchema, type DiscountFormValues, type DiscountInput } from "@/lib/discounts/validation";

export type DiscountActionResult =
  | { ok: true; message: string; id: number }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const fail = (message: string, fieldErrors?: Record<string, string>): DiscountActionResult => ({ ok: false, message, fieldErrors });

function fieldErrorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

function parse(values: DiscountFormValues) {
  const parsed = discountInputSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error.issues);
    return { error: fail("Please fix the highlighted fields.", fieldErrors) };
  }
  return { data: parsed.data };
}

/** Readable snapshot for the activity log. */
const auditView = (c: Pick<DiscountInput, "code" | "type" | "value" | "minSpend" | "maxUses" | "startsAt" | "endsAt" | "active" | "oncePerCustomer">) => ({
  code: c.code,
  discount: describeDiscount(c),
  minSpend: c.minSpend,
  startsOn: ukDateInput(c.startsAt) || null,
  endsOn: ukDateInput(c.endsAt) || null,
  maxUses: c.maxUses,
  oncePerCustomer: c.oncePerCustomer,
  active: c.active,
});

function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) out[key] = { from: before[key] ?? null, to: after[key] ?? null };
  }
  return out;
}

async function codeTaken(code: string, exceptId?: number) {
  // Codes are unique regardless of case (case-insensitive unique index).
  const row = await db.discountCodes.findOne(
    { code, ...(exceptId ? { _id: { $ne: exceptId } } : {}) },
    { collation: CI, projection: { _id: 1 } },
  );
  return !!row;
}

/** Duplicate key (MongoDB error 11000): the unique, case-insensitive code index refused it. */
const isUniqueViolation = (err: unknown) => typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === 11000;
const TAKEN = "Another discount code already uses this code (codes aren’t case-sensitive).";

function refresh(id?: number) {
  revalidatePath("/admin/marketing");
  if (id) revalidatePath(`/admin/marketing/${id}`);
}

const used = (c: AdminCode, holding: number) => c.uses > 0 || c.stats.orders > 0 || holding > 0;

export async function createDiscountCode(values: DiscountFormValues): Promise<DiscountActionResult> {
  const { user } = await requireAdmin("marketing");
  const { data, error } = parse(values);
  if (!data) return error;
  if (await codeTaken(data.code)) return fail(TAKEN, { code: TAKEN });
  try {
    const created = await transaction(async (session) => {
      const [row] = await insert(
        "discountCodes",
        {
          code: data.code,
          type: data.type,
          value: data.value,
          minSpend: data.minSpend,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          maxUses: data.maxUses,
          active: data.active,
        },
        { session },
      );
      if (data.oncePerCustomer) await setOncePerCustomer(session, row.id, true);
      return row;
    });
    await logActivity(user, "discount.create", "discount_code", created.id, auditView(data));
    refresh(created.id);
    return { ok: true, message: `Discount code ${created.code} created.`, id: created.id };
  } catch (err) {
    if (isUniqueViolation(err)) return fail(TAKEN, { code: TAKEN });
    throw err;
  }
}

export async function updateDiscountCode(id: number, values: DiscountFormValues): Promise<DiscountActionResult> {
  const { user } = await requireAdmin("marketing");
  if (!codeIdSchema.safeParse(id).success) return fail("Discount code not found.");
  const before = await getCodeWithStats(id);
  if (!before) return fail("Discount code not found. It may have been deleted.");
  const { data, error } = parse(values);
  if (!data) return error;

  if (data.code !== before.code.toUpperCase()) {
    const holding = await blockingOrders(before.code);
    if (used(before, holding)) {
      const message = "This code has been used on orders, so it can’t be renamed. Create a new code instead.";
      return fail(message, { code: message });
    }
    if (await codeTaken(data.code, id)) return fail(TAKEN, { code: TAKEN });
  }
  if (data.maxUses !== null && data.maxUses < before.uses) {
    const message = `It has already been used ${before.uses} ${before.uses === 1 ? "time" : "times"}, so the limit can’t be lower than that.`;
    return fail(message, { maxUses: message });
  }

  try {
    await transaction(async (session) => {
      await db.discountCodes.updateOne(
        { _id: id },
        {
          $set: {
            code: data.code,
            type: data.type,
            value: data.value,
            minSpend: data.minSpend,
            startsAt: data.startsAt,
            endsAt: data.endsAt,
            maxUses: data.maxUses,
            active: data.active,
            updatedAt: new Date(),
          },
        },
        { session },
      );
      await setOncePerCustomer(session, id, data.oncePerCustomer);
    });
  } catch (err) {
    if (isUniqueViolation(err)) return fail(TAKEN, { code: TAKEN });
    throw err;
  }
  const changes = diff(auditView(before), auditView(data));
  if (Object.keys(changes).length) await logActivity(user, "discount.update", "discount_code", id, changes);
  refresh(id);
  return { ok: true, message: Object.keys(changes).length ? `Saved ${data.code}.` : "No changes to save.", id };
}

export async function setDiscountCodeActive(id: number, active: boolean): Promise<DiscountActionResult> {
  const { user } = await requireAdmin("marketing");
  if (!codeIdSchema.safeParse(id).success || typeof active !== "boolean") return fail("Discount code not found.");
  const row = await db.discountCodes.findOneAndUpdate({ _id: id }, { $set: { active, updatedAt: new Date() } }, { returnDocument: "after" });
  if (!row) return fail("Discount code not found. It may have been deleted.");
  await logActivity(user, active ? "discount.activate" : "discount.deactivate", "discount_code", id, { code: row.code, active });
  refresh(id);
  return { ok: true, message: active ? `${row.code} is switched on.` : `${row.code} is switched off: customers can’t use it.`, id };
}

/** Deletes a code that has never been used; a used code can only be switched off. */
export async function deleteDiscountCode(id: number): Promise<DiscountActionResult> {
  const { user } = await requireAdmin("marketing");
  if (!codeIdSchema.safeParse(id).success) return fail("Discount code not found.");
  const code = await getCodeWithStats(id);
  if (!code) return fail("Discount code not found. It may have been deleted.");
  const holding = await blockingOrders(code.code);
  if (used(code, holding)) {
    return fail(`${code.code} has been used on orders, so it can’t be deleted (the orders refer to it). Switch it off instead.`);
  }
  await transaction(async (session) => {
    await db.discountCodes.deleteOne({ _id: id }, { session });
    await setOncePerCustomer(session, id, false);
  });
  await logActivity(user, "discount.delete", "discount_code", id, auditView({ ...code, oncePerCustomer: code.oncePerCustomer }));
  refresh();
  return { ok: true, message: `Deleted ${code.code}.`, id };
}
