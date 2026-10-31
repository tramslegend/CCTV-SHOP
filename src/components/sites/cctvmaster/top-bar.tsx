import Link from "next/link";
import type { LinkSetting } from "@/lib/homepage/schema";
import { isExternalHref } from "@/lib/navigation/links";
import { MapPinIcon, PhoneIcon } from "./icons";
import { CartLink } from "./site-header";

/**
 * Black strip above the header, switched on and filled in at /admin/content/navigation ("Top bar"). The phone number
 * and "Our Store" link come from Settings and are left out when empty or switched off; so is "Deliver to …".
 */
export function TopBar({
  phone,
  phoneHref,
  mapHref,
  deliverTo,
  links,
}: {
  phone: string;
  phoneHref: string;
  mapHref: string;
  deliverTo: string;
  links: LinkSetting[];
}) {
  return (
    <div className="w-full text-white bg-zinc-950">
      <div className="mx-auto flex h-10 max-w-450 items-center justify-between px-4 text-sm md:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {phoneHref && (
            <a
              href={phoneHref}
              className="hidden items-center gap-1.5 text-xs text-white/90 transition-colors hover:text-white md:flex"
            >
              <PhoneIcon className="h-3.5 w-3.5" />
              <span>{phone}</span>
            </a>
          )}
          {mapHref && (
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 text-xs text-white/90 transition-colors hover:text-white md:flex"
            >
              <MapPinIcon className="h-3.5 w-3.5" />
              <span>Our Store</span>
            </a>
          )}
          {deliverTo && (
            <Link className="flex h-auto items-center gap-2 px-2 py-1.5 text-sm font-normal transition-opacity hover:opacity-80 text-white" href="/delivery">
              <MapPinIcon className="h-4 w-4 shrink-0 opacity-80" />
              <span className="flex min-w-0 items-center gap-1.5 text-left">
                <span className="hidden text-xs opacity-70 sm:inline">Deliver to</span>
                <span className="font-medium">{deliverTo}</span>
              </span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          {phoneHref && (
            <a
              href={phoneHref}
              aria-label={`Call ${phone}`}
              className="flex h-6 w-6 items-center justify-center text-white/90 hover:text-white lg:hidden"
            >
              <PhoneIcon className="h-4 w-4" />
            </a>
          )}
          <div className="lg:hidden">
            <CartLink />
          </div>
          {links.map((link, i) =>
            isExternalHref(link.href) ? (
              <a key={i} className="hidden hover:underline md:inline" href={link.href}>
                {link.label}
              </a>
            ) : (
              <Link key={i} className="hidden hover:underline md:inline" href={link.href}>
                {link.label}
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
