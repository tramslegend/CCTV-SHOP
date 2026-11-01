import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import type { Attribute } from "@/lib/cctvmaster/types";
import type { DescriptionBlock, Faq } from "./copy";
import { MarkdownContent } from "./markdown";
import { SectionCard } from "./section-card";

// The source's customised `prose` metrics, written out (the typography plugin isn't installed here).
const proseClass =
  "max-w-none text-base leading-[1.7] text-[oklch(0.1912_0_0)] [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_h3]:text-foreground [&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:text-[22px] [&_h3]:leading-[1.2] [&_h3]:font-semibold sm:[&_h3]:text-2xl [&_li]:my-1.5 [&_p]:my-4 [&_strong]:text-foreground [&_strong]:font-semibold [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6";

/** "Product Description": the admin-written markdown when there is one, otherwise copy generated from the data. */
export function DescriptionSection({ blocks, markdown }: { blocks: DescriptionBlock[]; markdown?: string }) {
  if (markdown?.trim()) {
    return (
      <SectionCard title="Product Description" id="pdp-description" headingClassName="mb-4">
        <MarkdownContent source={markdown} />
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Product Description" id="pdp-description" headingClassName="mb-4">
      <div className={proseClass}>
        {blocks.map((b, i) => (
          <Fragment key={i}>
            {b.heading && <h3>{b.heading}</h3>}
            {b.lead && (
              <p>
                <strong>{b.lead.label}</strong> {b.lead.text}
              </p>
            )}
            {b.text && <p>{b.text}</p>}
            {b.points && (
              <ul>
                {b.points.map((pt) => (
                  <li key={pt.label}>
                    <strong>{pt.label}</strong> — {pt.text}
                  </li>
                ))}
              </ul>
            )}
          </Fragment>
        ))}
      </div>
    </SectionCard>
  );
}

export function SpecificationsSection({ attributes }: { attributes: Attribute[] }) {
  if (!attributes.length) return null;
  return (
    <SectionCard title="Specifications" id="pdp-specs">
      <dl className="divide-y divide-border">
        {attributes.map((a, i) => (
          <div key={`${a.name}-${i}`} className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[minmax(8rem,15rem)_1fr]">
            <dt className="text-muted-foreground text-sm leading-relaxed break-words">{a.name}</dt>
            <dd className="text-foreground min-w-0 text-sm leading-relaxed font-medium break-words">{a.value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export function PartNumbersSection({ partNumbers }: { partNumbers?: Record<string, string | string[]> }) {
  const mpn = typeof partNumbers?.mpn === "string" ? partNumbers.mpn : undefined;
  const gtin = typeof partNumbers?.gtin === "string" ? partNumbers.gtin : undefined;
  const aliases = Array.isArray(partNumbers?.aliases) ? partNumbers.aliases : [];
  if (!mpn && !gtin && !aliases.length) return null;
  return (
    <SectionCard title="Technical Specifications" id="pdp-part-numbers">
      <div className="divide-y divide-border">
        {mpn && (
          <div className="flex justify-between gap-4 py-3">
            <span className="text-muted-foreground">Manufacturer part number</span>
            <span className="text-foreground text-right font-medium break-all">{mpn}</span>
          </div>
        )}
        {gtin && (
          <div className="flex justify-between gap-4 py-3">
            <span className="text-muted-foreground">EAN / barcode</span>
            <span className="text-foreground text-right font-medium">{gtin}</span>
          </div>
        )}
        {aliases.length > 0 && (
          <div className="flex flex-col gap-1.5 py-3 sm:flex-row sm:justify-between sm:gap-4">
            <span className="text-muted-foreground shrink-0">Also listed as</span>
            <span className="text-foreground text-sm font-medium sm:text-right">{aliases.join(" · ")}</span>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function FaqSection({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;
  return (
    <SectionCard title="Frequently Asked Questions" id="pdp-faq">
      <div className="divide-y divide-border">
        {faqs.map((f) => (
          <details key={f.q} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium sm:text-base [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
            </summary>
            <p className="text-foreground/80 mt-2 text-sm leading-relaxed sm:text-base">{f.a}</p>
          </details>
        ))}
      </div>
    </SectionCard>
  );
}
