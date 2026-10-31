import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/lib/cctvmaster/types";
import { ClockIcon } from "../icons";
import { formatPostDate, readingMinutes } from "./blog-data";

// Blog listing card, matching the source's /blog grid item.
export function BlogCard({ post, eager = false }: { post: BlogPost; eager?: boolean }) {
  return (
    <article className="group bg-card text-card-foreground flex h-full flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md">
      <Link className="flex h-full flex-col" href={`/blog/${post.slug}`}>
        <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden">
          {post.image ? (
            <Image
              src={post.image}
              alt={post.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading={eager ? "eager" : "lazy"}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          {post.keywords ? (
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{post.keywords}</span>
          ) : null}
          <h2 className="text-lg leading-snug font-semibold tracking-tight group-hover:underline">{post.title}</h2>
          {post.excerpt ? (
            <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">{post.excerpt}</p>
          ) : null}
          <div className="text-muted-foreground mt-auto flex items-center gap-3 pt-2 text-xs">
            <time dateTime={post.datePublished}>{formatPostDate(post.datePublished)}</time>
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {readingMinutes(post.wordCount)} min read
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
