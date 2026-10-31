"use server";

// Admin inbox actions: status changes, internal notes and in-app replies. Every change is logged.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import type { EnquiryRow } from "@/db/schema";
import { logActivity, requireAdmin } from "@/lib/admin/session";
import { sendEnquiryReply } from "@/lib/enquiries/emails";
import { ENQUIRY_STATUSES, type EnquiryNote, STATUS_LABEL } from "@/lib/enquiries/types";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const idSchema = z.coerce.number().int().positive();

async function load(id: unknown) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return null;
  return db.enquiries.findOne({ _id: parsed.data });
}

function refresh(id: number) {
  revalidatePath("/admin/messages");
  revalidatePath(`/admin/messages/${id}`);
}

/** Appends a note to details.notes in one statement, so two people adding notes at once can't overwrite each other. */
async function appendNote(id: number, note: EnquiryNote, extra?: Partial<EnquiryRow>) {
  // An update pipeline: values are wrapped in $literal so text starting with "$" isn't read as a field name.
  const set = Object.fromEntries(Object.entries(extra ?? {}).map(([key, value]) => [key, { $literal: value }]));
  await db.enquiries.updateOne({ _id: id }, [
    {
      $set: {
        ...set,
        details: {
          $mergeObjects: [
            { $ifNull: ["$details", {}] },
            { notes: { $concatArrays: [{ $ifNull: ["$details.notes", []] }, [{ $literal: note }]] } },
          ],
        },
        updatedAt: new Date(),
      },
    },
  ]);
}

export async function setEnquiryStatus(id: number, status: string): Promise<ActionResult> {
  const { user } = await requireAdmin("messages");
  const parsed = z.enum(ENQUIRY_STATUSES).safeParse(status);
  if (!parsed.success) return { ok: false, error: "Unknown status." };
  const row = await load(id);
  if (!row) return { ok: false, error: "That message no longer exists." };
  if (row.status === parsed.data) return { ok: true, message: `Already ${STATUS_LABEL[row.status].toLowerCase()}.` };

  await db.enquiries.updateOne({ _id: row.id }, { $set: { status: parsed.data, updatedAt: new Date() } });
  await logActivity(user, "enquiry.status", "enquiry", row.id, {
    status: { from: row.status, to: parsed.data },
    subject: row.subject,
  });
  refresh(row.id);
  const message = parsed.data === "closed" ? "Closed." : row.status === "closed" ? "Reopened." : `Marked ${STATUS_LABEL[parsed.data].toLowerCase()}.`;
  return { ok: true, message };
}

const noteSchema = z.string().trim().min(1, "Write a note first.").max(5000, "Keep notes under 5,000 characters.");

export async function addEnquiryNote(id: number, text: string): Promise<ActionResult> {
  const { user } = await requireAdmin("messages");
  const parsed = noteSchema.safeParse(text);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const row = await load(id);
  if (!row) return { ok: false, error: "That message no longer exists." };

  await appendNote(row.id, { at: new Date().toISOString(), by: user.name || user.email, text: parsed.data });
  await logActivity(user, "enquiry.note", "enquiry", row.id, { note: parsed.data.slice(0, 200) });
  refresh(row.id);
  return { ok: true, message: "Note added." };
}

const replySchema = z.object({
  subject: z.string().trim().min(1, "Add a subject.").max(200, "Keep the subject under 200 characters."),
  text: z.string().trim().min(1, "Write your reply first.").max(20000, "That reply is too long to send."),
  close: z.boolean().optional().default(false),
});

export async function replyToEnquiry(
  id: number,
  input: { subject: string; text: string; close?: boolean },
): Promise<ActionResult> {
  const { user } = await requireAdmin("messages");
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const row = await load(id);
  if (!row) return { ok: false, error: "That message no longer exists." };
  const { subject, text, close } = parsed.data;

  const sent = await sendEnquiryReply({
    to: row.email,
    name: row.name,
    subject,
    text,
    original: row.message,
    sender: user.name || user.email,
  });
  if (!sent.ok) return { ok: false, error: `The email couldn't be sent: ${sent.error}. Nothing was recorded — try again or reply from your email app.` };

  const nextStatus = close ? "closed" : row.status === "new" ? "open" : row.status;
  await appendNote(
    row.id,
    { at: new Date().toISOString(), by: user.name || user.email, text, kind: "reply", subject },
    nextStatus !== row.status ? { status: nextStatus } : undefined,
  );
  await logActivity(user, "enquiry.reply", "enquiry", row.id, {
    to: row.email,
    subject,
    ...(nextStatus !== row.status && { status: { from: row.status, to: nextStatus } }),
  });
  refresh(row.id);
  return { ok: true, message: close ? `Reply sent to ${row.email} and message closed.` : `Reply sent to ${row.email}.` };
}
