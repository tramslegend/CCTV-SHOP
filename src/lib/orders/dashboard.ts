// Shapes server data for the account pages' client components. Server-only.
import type { DashboardAccount, DashboardAddress } from "@/components/sites/cctvmaster/account/dashboard-views";
import type { SavedAddress, ShopUser } from "./customer";

export const toDashboardAccount = (user: ShopUser): DashboardAccount => ({
  name: user.name,
  email: user.email,
  phone: user.phone ?? undefined,
  company: user.company ?? undefined,
  createdAt: new Date(user.createdAt).toISOString(),
  emailVerified: user.emailVerified,
});

export const toDashboardAddress = (a: SavedAddress): DashboardAddress => ({
  id: a.id,
  label: a.label ?? undefined,
  name: a.name,
  company: a.company ?? undefined,
  line1: a.line1,
  line2: a.line2 ?? undefined,
  city: a.city,
  county: a.county ?? undefined,
  postcode: a.postcode,
  phone: a.phone ?? undefined,
  isDefault: a.isDefault,
});
