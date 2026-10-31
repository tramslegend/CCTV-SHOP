import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A titled panel of the product form. Overflow stays visible so picker popups aren't clipped. */
export function FormSection({
  id,
  title,
  description,
  actions,
  className,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-32 rounded-xl bg-white ring-1 ring-black/10", className)}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b px-5 py-3.5">
        <div>
          <h2 id={`${id}-title`} className="text-[15px] font-semibold">
            {title}
          </h2>
          {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  );
}
