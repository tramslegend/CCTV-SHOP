import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import type { FeatureIconName } from "@/lib/homepage/schema";
import { inlineParts, splitHighlight } from "@/lib/homepage/text";
import { isExternalHref } from "@/lib/navigation/links";
import {
  CircleCheckIcon,
  ClockIcon,
  HeadphonesIcon,
  LockIcon,
  MailIcon,
  PackageIcon,
  PhoneIcon,
  PoundSterlingIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StoreIcon,
  TruckIcon,
} from "./icons";

// Small helpers for owner-written homepage and navigation content (see /admin/content).

const FEATURE_ICONS: Record<FeatureIconName, ComponentType<SVGProps<SVGSVGElement>>> = {
  truck: TruckIcon,
  shield: ShieldCheckIcon,
  headphones: HeadphonesIcon,
  pound: PoundSterlingIcon,
  lock: LockIcon,
  clock: ClockIcon,
  package: PackageIcon,
  check: CircleCheckIcon,
  phone: PhoneIcon,
  mail: MailIcon,
  store: StoreIcon,
  sparkles: SparklesIcon,
};

/** Icon chosen in the admin for a trust point or footer highlight. */
export function FeatureIcon({ name, className }: { name: FeatureIconName; className?: string }) {
  const Icon = FEATURE_ICONS[name] ?? CircleCheckIcon;
  return <Icon className={className} />;
}

/** Internal links use the router; web, email and phone links a plain anchor. */
export function SmartLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  if (isExternalHref(href)) {
    const web = /^https?:/i.test(href);
    return (
      <a href={href} className={className} {...(web ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** Text with [inline](/links). */
export function InlineText({ text, linkClassName }: { text: string; linkClassName?: string }) {
  return (
    <>
      {inlineParts(text).map((part, i) =>
        part.kind === "text" ? (
          part.text
        ) : (
          <SmartLink key={i} href={part.href} className={linkClassName}>
            {part.text}
          </SmartLink>
        ),
      )}
    </>
  );
}

/** A heading with its highlighted phrase wrapped by `wrap`. */
export function Highlighted({ text, highlight, wrap }: { text: string; highlight: string; wrap: (phrase: string) => ReactNode }) {
  const parts = splitHighlight(text, highlight);
  if (!parts) return <>{text}</>;
  return (
    <>
      {parts[0]}
      {wrap(parts[1])}
      {parts[2]}
    </>
  );
}
