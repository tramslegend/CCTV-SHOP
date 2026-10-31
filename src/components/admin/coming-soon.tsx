import { Construction } from "lucide-react";
import { PageHeader } from "./page-header";

/** Placeholder for back-office areas scheduled in a later build phase. */
export function ComingSoon({ title, phase, items }: { title: string; phase: string; items: string[] }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-xl border border-dashed bg-white p-8">
        <div className="flex items-center gap-3">
          <Construction className="text-muted-foreground size-5" aria-hidden="true" />
          <p className="font-medium">Arriving in {phase}</p>
        </div>
        <ul className="text-muted-foreground mt-4 list-disc space-y-1 pl-10 text-sm">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
