import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { PageStatusBadge } from "@/components/admin/content/status";
import { PageHeader } from "@/components/admin/page-header";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { PAGE_DEFS, PAGE_SLUGS, type PageDef } from "@/lib/content/pages";
import { formatDateTime } from "../_lib/format";

export const metadata = { title: "Pages" };

const GROUPS: PageDef["group"][] = ["Company", "Help", "Legal"];

export default async function ContentPagesPage() {
  await requireAdmin("content");
  const rows = await db.pages.find({}, { projection: { _id: 0, slug: 1, status: 1, updatedAt: 1 } }).toArray();
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const custom = PAGE_SLUGS.filter((slug) => bySlug.get(slug)?.status === "active").length;

  return (
    <>
      <nav className="text-muted-foreground mb-2 flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        <Link href="/admin/content" className="hover:text-zinc-950">
          Content
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="text-zinc-950">Pages</span>
      </nav>
      <PageHeader
        title="Pages"
        description={`The shop's information pages. Each shows built-in content until you publish your own version${custom ? ` · ${custom} of ${PAGE_SLUGS.length} use your version` : ""}.`}
      />
      <div className="flex flex-col gap-6">
        {GROUPS.map((group) => {
          const defs = PAGE_SLUGS.map((slug) => PAGE_DEFS[slug]).filter((d) => d.group === group);
          return (
            <section key={group} aria-labelledby={`group-${group}`} className="overflow-hidden rounded-xl bg-white ring-1 ring-black/10">
              <h2 id={`group-${group}`} className="border-b bg-zinc-50/70 px-5 py-2.5 text-xs font-semibold tracking-wide text-zinc-600 uppercase">
                {group}
              </h2>
              <ul className="divide-y">
                {defs.map((def) => {
                  const row = bySlug.get(def.slug);
                  const status = row ? (row.status === "active" ? "active" : "draft") : null;
                  return (
                    <li key={def.slug} className="group relative flex flex-col gap-2 px-5 py-3.5 hover:bg-zinc-50 sm:flex-row sm:items-center sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/content/pages/${def.slug}`} className="font-medium after:absolute after:inset-0 hover:underline">
                          {def.label}
                        </Link>
                        <p className="text-muted-foreground truncate text-xs">
                          {def.path} · {def.summary}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <PageStatusBadge status={status} />
                        <span className="text-muted-foreground w-36 tabular-nums sm:text-right">{row ? `Edited ${formatDateTime(row.updatedAt)}` : "Not edited"}</span>
                        <a
                          href={def.path}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground relative z-10 inline-flex items-center gap-1 rounded px-1.5 py-1 hover:bg-zinc-100 hover:text-zinc-950"
                          aria-label={`View ${def.label} in the shop`}
                        >
                          View <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
