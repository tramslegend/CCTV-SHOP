"use client";

import { CharCount, FormField, invalidProps } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FieldErrors } from "./types";

const TITLE_LENGTH = 60;
const DESCRIPTION_LENGTH = 160;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Search-result title and description, with what the shop falls back to when they're empty. */
export function SeoEditor({
  seoTitle,
  seoDescription,
  onChange,
  errors,
  fallback,
  siteHost,
  siteName,
  titleTemplate,
}: {
  seoTitle: string;
  seoDescription: string;
  onChange: (patch: { seoTitle?: string; seoDescription?: string }) => void;
  errors: FieldErrors;
  fallback: { name: string; slug: string; sku: string; brand: string; shortDescription: string; category?: string };
  siteHost: string;
  /** Shop name from Settings, shown in the search preview. */
  siteName: string;
  /** Settings → SEO title pattern ("%s | Shop"); empty uses "<name> | <shop>". */
  titleTemplate: string;
}) {
  const productName = fallback.name || "Product name";
  const defaultTitle = titleTemplate.includes("%s") ? titleTemplate.replace("%s", productName) : `${productName} | ${siteName}`;
  const defaultDescription =
    fallback.shortDescription ||
    `${fallback.name || "Product name"}${fallback.brand ? ` by ${fallback.brand}` : ""} (${fallback.sku || "SKU"})${
      fallback.category ? ` — ${fallback.category}` : ""
    }. UK delivery, secure checkout and 14 days to change your mind.`;
  const title = seoTitle.trim() || defaultTitle;
  const description = seoDescription.trim() || defaultDescription;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <FormField
          id="pf-seoTitle"
          label="Page title"
          error={errors.seoTitle}
          hint={`Leave empty to use “${clip(defaultTitle, 70)}”. Aim for ${TITLE_LENGTH} characters or fewer.`}
          labelAside={<CharCount value={seoTitle} recommended={TITLE_LENGTH} max={120} />}
        >
          <Input
            id="pf-seoTitle"
            value={seoTitle}
            maxLength={120}
            placeholder={defaultTitle}
            onChange={(e) => onChange({ seoTitle: e.target.value })}
            {...invalidProps("pf-seoTitle", errors.seoTitle)}
          />
        </FormField>
        <FormField
          id="pf-seoDescription"
          label="Meta description"
          error={errors.seoDescription}
          hint={`Leave empty to use the short description or a generated summary. Aim for ${DESCRIPTION_LENGTH} characters or fewer.`}
          labelAside={<CharCount value={seoDescription} recommended={DESCRIPTION_LENGTH} max={320} />}
        >
          <Textarea
            id="pf-seoDescription"
            rows={3}
            value={seoDescription}
            maxLength={320}
            placeholder={clip(defaultDescription, 160)}
            onChange={(e) => onChange({ seoDescription: e.target.value })}
            {...invalidProps("pf-seoDescription", errors.seoDescription)}
          />
        </FormField>
      </div>
      <div>
        <p className="text-muted-foreground mb-1.5 text-xs font-medium">Search result preview</p>
        <div className="rounded-lg border bg-white p-4 font-[arial,sans-serif]" aria-label="Google search result preview">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground/80">
              {siteName
                .split(/ +/)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm text-[#202124]">{siteName}</p>
              <p className="truncate text-xs text-[#4d5156]">
                {siteHost} › products › {fallback.slug || "product-url"}
              </p>
            </div>
          </div>
          <p className="mt-2 line-clamp-1 text-xl leading-snug text-[#1a0dab]">{clip(title, 65)}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-normal text-[#4d5156]">{clip(description, DESCRIPTION_LENGTH)}</p>
        </div>
      </div>
    </div>
  );
}
