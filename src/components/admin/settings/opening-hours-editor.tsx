"use client";

import { Plus, Trash2 } from "lucide-react";
import { FieldMessage, invalidProps } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OpeningHoursRow } from "@/lib/settings/schema";
import type { FieldErrors } from "@/lib/settings/validation";
import { fieldId } from "./fields";

const TYPICAL: OpeningHoursRow[] = [
  { days: "Mon – Fri", hours: "09:00 – 17:00" },
  { days: "Saturday", hours: "09:00 – 14:00" },
  { days: "Sunday", hours: "Closed" },
];

/** Rows of "days → hours" shown on the contact and visit pages. Empty rows are ignored when saving. */
export function OpeningHoursEditor({
  section,
  rows,
  onChange,
  errors,
}: {
  section: string;
  rows: OpeningHoursRow[];
  onChange: (rows: OpeningHoursRow[], changedPath?: string) => void;
  errors: FieldErrors;
}) {
  const set = (i: number, key: keyof OpeningHoursRow, value: string) =>
    onChange(
      rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)),
      `openingHours.${i}.${key}`,
    );

  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 ? (
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm">
          No opening hours: the contact and visit pages won&apos;t show any.
          <Button type="button" variant="outline" size="xs" onClick={() => onChange(TYPICAL.map((r) => ({ ...r })))}>
            Start from typical hours
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Opening hours">
          {rows.map((row, i) => {
            const daysId = fieldId(section, `openingHours.${i}.days`);
            const hoursId = fieldId(section, `openingHours.${i}.hours`);
            const daysError = errors[`openingHours.${i}.days`];
            const hoursError = errors[`openingHours.${i}.hours`];
            return (
              <li key={i} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    id={daysId}
                    aria-label={`Days, row ${i + 1}`}
                    placeholder="Mon – Fri"
                    value={row.days}
                    maxLength={40}
                    onChange={(e) => set(i, "days", e.target.value)}
                    className="sm:max-w-48"
                    {...invalidProps(daysId, daysError)}
                  />
                  <Input
                    id={hoursId}
                    aria-label={`Hours, row ${i + 1}`}
                    placeholder="09:00 – 17:00 or Closed"
                    value={row.hours}
                    maxLength={40}
                    onChange={(e) => set(i, "hours", e.target.value)}
                    {...invalidProps(hoursId, hoursError)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove row ${i + 1}`}
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <FieldMessage id={daysError ? daysId : hoursId} error={daysError ?? hoursError} />
              </li>
            );
          })}
        </ul>
      )}
      {rows.length > 0 && rows.length < 10 && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onChange([...rows, { days: "", hours: "" }])}>
          <Plus /> Add row
        </Button>
      )}
      <FieldMessage id={fieldId(section, "openingHours")} error={errors.openingHours} />
    </div>
  );
}
