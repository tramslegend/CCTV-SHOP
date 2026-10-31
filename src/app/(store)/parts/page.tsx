import type { Metadata } from "next";
import Link from "next/link";
import { EnquireButton } from "@/components/sites/cctvmaster/listing/enquire-dialog";
import { ensureCatalog, getShopProducts } from "@/lib/cctvmaster/catalog";
import type { Product } from "@/lib/cctvmaster/types";
import { cutoffLabel } from "@/lib/settings/format";
import { siteSetting } from "@/lib/settings/storefront";

export const metadata: Metadata = {
  title: "CCTV Parts UK: Find Stocked Part Numbers by MPN",
  description:
    "Look up CCTV parts in UK stock by manufacturer part number (MPN, the maker's code for an exact item). Hikvision, Dahua, Texecom and more, open to everyone.",
};

const collator = new Intl.Collator("en");

const anchor = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Products with a manufacturer part number, grouped by brand (unbranded ones under "Other"), biggest group first. */
function brandGroups() {
  const groups = new Map<string, Product[]>();
  for (const p of getShopProducts()) {
    if (!p.partNumbers?.mpn) continue;
    const brand = p.brand?.trim() || "Other";
    if (!groups.has(brand)) groups.set(brand, []);
    groups.get(brand)?.push(p);
  }
  const used = new Set<string>();
  return [...groups.entries()]
    .sort(([a, pa], [b, pb]) => pb.length - pa.length || collator.compare(a, b))
    .map(([brand, products]) => {
      // Brands that differ only in case (Hilook / HiLook) share a base anchor; keep ids unique.
      let id = anchor(brand);
      for (let n = 2; used.has(id); n++) id = `${anchor(brand)}-${n}`;
      used.add(id);
      return { brand, id, products: products.sort((a, b) => collator.compare(a.name, b.name)) };
    });
}

export default async function PartsPage() {
  await ensureCatalog();
  const groups = brandGroups();
  const total = groups.reduce((n, g) => n + g.products.length, 0);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-muted-foreground mb-4 text-sm">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <span className="text-foreground font-medium">Part numbers</span>
      </nav>
      <h1 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl">Find a part by its number</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">
        {total} manufacturer part numbers we stock, sorted by brand. Got a part number? Find it below to see if it&apos;s in
        stock. Order an in-stock part before {cutoffLabel(siteSetting("delivery").cutoff)} on a working day and we&apos;ll dispatch it the
        same day.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {groups.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            className="border-border hover:border-primary hover:text-primary rounded-full border px-3.5 py-1.5 text-sm"
          >
            {g.brand}
            <span className="text-muted-foreground ml-1.5 text-xs">{g.products.length}</span>
          </a>
        ))}
      </div>
      {groups.map((g) => (
        <section key={g.id} id={g.id} className="mt-10 scroll-mt-24">
          <h2 className="mb-3 text-xl font-bold tracking-[-0.02em]">
            {g.brand}{" "}
            <span className="text-muted-foreground text-sm font-normal">
              · {g.products.length} part{g.products.length === 1 ? "" : "s"}
            </span>
          </h2>
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm [&_td]:px-4 [&_td]:py-2.5">
              <thead>
                <tr className="border-border border-b text-left">
                  <th className="text-muted-foreground px-4 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Part number
                  </th>
                  <th className="text-muted-foreground px-4 py-2.5 text-xs font-medium tracking-wide uppercase">Product</th>
                  <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium tracking-wide uppercase">
                    Availability
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr]:border-border [&_tr]:border-b [&_tr:last-child]:border-0">
                {g.products.map((p) => (
                  <tr key={p.slug}>
                    <td className="font-mono text-xs font-semibold">
                      <Link href={`/products/${p.slug}`} className="hover:underline">
                        {p.partNumbers?.mpn}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/products/${p.slug}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {p.availability === "BackOrder" ? (
                        <span className="inline-flex items-baseline gap-2">
                          <span className="text-muted-foreground">Available for backorder</span>
                          <EnquireButton name={p.name} sku={p.sku} />
                        </span>
                      ) : (
                        <span className="text-emerald-600">Available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
