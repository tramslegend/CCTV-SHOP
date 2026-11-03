import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CompareAddButton } from "@/components/sites/cctvmaster/listing/compare-add-button";
import { slugForSku } from "@/components/sites/cctvmaster/listing/listing-data";
import { ensureCatalog, getCard, getProduct, getTaxonomy } from "@/lib/cctvmaster/catalog";
import { splitPrice, withVat } from "@/lib/cctvmaster/money";
import type { Product, ProductCard } from "@/lib/cctvmaster/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Compare side by side",
  description: "Compare CCTV cameras and recorders side by side: the same facts in the same rows.",
  robots: { index: false },
};

const MAX_ITEMS = 4;

/** Rows after Price, in display order; labels default to the card chip's own label. */
const ROWS: { key: string; label?: string }[] = [
  { key: "resolution", label: "Picture detail" },
  { key: "night" },
  { key: "lens" },
  { key: "ai" },
  { key: "audio" },
  { key: "style" },
  { key: "signal" },
  { key: "weather" },
  { key: "channels" },
  { key: "takes" },
  { key: "poe" },
  { key: "storage" },
  { key: "capacity" },
  { key: "duty" },
  { key: "media" },
  { key: "ports" },
  { key: "speed" },
  { key: "managed" },
  { key: "budget" },
  { key: "reach" },
];

interface Item {
  sku: string;
  product: Product;
  card: ProductCard;
}

/** A row value from the card's chips, falling back to its filter facets and specs for cameras. */
function rowValue(item: Item, key: string): string | undefined {
  const chip = item.card.decide?.chips.find((c) => c.key === key);
  if (chip) return chip.value;
  const facets = item.card.decide?.facets ?? {};
  const words = getTaxonomy().facetWords.options;
  const first = facets[key]?.[0];
  switch (key) {
    case "resolution":
      return first ? `${first}MP picture` : undefined;
    case "audio":
      return facets.audio?.includes("two-way") ? words.audio["two-way"] : first ? words.audio[first] : undefined;
    case "night":
    case "ai":
    case "style":
    case "signal":
      return first ? words[key]?.[first] : undefined;
    case "lens":
      // Cameras without a lens chip are fixed-lens models unless they zoom.
      return item.card.decide?.kind === "camera" &&
        !facets.style?.includes("ptz") &&
        !/varifocal|motori[sz]ed|zoom/i.test(item.product.name)
        ? "Fixed lens"
        : undefined;
    case "weather": {
      const rating = item.product.attributes?.find((a) => a.name === "IP Rating")?.value;
      return rating && /^IP\d/i.test(rating) ? `Weatherproof ${rating.toUpperCase()}` : undefined;
    }
    default:
      return undefined;
  }
}

function rowLabel(items: Item[], key: string, fallback?: string) {
  if (fallback) return fallback;
  for (const item of items) {
    const chip = item.card.decide?.chips.find((c) => c.key === key);
    if (chip) return chip.label;
  }
  return key;
}

const skuList = (raw: string | string[] | undefined) =>
  (Array.isArray(raw) ? raw.join(",") : (raw ?? ""))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const compareUrl = (skus: string[], extra = "") =>
  skus.length ? `/compare?skus=${skus.map(encodeURIComponent).join(",")}${extra}` : "/compare";

export default async function ComparePage(props: PageProps<"/compare">) {
  await ensureCatalog();
  const sp = await props.searchParams;
  const hideSame = sp.same === "hide";
  const items: Item[] = [];
  for (const sku of skuList(sp.skus)) {
    const slug = slugForSku(sku);
    const product = slug ? getProduct(slug) : undefined;
    const card = slug ? getCard(slug) : undefined;
    if (product && card && !items.some((i) => i.product.slug === slug)) items.push({ sku: product.sku, product, card });
    if (items.length >= MAX_ITEMS) break;
  }
  const skus = items.map((i) => i.sku);

  const rows: { label: string; values: React.ReactNode[]; raw: string[] }[] = [
    {
      label: "Price",
      raw: items.map((i) => String(i.card.price)),
      values: items.map((i) => {
        const p = splitPrice(withVat(i.card.price));
        return (
          <span
            key={i.sku}
            aria-label={`£${p.pounds}.${p.pence}`}
            className="inline-flex items-start font-semibold tracking-tight text-foreground tabular-nums"
          >
            <span className="mt-0.5 font-mono text-sm" aria-hidden="true">
              £
            </span>
            <span className="text-base" aria-hidden="true">
              {p.pounds}
            </span>
            <span className="sr-only">.</span>
            <span className="ml-0.5 font-mono text-[10px]" aria-hidden="true">
              {p.pence}
            </span>
          </span>
        );
      }),
    },
  ];
  for (const row of ROWS) {
    const raw = items.map((i) => rowValue(i, row.key));
    if (raw.every((v) => !v)) continue;
    const label = rowLabel(items, row.key, row.label);
    rows.push({
      label,
      raw: raw.map((v) => v ?? ""),
      values: raw.map((v, n) =>
        v ? (
          v
        ) : (
          <span key={n} className="text-zinc-400">
            Not listed
          </span>
        ),
      ),
    });
  }
  const goodFor = items.map((i) => i.card.decide?.goodFor);
  if (goodFor.some(Boolean))
    rows.push({
      label: "Good for",
      raw: goodFor.map((v) => v ?? ""),
      values: goodFor.map((v, n) => v ?? <span key={n} className="text-zinc-400">Not listed</span>),
    });
  const availability = items.map((i) => (i.product.availability === "BackOrder" ? "Available for backorder" : "Available"));
  rows.push({ label: "Availability", raw: availability, values: availability });

  const visibleRows = rows
    .map((r) => ({ ...r, differs: new Set(r.raw).size > 1 }))
    .filter((r) => !hideSame || r.differs || items.length < 2);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 md:py-10 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-3 flex gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Compare</span>
      </nav>
      <h1 id="compare-heading" className="text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
        Compare side by side
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">The same facts in the same rows, so the differences jump out.</p>
      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-200 bg-white p-8 text-center">
          <h2 className="text-lg font-bold tracking-[-0.02em] text-foreground">Nothing to compare yet</h2>
          <p className="mt-2">Tick “Compare” on any camera or recorder (four at most), then come back here.</p>
          <p className="mt-4">
            <Link
              href="/products"
              className="inline-flex min-h-9 items-center rounded-full bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800"
            >
              Browse the shop
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Shaded rows are where they differ.</p>
            <Link
              href={compareUrl(skus, hideSame ? "" : "&same=hide")}
              className="inline-flex min-h-10 items-center rounded-full border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50"
            >
              {hideSame ? "Show everything" : "Hide what’s the same"}
            </Link>
          </div>
          <div
            role="region"
            aria-labelledby="compare-heading"
            tabIndex={0}
            className="relative max-w-full overflow-x-auto rounded-2xl border border-border bg-white focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <table className="w-full min-w-max border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 w-28 min-w-28 bg-white p-3 md:w-44 md:min-w-44">
                    <span className="sr-only">Product</span>
                  </th>
                  {items.map((item) => {
                    const title = item.card.decide?.title ?? item.product.name;
                    const image = item.card.imageUrl ?? item.product.images?.[0];
                    const href = `/products/${item.product.slug}`;
                    return (
                      <th key={item.sku} scope="col" className="w-56 max-w-64 min-w-44 bg-white p-3 align-top font-normal">
                        <div className="flex flex-col gap-2">
                          <span
                            aria-hidden="true"
                            className="relative block h-24 w-24 overflow-hidden rounded-xl bg-white [&_img]:h-full [&_img]:w-full [&_img]:object-contain"
                          >
                            {image ? <Image src={image} alt="" width={120} height={120} sizes="120px" /> : null}
                          </span>
                          <Link href={href} className="text-sm leading-snug font-semibold text-foreground hover:text-brand-800">
                            {title}
                            {item.card.decide ? <span className="sr-only"> — {item.product.name}</span> : null}
                          </Link>
                          <span className="text-[11px] tracking-wide text-muted-foreground uppercase">{item.product.sku}</span>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
                            <CompareAddButton
                              item={{
                                slug: item.product.slug,
                                name: item.product.name,
                                sku: item.product.sku,
                                price: item.product.price,
                                image,
                              }}
                            />
                            <Link
                              href={href}
                              className="text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
                            >
                              See full details
                            </Link>
                            <Link
                              href={compareUrl(skus.filter((s) => s !== item.sku), hideSame ? "&same=hide" : "")}
                              aria-label={`Remove ${item.product.name} from the comparison`}
                              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                            >
                              Remove
                            </Link>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.label} className={cn(row.differs ? "bg-brand-50" : "bg-white")} data-differs={row.differs || undefined}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-t border-border bg-inherit p-3 align-top text-xs font-semibold text-muted-foreground"
                    >
                      {row.label}
                    </th>
                    {row.values.map((value, n) => (
                      <td key={skus[n]} className="border-t border-border p-3 align-top text-foreground/80">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
