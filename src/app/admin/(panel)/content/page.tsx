import Link from "next/link";
import { ArrowRight, FileText, Home, Menu, Newspaper } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { PAGE_SLUGS } from "@/lib/content/pages";

export const metadata = { title: "Content" };

export default async function AdminContentPage() {
  await requireAdmin("content");
  const [pageRows, postCounts] = await Promise.all([
    db.pages.find({}, { projection: { _id: 0, slug: 1, status: 1 } }).toArray(),
    db.blogPosts.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
  ]);
  const published = pageRows.filter((r) => r.status === "active" && (PAGE_SLUGS as readonly string[]).includes(r.slug)).length;
  const drafts = pageRows.filter((r) => r.status !== "active").length;
  const posts = Object.fromEntries(postCounts.map((c) => [c._id, c.n])) as Partial<Record<string, number>>;

  const cards = [
    {
      href: "/admin/content/pages",
      icon: FileText,
      title: "Pages",
      body: "About, delivery, returns, FAQs, trade, visit, the guides and contact intros, and the legal pages.",
      stat: `${published} of ${PAGE_SLUGS.length} use your version${drafts ? ` · ${drafts} draft${drafts === 1 ? "" : "s"}` : ""}`,
    },
    {
      href: "/admin/content/blog",
      icon: Newspaper,
      title: "Blog",
      body: "Buying guides and articles: write, publish, order the /blog listing and link products.",
      stat: `${(posts.active ?? 0).toLocaleString("en-GB")} published${posts.draft ? ` · ${posts.draft} draft${posts.draft === 1 ? "" : "s"}` : ""}`,
    },
    {
      href: "/admin/content/homepage",
      icon: Home,
      title: "Homepage",
      body: "The hero, featured products and the sections of the home page.",
      stat: null,
    },
    {
      href: "/admin/content/navigation",
      icon: Menu,
      title: "Navigation",
      body: "The header menu and the footer links.",
      stat: null,
    },
  ];

  return (
    <>
      <PageHeader title="Content" description="Everything customers read in the shop, apart from products and categories." />
      <ul className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, icon: Icon, title, body, stat }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full flex-col gap-3 rounded-xl bg-white p-5 ring-1 ring-black/10 transition-shadow hover:shadow-md hover:ring-black/20 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <h2 className="text-base font-semibold">{title}</h2>
                <ArrowRight className="text-muted-foreground ml-auto size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground text-sm">{body}</p>
              {stat && <p className="mt-auto text-xs font-medium text-zinc-700 tabular-nums">{stat}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
