import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/sites/cctvmaster/kits/kit-sections";
import { BUSINESS } from "@/components/sites/cctvmaster/kits/premises-data";
import { PremisesPage } from "@/components/sites/cctvmaster/kits/premises-page";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";

export const metadata: Metadata = {
  title: BUSINESS.metaTitle,
  description: BUSINESS.metaDescription,
  alternates: { canonical: "/business-cctv-systems" },
};

export default async function BusinessCctvSystemsPage() {
  await ensureCatalog();
  return (
    <PremisesPage
      crumbs={[
        { label: "Home", href: "/" },
        { label: "CCTV Kits", href: "/kits" },
      ]}
      crumbCurrent="Business CCTV Systems"
      title={BUSINESS.title}
      intro={BUSINESS.intro}
      bands={BUSINESS.bands}
      guide={
        <Prose>
          <h2>{BUSINESS.guideHeading}</h2>
          {BUSINESS.guideSections.map((s) => (
            <div key={s.heading || "lead"}>
              {s.heading && <h3>{s.heading}</h3>}
              <p>
                {s.body}
                {"link" in s && s.link && (
                  <>
                    {" "}
                    {s.link.pre}{" "}
                    {s.link.href.startsWith("http") ? (
                      <a href={s.link.href} target="_blank" rel="noopener noreferrer">
                        {s.link.label}
                      </a>
                    ) : (
                      <Link href={s.link.href}>{s.link.label}</Link>
                    )}
                    .
                  </>
                )}
              </p>
            </div>
          ))}
        </Prose>
      }
      faqTitle="Business CCTV — frequently asked questions"
      faqs={BUSINESS.faqs}
      keepReading={BUSINESS.keepReading}
    />
  );
}
