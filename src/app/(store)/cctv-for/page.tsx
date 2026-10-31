import type { Metadata } from "next";
import Link from "next/link";
import { CONTAINER, STORE_HEADINGS, LinkGrid, Prose, SlashBreadcrumb } from "@/components/sites/cctvmaster/kits/kit-sections";
import { GUIDES, HUB } from "@/components/sites/cctvmaster/kits/premises-data";

export const metadata: Metadata = {
  title: HUB.metaTitle,
  description: HUB.metaDescription,
  alternates: { canonical: "/cctv-for" },
};

export default function CctvForPage() {
  return (
    <div className={`${CONTAINER} ${STORE_HEADINGS} py-8`}>
      <SlashBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Business CCTV Systems", href: "/business-cctv-systems" },
        ]}
        current="CCTV by Premises Type"
      />
      <header className="mt-3 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{HUB.title}</h1>
        <p className="text-muted-foreground mt-3 text-base sm:text-lg">{HUB.intro}</p>
      </header>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <section key={g.slug} className="border-border rounded-lg border p-5">
            <h2 id={`vertical-${g.slug}`} className="text-xl font-bold tracking-tight">
              <Link href={`/cctv-for/${g.slug}`} className="hover:underline">
                {g.title}
              </Link>
            </h2>
            <p className="text-muted-foreground mt-1 text-xs font-medium tracking-wide uppercase">{g.range}</p>
            <p className="text-muted-foreground mt-2 text-sm">{g.summary}</p>
            <p className="mt-2 text-sm">{g.tip}</p>
            <Link
              href={`/cctv-for/${g.slug}`}
              className="text-primary mt-3 inline-block text-sm font-medium hover:underline"
            >
              Read the {g.slug.replace(/-/g, " ")} guide →
            </Link>
          </section>
        ))}
      </div>
      <div className="mx-auto mt-14 w-full max-w-4xl">
        <Prose>
          <h2>{HUB.closingHeading}</h2>
          <p>{HUB.closing[0]}</p>
          <p>
            {HUB.closing[1]} <Link href="/business-cctv-systems">business CCTV systems</Link>.
          </p>
        </Prose>
        <LinkGrid title="Keep reading" links={HUB.keepReading} />
      </div>
    </div>
  );
}
