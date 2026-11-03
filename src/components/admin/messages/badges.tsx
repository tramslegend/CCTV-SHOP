import { Badge } from "@/components/ui/badge";
import { type EnquiryStatus, type EnquiryType, STATUS_LABEL, TYPE_LABEL } from "@/lib/enquiries/types";
import { cn } from "@/lib/utils";

const TYPE_CLASS: Record<EnquiryType, string> = {
  contact: "bg-muted text-foreground/80",
  quote: "bg-sky-50 text-sky-700",
  trade: "bg-violet-50 text-violet-700",
  parts: "bg-amber-50 text-amber-800",
};

const STATUS_CLASS: Record<EnquiryStatus, string> = {
  new: "bg-brand-600 text-white",
  open: "bg-amber-100 text-amber-900",
  closed: "bg-muted text-muted-foreground",
};

export function TypeBadge({ type, className }: { type: EnquiryType; className?: string }) {
  return <Badge className={cn(TYPE_CLASS[type], className)}>{TYPE_LABEL[type]}</Badge>;
}

export function StatusBadge({ status, className }: { status: EnquiryStatus; className?: string }) {
  return <Badge className={cn(STATUS_CLASS[status], className)}>{STATUS_LABEL[status]}</Badge>;
}
