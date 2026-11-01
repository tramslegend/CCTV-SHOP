import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, Building2, ExternalLink, Mail, MessageSquareReply, Pencil, Phone } from "lucide-react";
import { StatusBadge, TypeBadge } from "@/components/admin/messages/badges";
import { NoteForm, ReplyForm, StatusControls } from "@/components/admin/messages/enquiry-controls";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, stripId } from "@/db";
import { logActivity, requireAdmin } from "@/lib/admin/session";
import { detailRows, enquiryHistory, getEnquiry, readNotes, readSource } from "@/lib/enquiries/queries";
import { type EnquiryStatus, STATUS_LABEL } from "@/lib/enquiries/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Message" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

/** mailto: link; the address is percent-encoded so a crafted one can't add recipients or headers. */
const mailto = (email: string, subject?: string) =>
  `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;

const replySubject = (subject: string | null) => {
  const base = subject?.trim() || "Your message";
  return /^re:/i.test(base) ? base : `Re: ${base}`;
};

function historyLabel(action: string, changes: Record<string, unknown> | null) {
  const status = changes?.status as { from?: EnquiryStatus; to?: EnquiryStatus } | undefined;
  if (action === "enquiry.status" && status?.to) {
    if (changes?.auto) return "Opened the message";
    if (status.to === "closed") return "Closed";
    if (status.from === "closed") return "Reopened";
    return `Marked ${STATUS_LABEL[status.to]?.toLowerCase() ?? status.to}`;
  }
  if (action === "enquiry.note") return "Added a note";
  if (action === "enquiry.reply") return status?.to === "closed" ? "Replied by email and closed" : "Replied by email";
  return action;
}

function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function AdminMessagePage({ params }: PageProps<"/admin/messages/[id]">) {
  const { user } = await requireAdmin("messages");
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const row = await getEnquiry(id);
  if (!row) notFound();
  const product = row.product;
  let enquiry = row.enquiry;

  // Opening a new message marks it open (only once, even if the page is loaded twice at the same moment).
  if (enquiry.status === "new") {
    const updated = await db.enquiries.findOneAndUpdate(
      { _id: id, status: "new" },
      { $set: { status: "open", updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (updated) {
      await logActivity(user, "enquiry.status", "enquiry", id, {
        status: { from: "new", to: "open" },
        subject: updated.subject,
        auto: true,
      });
      enquiry = stripId(updated);
    }
  }

  const history = await enquiryHistory(id);
  const notes = readNotes(enquiry.details);
  const source = readSource(enquiry.details);
  const details = detailRows(enquiry.details);
  const subject = enquiry.subject || "(no subject)";
  const reSubject = replySubject(enquiry.subject);

  return (
    <>
      <Link href="/admin/messages" className="text-muted-foreground mb-3 inline-flex items-center gap-1.5 text-sm hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Messages
      </Link>
      <PageHeader
        title={subject}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <TypeBadge type={enquiry.type} />
            <StatusBadge status={enquiry.status} />
            <span>
              Received <time dateTime={enquiry.createdAt.toISOString()}>{when.format(enquiry.createdAt)}</time> · #{enquiry.id}
            </span>
          </span>
        }
        actions={
          <a href={mailto(enquiry.email, reSubject)} className={buttonVariants({ variant: "outline" })}>
            <Mail /> Reply by email
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section title={enquiry.type === "trade" ? "What they usually buy" : "Message"}>
            {enquiry.message ? (
              <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">{enquiry.message}</div>
            ) : (
              <p className="text-muted-foreground text-sm">No message.</p>
            )}
          </Section>

          {details.length > 0 && (
            <Section title="Details">
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {details.map((d) => (
                  <div key={d.key} className="min-w-0">
                    <dt className="text-muted-foreground text-xs">{d.label}</dt>
                    <dd className="font-medium break-words">{d.value}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          <Section title="Reply">
            <ReplyForm key={enquiry.id} id={enquiry.id} to={enquiry.email} defaultSubject={reSubject} />
          </Section>

          <Section title="Notes and replies" action={<span className="text-muted-foreground text-xs">{notes.length || "None yet"}</span>}>
            {notes.length > 0 && (
              <ol className="mb-4 flex flex-col gap-3">
                {notes.map((n, i) => (
                  <li
                    key={`${n.at}-${i}`}
                    className={cn("rounded-lg border p-3 text-sm", n.kind === "reply" ? "border-sky-200 bg-sky-50/60" : "bg-amber-50/40")}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                      {n.kind === "reply" ? (
                        <Badge className="bg-sky-100 text-sky-800">
                          <MessageSquareReply /> Email reply
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-900">Note</Badge>
                      )}
                      <span className="font-medium">{n.by}</span>
                      <span className="text-muted-foreground">
                        <time dateTime={n.at}>{when.format(new Date(n.at))}</time>
                      </span>
                    </div>
                    {n.kind === "reply" && n.subject && <p className="text-muted-foreground mb-1 text-xs">Subject: {n.subject}</p>}
                    <p className="break-words whitespace-pre-wrap">{n.text}</p>
                  </li>
                ))}
              </ol>
            )}
            <NoteForm id={enquiry.id} />
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          <Section title="Customer">
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="font-medium">{enquiry.name}</p>
                {enquiry.company && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="size-3.5" aria-hidden="true" /> {enquiry.company}
                  </p>
                )}
              </div>
              <a href={mailto(enquiry.email)} className="flex items-center gap-2 break-all text-sky-700 hover:underline">
                <Mail className="size-4 shrink-0" aria-hidden="true" /> {enquiry.email}
              </a>
              {enquiry.phone && (
                <a href={`tel:${enquiry.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-sky-700 hover:underline">
                  <Phone className="size-4 shrink-0" aria-hidden="true" /> {enquiry.phone}
                </a>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <a href={mailto(enquiry.email, reSubject)} className={buttonVariants({ size: "sm" })}>
                  <Mail /> Reply by email
                </a>
                {enquiry.phone && (
                  <a
                    href={`tel:${enquiry.phone.replace(/[^\d+]/g, "")}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <Phone /> Call
                  </a>
                )}
              </div>
              {source.page && (
                <p className="text-muted-foreground border-t pt-3 text-xs break-all">
                  Sent from <span className="text-foreground">{source.page}</span>
                </p>
              )}
            </div>
          </Section>

          <Section title="Status" action={<StatusBadge status={enquiry.status} />}>
            <StatusControls id={enquiry.id} status={enquiry.status} />
          </Section>

          {enquiry.productSlug && (
            <Section title="Product">
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <p className="font-medium">{product?.name ?? enquiry.productSlug}</p>
                  {product?.sku && <p className="text-muted-foreground text-xs">SKU {product.sku}</p>}
                  {!product && <p className="text-muted-foreground text-xs">No longer in the catalogue.</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product && (
                    <Link href={`/admin/products/${product.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <Pencil /> Edit product
                    </Link>
                  )}
                  <a
                    href={`/products/${enquiry.productSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    View in shop <ExternalLink />
                  </a>
                </div>
              </div>
            </Section>
          )}

          <Section title="History">
            {history.length === 0 ? (
              <p className="text-muted-foreground text-sm">No changes yet.</p>
            ) : (
              <ol className="flex flex-col gap-2.5 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex flex-col">
                    <span className="font-medium">{historyLabel(h.action, h.changes)}</span>
                    <span className="text-muted-foreground text-xs">
                      {h.actorEmail ?? "system"} · <time dateTime={h.createdAt.toISOString()}>{when.format(h.createdAt)}</time>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
