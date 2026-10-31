// The back office is controlled by one person: the shop owner. Every admin area requires the owner role.
import type { UserRole } from "@/db/schema";

export const ADMIN_AREAS = [
  "dashboard",
  "products",
  "categories",
  "orders",
  "customers",
  "content",
  "messages",
  "marketing",
  "media",
  "settings",
  "account",
  "activity",
] as const;
export type AdminArea = (typeof ADMIN_AREAS)[number];

export const isBackOffice = (role: string | null | undefined): role is Extract<UserRole, "owner"> => role === "owner";

/** Whether `role` may open a back-office area: only the owner, and only areas that exist. */
export const canAccess = (role: string | null | undefined, area: AdminArea): boolean =>
  isBackOffice(role) && ADMIN_AREAS.includes(area);
