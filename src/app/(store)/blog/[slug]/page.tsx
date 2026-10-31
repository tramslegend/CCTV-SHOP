import { ChevronRight, Clock } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import {
  formatPostDate,
  getPostContent,
  getRelatedPosts,
  readingMinutes,
  type TocItem,
} from "@/components/sites/cctvmaster/content/blog-data";
import { ContentMarkdown } from "@/components/sites/cctvmaster/content/content-markdown";
import {
  AuthorBox,
  defaultAuthor,
  PostFaq,
  PostSources,
  PostTags,
  productSummary,
  RecommendedProducts,
  RelatedReading,
  resolveProducts,
} from "@/components/sites/cctvmaster/content/post-modules";
import { POST_BODY, POST_H2, POST_H3, POST_P } from "@/components/sites/cctvmaster/content/post-prose";
import { PostTocAside, PostTocMobile } from "@/components/sites/cctvmaster/content/post-toc";
import { RichText } from "@/components/sites/cctvmaster/content/rich-text";
import { ensureCatalog, getBlogPost, getBlogPosts } from "@/lib/cctvmaster/catalog";
import { loadSiteSettings } from "@/lib/settings/storefront";

export async function generateStaticParams() {
  await ensureCatalog();
  return getBlogPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  await ensureCatalog();
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Article not found" };
  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      images: post.image ? [{ url: post.image }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { store } = await loadSiteSettings();
  const { slug } = await params;
  const post = getBlogPost(slug);
  const content = getPostContent(slug);
  if (!post || !content) notFound();

  const author = post.author ?? defaultAuthor(store.name);
  const products = resolveProducts(content.products);
  const related = getRelatedPosts(content.related);
  const toc: TocItem[] = products.length
    ? [...content.toc, { id: "related-products", text: "Related products", level: 2 }]
    : content.toc;
  const updated = post.dateModified && post.dateModified.slice(0, 10) !== post.datePublished?.slice(0, 10);

  // post.images holds 16:9, 4:3 and 1:1 crops of the cover (schema.org variants), so the body stays text-only.
  const renderSection = (item: TocItem): ReactNode => (
    <Fragment key={item.id}>
      {item.level === 3 ? (
        <h3 id={item.id} className={POST_H3}>
          {item.text}
        </h3>
      ) : (
        <h2 id={item.id} className={POST_H2}>
          {item.text}
        </h2>
      )}
      {content.body[item.id] ? (
        <p className={POST_P}>
          <RichText text={content.body[item.id]} />
        </p>
      ) : null}
    </Fragment>
  );

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <nav className="text-muted-foreground flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Link className="hover:text-foreground transition-colors" href="/blog">
          Blog
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="text-foreground line-clamp-1 font-medium">{post.title}</span>
      </nav>

      <header className="mt-8 max-w-3xl">
        {post.keywords ? (
          <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">{post.keywords}</p>
        ) : null}
        <h1 className="mt-2 text-3xl leading-tight font-bold tracking-tight md:text-4xl">{post.title}</h1>
        {post.excerpt ? <p className="text-muted-foreground mt-4 text-lg leading-relaxed">{post.excerpt}</p> : null}
        <div className="text-muted-foreground mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y py-4 text-sm">
          <span>
            By <span className="text-foreground font-medium">{author.name}</span>
            {author.jobTitle ? <span> — {author.jobTitle}</span> : null}
          </span>
          {post.datePublished ? <time dateTime={post.datePublished}>{formatPostDate(post.datePublished)}</time> : null}
          {updated ? (
            <span>
              Updated <time dateTime={post.dateModified}>{formatPostDate(post.dateModified)}</time>
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {readingMinutes(post.wordCount)} min read
          </span>
        </div>
      </header>

      {post.image ? (
        <figure className="mt-8">
          <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden rounded-xl">
            <Image
              src={post.image}
              alt={post.title}
              fill
              preload
              sizes="(max-width: 1152px) 100vw, 1088px"
              className="object-cover"
            />
          </div>
        </figure>
      ) : null}

      <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
        <div className="max-w-3xl min-w-0">
          <PostTocMobile items={toc} />

          <div className="text-[oklab(0.1912_0_0)]">
            {content.markdown ? (
              <ContentMarkdown source={content.markdown} classes={POST_BODY} headingIds={content.headingIds} />
            ) : (
              content.toc.map(renderSection)
            )}

            {products.length ? (
              <>
                <h2 id="related-products" className={POST_H2}>
                  Related products
                </h2>
                <p className={POST_P}>Related products from our own range:</p>
                <ul className="my-4 list-disc pl-6 leading-[1.7]">
                  {products.map((p) => (
                    <li key={p.slug} className="my-1.5">
                      <strong className="text-foreground font-semibold">
                        <Link className="text-primary font-semibold underline" href={`/products/${p.slug}`}>
                          {p.name}
                        </Link>
                      </strong>{" "}
                      — {productSummary(p)}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <RecommendedProducts products={products} />
          <PostFaq items={content.faq} />
          <PostSources sources={content.sources} />
          <PostTags tags={content.tags} />
          <AuthorBox author={author} />
          <RelatedReading posts={related} />
        </div>

        <PostTocAside items={toc} />
      </div>
    </article>
  );
}
