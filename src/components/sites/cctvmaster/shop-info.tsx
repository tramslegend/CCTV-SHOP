"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { ShopInfo } from "@/lib/settings/format";
import { BrandLogo } from "./brand-logo";

// The shop's public name, logo and contact details for client components deep in the tree (contact, trade and
// enquiry forms, checkout, sign-in pages). SiteShell loads them from Settings on the server and passes them in as the
// provider's value.

const EMPTY: ShopInfo = { name: "Shop", logoUrl: "", phone: "", phoneHref: "", phoneCountry: "GB", email: "", city: "" };

const ShopInfoContext = createContext<ShopInfo>(EMPTY);

export function ShopInfoProvider({ value, children }: { value: ShopInfo; children: ReactNode }) {
  return <ShopInfoContext.Provider value={value}>{children}</ShopInfoContext.Provider>;
}

export const useShopInfo = () => useContext(ShopInfoContext);

/** "Please try again, or call us on 020 …" — falling back to the email, or just "Please try again". */
export const tryAgainMessage = (info: ShopInfo) =>
  `Sorry — we couldn't send that just now. Please try again${info.phone ? `, or call us on ${info.phone}` : info.email ? `, or email ${info.email}` : ""}.`;

/** Inline link to the shop's phone number, or nothing when none is set. */
export function PhoneLink({ className, children }: { className?: string; children?: ReactNode }) {
  const info = useShopInfo();
  if (!info.phoneHref) return null;
  return (
    <a className={className} href={info.phoneHref}>
      {children ?? info.phone}
    </a>
  );
}

/** The shop's logo (or name) from Settings, for components rendered inside SiteShell. */
export function ShopLogo(props: { width: number; height: number; className?: string; textClassName?: string }) {
  const info = useShopInfo();
  return <BrandLogo name={info.name} logoUrl={info.logoUrl} {...props} />;
}
