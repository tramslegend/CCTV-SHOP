import type { CtaSection } from "@/lib/homepage/schema";
import { fillTokens, type TokenValues } from "@/lib/homepage/text";
import { type NavigationSettings, PAYMENT_MARKS } from "@/lib/navigation/schema";
import { addressLine, mapHref, telHref } from "@/lib/settings/format";
import type { SocialSettings, StoreSettings } from "@/lib/settings/schema";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";
import { FeatureIcon, Highlighted, SmartLink } from "./feature-icon";
import { ArrowRightIcon, MailIcon, MapPinIcon, PhoneIcon } from "./icons";

const SOCIAL_LABELS: Record<keyof SocialSettings, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

const outlineButton =
  "inline-flex h-11 items-center gap-2 rounded-md border-2 border-ink/70 px-5 text-sm font-semibold text-ink transition-all hover:border-ink hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-gold focus-visible:outline-none";

export function CtaBand({ section, tokens }: { section: CtaSection; tokens: TokenValues }) {
  const t = (text: string) => fillTokens(text, tokens);
  const [first, ...rest] = section.buttons;
  return (
    // Gold call-to-action strip with navy text and buttons (navy on gold is 7.4:1), just before the navy footer.
    <section className="relative overflow-hidden bg-linear-to-r from-gold via-gold-hover to-[#f0a23a] text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_85%_90%,rgba(242,112,79,0.25),transparent_50%)]"
      />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:gap-8 md:px-6 md:py-16">
        <div className="max-w-2xl">
          {section.eyebrow && (
            <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.18em] text-ink/80 uppercase">{t(section.eyebrow)}</p>
          )}
          <p className="font-sentient text-2xl leading-[1.15] font-semibold tracking-tight text-ink [font-variation-settings:'opsz'_28] md:text-[2rem]">
            <Highlighted
              text={t(section.headline)}
              highlight={t(section.highlight)}
              wrap={(phrase) => <span className="underline decoration-ink/35 decoration-4 underline-offset-[6px]">{phrase}</span>}
            />
          </p>
          {section.text && <p className="mt-3 text-sm leading-relaxed text-ink/80">{t(section.text)}</p>}
        </div>
        {first && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="fc-press">
              <SmartLink
                className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(19,34,56,0.8)] transition-colors hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-gold focus-visible:outline-none"
                href={first.href}
              >
                {t(first.label)}
                <ArrowRightIcon className="h-4 w-4" />
              </SmartLink>
            </div>
            {rest.map((button, i) => (
              <div key={i} className="fc-press">
                <SmartLink className={outlineButton} href={button.href}>
                  {t(button.label)}
                </SmartLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const highlightColumns = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3"];
const linkColumns = ["", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4", "md:grid-cols-5"];

/**
 * Footer: highlights, link columns, payment marks and bottom line from /admin/content/navigation; brand, contact
 * details and social links from Settings (each hidden when empty).
 */
export function SiteFooter({
  store,
  social,
  footer,
  tokens,
}: {
  store: StoreSettings;
  social: SocialSettings;
  footer: NavigationSettings["footer"];
  tokens: TokenValues;
}) {
  const t = (text: string) => fillTokens(text, tokens);
  const phoneHref = telHref(store.phone);
  const address = addressLine(store.address);
  const map = mapHref(store);
  const socialLinks = (Object.keys(SOCIAL_LABELS) as (keyof SocialSettings)[]).filter((k) => social[k]);
  const payments = PAYMENT_MARKS.filter((m) => footer.payments.includes(m.id));
  const columns = footer.columns.filter((c) => c.title || c.links.length);
  return (
    <footer className="bg-ink text-slate-300">
      {footer.highlights.length > 0 && (
        <div className="border-y border-white/10 bg-white/5">
          <div className={cn("mx-auto grid max-w-7xl grid-cols-1 gap-px overflow-hidden text-sm", highlightColumns[footer.highlights.length])}>
            {footer.highlights.map((item, i) => (
              <div key={i} className="flex items-center gap-4 bg-ink px-6 py-5 sm:bg-transparent">
                <FeatureIcon name={item.icon} className="h-5 w-5 shrink-0 text-amber-300" />
                <div>
                  <p className="font-semibold text-white">{t(item.title)}</p>
                  {item.detail && <p className="text-xs text-slate-400">{t(item.detail)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-8 border-b border-white/10 py-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <BrandLogo
              name={store.name}
              logoUrl={store.logoUrl}
              logoDarkUrl={store.logoDarkUrl}
              onDark
              alt={`${store.name} logo`}
              width={180}
              height={56}
              className="h-11 w-auto"
              textClassName="text-2xl"
            />
            {store.tagline && (
              <p className="font-sentient mt-4 max-w-md text-base leading-relaxed tracking-tight text-slate-300">{store.tagline}</p>
            )}
            {socialLinks.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${store.name} on social media`}>
                {socialLinks.map((key) => (
                  <li key={key}>
                    <a
                      href={social[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center rounded-md border border-white/15 px-3 text-xs font-medium text-slate-300 transition-colors hover:border-brand-400/60 hover:text-white"
                    >
                      {SOCIAL_LABELS[key]}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ul className="space-y-2.5 text-sm md:text-right">
            {phoneHref && (
              <li>
                <a
                  href={phoneHref}
                  className="inline-flex items-center gap-2 text-base font-semibold text-white transition-colors hover:text-brand-400"
                >
                  <PhoneIcon className="h-3.5 w-3.5 text-brand-400" />
                  {store.phone}
                </a>
              </li>
            )}
            {store.email && (
              <li>
                <a
                  href={`mailto:${store.email}`}
                  className="inline-flex items-center gap-2 text-slate-300 transition-colors hover:text-white"
                >
                  <MailIcon className="h-3.5 w-3.5 text-brand-400" />
                  {store.email}
                </a>
              </li>
            )}
            {address && (
              <li>
                {map ? (
                  <a
                    href={map}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
                  >
                    <MapPinIcon className="h-3.5 w-3.5 text-brand-400" />
                    {address}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 text-slate-400">
                    <MapPinIcon className="h-3.5 w-3.5 text-brand-400" />
                    {address}
                  </span>
                )}
              </li>
            )}
          </ul>
        </div>
        {columns.length > 0 && (
          <div className={cn("grid grid-cols-2 gap-x-6 gap-y-10 py-14", linkColumns[columns.length])}>
            {columns.map((column, i) => (
              <div key={i}>
                {column.title && (
                  <p className="mb-5 font-mono text-[10px] font-medium tracking-[0.18em] text-slate-400 uppercase">{t(column.title)}</p>
                )}
                <ul className="space-y-2.5 text-sm">
                  {column.links.map((link, j) => (
                    <li key={j}>
                      <SmartLink
                        className="text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white focus-visible:underline"
                        href={link.href}
                      >
                        {t(link.label)}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div
          className={cn(
            "flex flex-col items-start gap-5 py-8 text-xs sm:flex-row sm:items-center sm:justify-between",
            columns.length > 0 && "border-t border-white/10",
          )}
        >
          {footer.bottomText && <p className="font-mono text-[10px] tracking-[0.18em] text-slate-400 uppercase">{t(footer.bottomText)}</p>}
          {payments.length > 0 && (
            <ul className="flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
              {payments.map((method) => (
                <li
                  key={method.id}
                  aria-label={method.label}
                  className="grid h-7 min-w-12 place-items-center rounded border border-white/15 bg-white/5 px-2 font-mono text-[10px] font-semibold tracking-wider text-slate-400"
                >
                  {method.mark}
                </li>
              ))}
            </ul>
          )}
          <p className="text-slate-400">
            © {tokens.year} {store.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
