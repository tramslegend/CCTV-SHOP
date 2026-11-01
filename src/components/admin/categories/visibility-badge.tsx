import { cn } from "@/lib/utils";

const pill = "inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap";

/** Whether customers can see the category: visible, hidden, or hidden because a parent is hidden. */
export function VisibilityBadge({ visible, hiddenByParent, className }: { visible: boolean; hiddenByParent?: boolean; className?: string }) {
  if (!visible) return <span className={cn(pill, "border-border bg-muted text-foreground/80", className)}>Hidden</span>;
  if (hiddenByParent)
    return (
      <span className={cn(pill, "border-amber-200 bg-amber-50 text-amber-800", className)} title="A parent category is hidden, so the shop hides this one too.">
        Parent hidden
      </span>
    );
  return <span className={cn(pill, "border-emerald-200 bg-emerald-50 text-emerald-800", className)}>Visible</span>;
}
