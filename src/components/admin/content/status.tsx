import { cn } from "@/lib/utils";
import { PAGE_STATUS_LABELS, POST_STATUS_LABELS, type PageStatus, type PostStatus } from "./types";

const pill = "inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap";

const STYLE: Record<PostStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  draft: "border-border bg-muted text-foreground/80",
  archived: "border-amber-200 bg-amber-50 text-amber-800",
};

/** A page's state: built in (no custom version), or the custom version's status. */
export function PageStatusBadge({ status, className }: { status: PageStatus | null; className?: string }) {
  if (!status) return <span className={cn(pill, "border-border bg-white text-muted-foreground", className)}>Built-in</span>;
  return <span className={cn(pill, STYLE[status], className)}>{status === "active" ? "Your version · published" : `Your version · ${PAGE_STATUS_LABELS[status].toLowerCase()}`}</span>;
}

export function PostStatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  return <span className={cn(pill, STYLE[status], className)}>{POST_STATUS_LABELS[status]}</span>;
}
