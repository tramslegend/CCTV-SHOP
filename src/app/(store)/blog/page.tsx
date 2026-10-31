import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogCard } from "@/components/sites/cctvmaster/content/blog-card";
import { BLOG_PAGE_SIZE, getListedPosts } from "@/components/sites/cctvmaster/content/blog-data";
import { BlogPagination } from "@/components/sites/cctvmaster/content/blog-pagination";
import { loadSiteSettings } from "@/lib/settings/storefront";

const parsePage = (value: string | string[] | undefined) => {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : 1;
};

export async function generateMetadata({ searchParams }: PageProps<"/blog">): Promise<Metadata> {
  const { store } = await loadSiteSettings();
  const page = parsePage((await searchParams).page);
  return {
    title: { absolute: `CCTV Blog: Buyers Guides for UK Homes and Businesses${page > 1 ? ` – Page ${page}` : ""} | ${store.name}` },
    description: `CCTV Blog from ${store.name}: plain-English buyers guides on night vision, NVR vs DVR, PoE switches and cabling, for UK homeowners and small businesses.`,
    alternates: { canonical: page > 1 ? `/blog?page=${page}` : "/blog" },
  };
}

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const { store } = await loadSiteSettings();
  const page = parsePage((await searchParams).page);
  const posts = getListedPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / BLOG_PAGE_SIZE));
  if (page > totalPages) notFound();
  const visible = posts.slice((page - 1) * BLOG_PAGE_SIZE, page * BLOG_PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">{store.name}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Blog</h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed md:text-lg">
          Buying guides, side-by-side comparisons and straight answers from the {store.name} team.
        </p>
      </header>
      <div className="scroll-mt-24 outline-none" tabIndex={-1}>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((post, i) => (
            <BlogCard key={post.slug} post={post} eager={i < 3} />
          ))}
        </div>
        <BlogPagination current={page} total={totalPages} />
      </div>
    </div>
  );
}
