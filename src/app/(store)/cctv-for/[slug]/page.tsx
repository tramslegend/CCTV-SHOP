import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prose } from "@/components/sites/cctvmaster/kits/kit-sections";
import { getGuide, GUIDES } from "@/components/sites/cctvmaster/kits/premises-data";
import { PremisesPage } from "@/components/sites/cctvmaster/kits/premises-page";
import { ensureCatalog } from "@/lib/cctvmaster/catalog";

export async function generateStaticParams() {
  await ensureCatalog();
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/cctv-for/[slug]">): Promise<Metadata> {
  await ensureCatalog();
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    alternates: { canonical: `/cctv-for/${guide.slug}` },
  };
}

export default async function PremisesGuidePage({ params }: PageProps<"/cctv-for/[slug]">) {
  await ensureCatalog();
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  return (
    <PremisesPage
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Business CCTV Systems", href: "/business-cctv-systems" },
        { label: "CCTV by Premises Type", href: "/cctv-for" },
      ]}
      title={guide.title}
      intro={guide.intro}
      bands={guide.bands}
      showDriveRange
      guide={
        <Prose>
          <h2>{guide.guideHeading}</h2>
          {guide.guide.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Prose>
      }
      faqTitle={`${guide.title} — common questions`}
      faqs={guide.faqs}
      keepReading={guide.keepReading}
      footer={
        <div className="mt-10">
          <h2 className="text-xl font-bold tracking-tight">Other premises types</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Each guide is written for one kind of site.{" "}
            <Link href="/cctv-for" className="underline">
              Every premises-type guide
            </Link>
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {others.map((g) => (
              <li key={g.slug}>
                <Link href={`/cctv-for/${g.slug}`} className="underline">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      }
    />
  );
}
