import { Headphones, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ShopLogo } from "../shop-info";
import { cardShadow, eyebrow } from "./styles";

const trust = [
  { label: "Secure", Icon: ShieldCheck },
  { label: "Same-day dispatch", Icon: Truck },
  { label: "UK support", Icon: Headphones },
];

/**
 * Centred card on zinc-50 used by /login, /signup, /forgot-password and /reset-password.
 * `variant` mirrors the small differences between the source pages (width, logo, trust strip).
 */
export function AuthShell({
  variant,
  children,
}: {
  variant: "login" | "signup" | "plain";
  children: ReactNode;
}) {
  const Outer = variant === "signup" ? "section" : "div";
  const decorated = variant !== "plain";
  return (
    <Outer
      className={cn(
        "flex items-center justify-center bg-zinc-50 px-6 py-16",
        variant !== "signup" && "min-h-[calc(100vh-200px)]",
      )}
    >
      <div className={cn("w-full", variant === "signup" ? "max-w-[440px]" : "max-w-[420px]")}>
        {decorated && (
          <Link
            className="mx-auto mb-8 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:outline-none"
            href="/"
          >
            <ShopLogo width={180} height={48} className="h-11 w-auto" textClassName="text-2xl" />
          </Link>
        )}
        <div className={cn("rounded-xl border border-zinc-200 bg-white p-8", cardShadow)}>{children}</div>
        {decorated && (
          <ul className="mt-7 flex items-center justify-center gap-x-5 gap-y-2 text-zinc-500">
            {trust.map(({ label, Icon }) => (
              <li key={label} className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase">
                <Icon className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Outer>
  );
}

export function AuthHeading({ kicker, title, lede }: { kicker: string; title: string; lede: string }) {
  return (
    <>
      <p className={eyebrow}>
        <span aria-hidden="true" className="h-px w-6 bg-emerald-700" />
        {kicker}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-balance text-zinc-950">{title}</h1>
      <p className="mt-1.5 text-sm text-zinc-500">{lede}</p>
    </>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <span className="h-px flex-1 bg-zinc-100" />
      <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-400 uppercase">{label}</span>
      <span className="h-px flex-1 bg-zinc-100" />
    </div>
  );
}
