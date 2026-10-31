import Link from "next/link";
import type { BlogPost } from "@/lib/cctvmaster/types";

/** "Helpful guides for this item": blog posts linked to the product. */
export function ProductGuides({ posts }: { posts: BlogPost[] }) {
  if (!posts.length) return null;
  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10" aria-labelledby="pdp-guides-heading">
      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 sm:p-7">
        <h2 id="pdp-guides-heading" className="text-lg font-bold sm:text-xl">
          Helpful guides for this item
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3 [&>*]:min-w-0">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="border-border hover:border-primary bg-background block h-full rounded-xl border p-3 transition-colors"
              >
                <span className="text-foreground block text-sm font-semibold break-words">{post.title}</span>
                {post.excerpt && (
                  <span className="text-muted-foreground mt-1 line-clamp-2 block text-xs leading-relaxed">{post.excerpt}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link className="text-primary font-semibold underline-offset-2 hover:underline" href="/guides">
            More guides
          </Link>
        </p>
      </div>
    </section>
  );
}

/** Reviews block in its empty state (the clone has no review data). */
export function ProductReviews({ name }: { name: string }) {
  return (
    <section id="reviews" className="border-t bg-gray-50/70 py-12" aria-labelledby="pdp-reviews-heading">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="pdp-reviews-heading" className="text-2xl font-bold tracking-tight text-gray-950">
          What customers say
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
          Nobody has reviewed {name} yet. Only people who&apos;ve bought it from us can leave a review — we ask once the
          order&apos;s been dispatched, so every rating here is from a verified purchase.
        </p>
      </div>
    </section>
  );
}
