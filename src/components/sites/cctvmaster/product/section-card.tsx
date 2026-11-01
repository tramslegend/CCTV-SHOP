import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** White rounded panel with the source's accent-bar h2 ("Product Description", "Specifications", …). */
export function SectionCard({
  title,
  id,
  headingClassName = "mb-5",
  children,
}: {
  title: string;
  id?: string;
  headingClassName?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="fc-reveal rounded-2xl border border-border bg-white p-5 sm:p-7 lg:p-8">
      <h2 id={id} className={cn("flex items-center gap-3 text-lg font-bold sm:text-xl lg:text-2xl", headingClassName)}>
        <span className="bg-primary h-7 w-1.5 rounded-full" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}
