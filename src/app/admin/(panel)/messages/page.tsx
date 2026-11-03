import Link from "next/link";
import { Inbox } from "lucide-react";
import { StatusBadge, TypeBadge } from "@/components/admin/messages/badges";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/session";
import { INBOX_PAGE_SIZE, type InboxFilters, listEnquiries, parseInboxFilters, type StatusFilter } from "@/lib/enquiries/queries";
import { ENQUIRY_TYPES, TYPE_LABEL } from "@/lib/enquiries/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Messages" };

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "new", label: "New" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
const time = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: "Europe/London" });

/** "5 min ago" for today, "Yesterday 14:05", otherwise "12 Oct". */
function received(date: Date, now: Date) {
  const mins = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const key = (d: Date) => day.format(d);
  if (key(date) === key(now)) return time.format(date);
  if (key(date) === key(new Date(now.getTime() - 86_400_000))) return `Yesterday ${time.format(date)}`;
  return day.format(date);
}

function firstLine(text: string | null) {
  const line = (text ?? "").split(/\r?\n/).find((l) => l.trim()) ?? "";
  return line.length > 140 ? `${line.slice(0, 140)}…` : line;
}

function inboxHref(f: InboxFilters, change: Partial<InboxFilters>) {
  const next = { ...f, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.status !== "all") params.set("status", next.status);
  if (next.type) params.set("type", next.type);
  if (next.q) params.set("q", next.q);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/admin/messages?${qs}` : "/admin/messages";
}

export default async function AdminMessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireAdmin("messages");
  const filters = parseInboxFilters(await searchParams);
  const { rows, total, counts, unread } = await listEnquiries(filters);
  const pages = Math.max(1, Math.ceil(total / INBOX_PAGE_SIZE));
  const now = new Date();
  const filtered = !!(filters.q || filters.type);

  return (
    <>
      <PageHeader
        title="Messages"
        description={
          unread
            ? `${unread} new ${unread === 1 ? "message" : "messages"} waiting. Contact, quote, trade and parts enquiries from the shop.`
            : "Contact, quote, trade and parts enquiries from the shop. You're all caught up."
        }
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <nav aria-label="Message status" className="bg-muted inline-flex w-fit items-center rounded-lg p-[3px] text-sm">
          {TABS.map((tab) => {
            const active = filters.status === tab.value;
            return (
              <Link
                key={tab.value}
                href={inboxHref(filters, { status: tab.value })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-3 font-medium transition-colors",
                  active ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    tab.value === "new" && counts.new ? "bg-brand-600 text-white" : "text-muted-foreground",
                  )}
                >
                  {counts[tab.value]}
                </span>
              </Link>
            );
          })}
        </nav>

        <form className="flex flex-wrap gap-2" action="/admin/messages">
          {filters.status !== "all" && <input type="hidden" name="status" value={filters.status} />}
          <Input
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Search name, email, company, subject or message"
            aria-label="Search messages"
            className="w-72 max-w-full bg-white"
          />
          <select
            name="type"
            defaultValue={filters.type}
            className="border-input h-8 rounded-lg border bg-white px-2.5 text-sm"
            aria-label="Message type"
          >
            <option value="">All types</option>
            {ENQUIRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonVariants({ variant: "outline" })}>
            Filter
          </button>
          {filtered && (
            <Link href={inboxHref(filters, { q: "", type: "" })} className={buttonVariants({ variant: "ghost" })}>
              Clear
            </Link>
          )}
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-white px-4 py-14 text-center">
          <Inbox className="text-muted-foreground mx-auto mb-2 size-6" aria-hidden="true" />
          <p className="font-medium">{filtered ? "No messages match these filters." : "No messages here."}</p>
          <p className="text-muted-foreground text-sm">
            {filtered ? "Try a different search or type." : "Messages sent from the shop's contact, quote, trade and parts forms appear here."}
          </p>
        </div>
      ) : (
        <>
          {/* Phones: a stacked list. */}
          <ul className="divide-y rounded-xl border bg-white md:hidden">
            {rows.map((r) => {
              const isNew = r.status === "new";
              return (
                <li key={r.id} className={cn(isNew && "bg-brand-50/40")}>
                  <Link href={`/admin/messages/${r.id}`} prefetch={false} className="flex flex-col gap-1 px-4 py-3">
                    <span className="flex items-center gap-2">
                      {isNew && <span className="size-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />}
                      <span className={cn("min-w-0 flex-1 truncate", isNew ? "font-semibold" : "font-medium")}>
                        {isNew && <span className="sr-only">Unread: </span>}
                        {r.name}
                        {r.company && <span className="text-muted-foreground font-normal"> · {r.company}</span>}
                      </span>
                      <time dateTime={r.createdAt.toISOString()} className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {received(r.createdAt, now)}
                      </time>
                    </span>
                    <span className={cn("truncate text-sm", isNew && "font-semibold")}>{r.subject || "(no subject)"}</span>
                    <span className="text-muted-foreground truncate text-xs">{firstLine(r.message)}</span>
                    <span className="flex gap-1.5 pt-0.5">
                      <TypeBadge type={r.type} />
                      <StatusBadge status={r.status} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden rounded-xl border bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead className="w-full">Message</TableHead>
                  <TableHead className="hidden xl:table-cell">Product</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-32 text-right">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const isNew = r.status === "new";
                  return (
                    <TableRow key={r.id} className={cn("relative", isNew && "bg-brand-50/40")}>
                      <TableCell>
                        <TypeBadge type={r.type} />
                      </TableCell>
                      <TableCell>
                        <p className={cn("max-w-48 truncate", isNew ? "font-semibold" : "font-medium")}>
                          {isNew && (
                            <>
                              <span className="mr-1.5 inline-block size-2 rounded-full bg-brand-600" aria-hidden="true" />
                              <span className="sr-only">Unread: </span>
                            </>
                          )}
                          {r.name}
                        </p>
                        <p className="text-muted-foreground max-w-48 truncate text-xs">{r.company || r.email}</p>
                      </TableCell>
                      {/* Takes the leftover width and truncates (max-w-0 lets the column shrink below its content). */}
                      <TableCell className="w-full max-w-0">
                        {/* Stretched link: the whole row opens the message. */}
                        <Link
                          href={`/admin/messages/${r.id}`}
                          prefetch={false}
                          className={cn("block truncate after:absolute after:inset-0", isNew ? "font-semibold" : "font-medium")}
                        >
                          {r.subject || "(no subject)"}
                        </Link>
                        <p className="text-muted-foreground truncate text-xs">{firstLine(r.message)}</p>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {r.productSlug ? (
                          <Link
                            href={r.productId ? `/admin/products/${r.productId}` : `/products/${r.productSlug}`}
                            prefetch={false}
                            className="relative z-10 block max-w-48 truncate text-sm text-sky-700 hover:underline"
                            title={r.productName ?? r.productSlug}
                          >
                            {r.productName ?? r.productSlug}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums" title={when.format(r.createdAt)}>
                        <time dateTime={r.createdAt.toISOString()} className="text-sm">
                          {received(r.createdAt, now)}
                        </time>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {total.toLocaleString("en-GB")} {total === 1 ? "message" : "messages"} · page {Math.min(filters.page, pages)} of {pages}
        </p>
        <div className="flex gap-2">
          {filters.page > 1 && (
            <Link href={inboxHref(filters, { page: filters.page - 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Previous
            </Link>
          )}
          {filters.page < pages && (
            <Link href={inboxHref(filters, { page: filters.page + 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Next
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
