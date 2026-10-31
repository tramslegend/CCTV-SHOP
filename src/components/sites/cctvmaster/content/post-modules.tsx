import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getProduct } from "@/lib/cctvmaster/catalog";
import { formatGBP, withVat } from "@/lib/cctvmaster/money";
import type { BlogPost, Product } from "@/lib/cctvmaster/types";
import { RichText } from "./rich-text";

// Modules shown under a blog article on the source: recommended products, FAQ, sources, tags, author and related reading.

/** Byline for posts without an author set in the admin: the shop itself (name from Settings). */
export const defaultAuthor = (storeName: string): { name: string; jobTitle?: string; image?: string } => ({
  name: `${storeName} team`,
});

/** One-line product summary from local catalogue facts (brand, category, price inc. VAT). */
export function productSummary(p: Product) {
  const price = p.isCallForPrice || p.isContactSales || !p.price ? "Call for price" : `${formatGBP(withVat(p.price))} inc. VAT`;
  const kind = p.kit ? `${p.kit.cameraCount}-camera CCTV kit` : p.category;
  return [p.brand, kind, price].filter(Boolean).join(" · ");
}

export const resolveProducts = (slugs: string[]) =>
  slugs.map((s) => getProduct(s)).filter((p): p is Product => !!p);

export function RecommendedProducts({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="mt-10 border-t pt-8" aria-labelledby="article-products-heading">
      <h2 id="article-products-heading" className="text-2xl font-bold tracking-tight">
        Recommended products
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">From our own range — picked for what this guide covers.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {products.map((p) => (
          <li key={p.slug}>
            <Link
              className="bg-card hover:border-primary hover:bg-muted/60 block h-full rounded-xl border p-4 transition-colors"
              href={`/products/${p.slug}`}
            >
              <span className="leading-snug font-medium">{p.name}</span>
              <span className="text-muted-foreground mt-1 line-clamp-2 block text-sm">{productSummary(p)}</span>
              <span className="text-primary mt-2 block text-sm font-medium">View product →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PostFaq({ items }: { items: { q: string; a: string }[] }) {
  if (!items.length) return null;
  return (
    <section className="faq-section mt-12 border-t pt-10" aria-labelledby="article-faq-heading">
      <h2 id="article-faq-heading" className="text-2xl font-bold tracking-tight">
        Frequently asked questions
      </h2>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <details key={item.q} className="group bg-card rounded-xl border px-5 py-4 transition-shadow open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              <span>{item.q}</span>
              <ChevronDown
                className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              <RichText text={item.a} />
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function PostSources({ sources }: { sources: { title: string; href: string }[] }) {
  if (!sources.length) return null;
  return (
    <section className="mt-12 border-t pt-10" aria-labelledby="article-sources-heading">
      <h2 id="article-sources-heading" className="text-2xl font-bold tracking-tight">
        Sources &amp; references
      </h2>
      <ol className="text-muted-foreground mt-6 list-decimal space-y-2 pl-5 text-sm">
        {sources.map((s) => (
          <li key={s.href}>
            <a
              className="hover:text-foreground break-words underline underline-offset-2 transition-colors"
              href={s.href}
              target="_blank"
              rel="nofollow noopener noreferrer"
            >
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PostTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <ul className="mt-10 flex flex-wrap gap-2" aria-label="Article tags">
      {tags.map((tag) => (
        <li key={tag} className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
          {tag}
        </li>
      ))}
    </ul>
  );
}

export function AuthorBox({ author }: { author: { name: string; jobTitle?: string; image?: string } }) {
  return (
    <section className="bg-muted/40 mt-12 rounded-xl border p-6" aria-label="About the author">
      <div className="flex items-start gap-4">
        {author.image ? (
          <Image
            className="h-14 w-14 shrink-0 rounded-full object-cover"
            src={author.image}
            alt=""
            aria-hidden="true"
            width={56}
            height={56}
          />
        ) : null}
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Written by</p>
          <p className="mt-1 font-semibold">{author.name}</p>
          {author.jobTitle ? <p className="text-muted-foreground mt-0.5 text-sm">{author.jobTitle}</p> : null}
        </div>
      </div>
    </section>
  );
}

export function RelatedReading({ posts }: { posts: BlogPost[] }) {
  if (!posts.length) return null;
  return (
    <section className="mt-12 border-t pt-10" aria-labelledby="article-related-heading">
      <h2 id="article-related-heading" className="text-2xl font-bold tracking-tight">
        Related reading
      </h2>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link className="bg-card hover:bg-muted/60 block h-full rounded-xl border p-4 transition-colors" href={`/blog/${p.slug}`}>
              <span className="leading-snug font-medium">{p.title}</span>
              {p.keywords ? <span className="text-muted-foreground mt-1 block text-sm">{p.keywords}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
