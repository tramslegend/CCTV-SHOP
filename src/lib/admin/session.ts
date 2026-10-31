// Server-side guards for the back office. Every admin page and server action must call requireAdmin(area):
// the proxy only does an optimistic cookie check, this is the real authorisation.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, insert } from "@/db";
import { auth } from "@/lib/auth";
import { type AdminArea, canAccess, isBackOffice } from "./permissions";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Signed-in back-office user allowed into `area`; otherwise redirects to the admin login or the no-access page. */
export async function requireAdmin(area: AdminArea) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const role = session.user.role;
  if (!isBackOffice(role) || session.user.banned) redirect("/admin/login?error=not-staff");
  if (!canAccess(role, area)) redirect(`/admin/no-access?area=${area}`);
  return { user: session.user, role };
}

export type AdminUser = Awaited<ReturnType<typeof requireAdmin>>["user"];

/** Records a back-office change in the activity log. */
export async function logActivity(
  actor: Pick<AdminUser, "id" | "email">,
  action: string,
  entity: string,
  entityId: string | number | null,
  changes?: Record<string, unknown>,
) {
  await insert("auditLog", {
    actorId: actor.id,
    actorEmail: actor.email,
    action,
    entity,
    entityId: entityId === null ? null : String(entityId),
    changes: changes ?? null,
  });
}

/**
 * After a catalogue/content change: tells every storefront instance to reload its snapshot on the next request and
 * refreshes pages that were prerendered at build time. Call from server actions only.
 */
export async function bumpCatalogVersion() {
  await db.catalogState.updateOne(
    { _id: 1 },
    { $inc: { version: 1 }, $set: { updatedAt: new Date() }, $setOnInsert: { id: 1 } },
    { upsert: true },
  );
  revalidatePath("/", "layout");
}
