"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db, insert, transaction } from "@/db";
import { auth } from "@/lib/auth";
import { getShopSession } from "@/lib/orders/customer";
import { fieldErrors, normalisePhone, savedAddressSchema, type SavedAddressInput } from "@/lib/orders/validation";
import { PHONE_INVALID } from "@/lib/phone";

export type AccountActionResult = { ok: true; message: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function signedIn() {
  const session = await getShopSession();
  return session && !session.user.banned ? session.user : null;
}

const notSignedIn = { ok: false, error: "Please sign in again." } as const;

// ---------- profile ----------

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .transform((v, ctx) => {
      if (!v) return "";
      const phone = normalisePhone(v);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: PHONE_INVALID });
        return z.NEVER;
      }
      return phone;
    }),
  company: z.string().trim().max(120, "Please shorten the company name"),
});

/** Name, phone and company (Better Auth updateUser; email changes go through the shop). */
export async function updateProfile(input: z.input<typeof profileSchema>): Promise<AccountActionResult> {
  const user = await signedIn();
  if (!user) return notSignedIn;
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { name, phone, company } = parsed.data;
  await auth.api.updateUser({
    body: { name: name.replace(/\s+/g, " "), phone: phone || null, company: company.replace(/\s+/g, " ") || null },
    headers: await headers(),
  });
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Your details have been saved" };
}

// ---------- address book ----------

const MAX_ADDRESSES = 20;

export async function saveAddress(id: number | null, input: SavedAddressInput): Promise<AccountActionResult> {
  const user = await signedIn();
  if (!user) return notSignedIn;
  const parsed = savedAddressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const a = parsed.data;
  const values = {
    label: a.label ?? null,
    name: a.name,
    company: a.company ?? null,
    line1: a.line1,
    line2: a.line2 ?? null,
    city: a.city,
    county: a.county ?? null,
    postcode: a.postcode,
    phone: a.phone ?? null,
  };

  const existing = await db.addresses.find({ userId: user.id }, { projection: { _id: 1 } }).toArray();
  let savedId: number;
  if (id !== null) {
    if (!existing.some((e) => e._id === id)) return { ok: false, error: "That address no longer exists." };
    await db.addresses.updateOne({ _id: id, userId: user.id }, { $set: { ...values, updatedAt: new Date() } });
    savedId = id;
  } else {
    if (existing.length >= MAX_ADDRESSES) return { ok: false, error: `You can keep up to ${MAX_ADDRESSES} addresses.` };
    const [row] = await insert("addresses", { ...values, userId: user.id, isDefault: existing.length === 0 });
    savedId = row.id;
  }
  if (a.isDefault) await makeDefault(user.id, savedId);
  revalidatePath("/dashboard/addresses");
  return { ok: true, message: id !== null ? "Address updated" : "Address saved" };
}

async function makeDefault(userId: string, id: number) {
  await transaction(async (session) => {
    await db.addresses.updateMany({ userId, _id: { $ne: id } }, { $set: { isDefault: false, updatedAt: new Date() } }, { session });
    await db.addresses.updateOne({ userId, _id: id }, { $set: { isDefault: true, updatedAt: new Date() } }, { session });
  });
}

export async function setDefaultAddress(id: number): Promise<AccountActionResult> {
  const user = await signedIn();
  if (!user) return notSignedIn;
  await makeDefault(user.id, Number(id));
  revalidatePath("/dashboard/addresses");
  return { ok: true, message: "Default address updated" };
}

export async function deleteAddress(id: number): Promise<AccountActionResult> {
  const user = await signedIn();
  if (!user) return notSignedIn;
  const removed = await db.addresses.findOneAndDelete({ _id: Number(id), userId: user.id });
  if (removed?.isDefault) {
    const next = await db.addresses.findOne({ userId: user.id }, { projection: { _id: 1 } });
    if (next) await makeDefault(user.id, next._id);
  }
  revalidatePath("/dashboard/addresses");
  return { ok: true, message: "Address removed" };
}
