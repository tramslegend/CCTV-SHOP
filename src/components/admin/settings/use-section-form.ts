"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "@/components/admin/toast";
import type { FieldErrors, SettingsActionResult } from "@/lib/settings/validation";
import { fieldId } from "./fields";

/**
 * State of one settings section: values, the last saved baseline (for "unsaved changes"), inline errors and saving.
 * Saving calls the section's server action; on success the form takes the normalised values the server returns.
 */
export function useSectionForm<V>({
  section,
  initial,
  save,
  onDirtyChange,
}: {
  section: string;
  initial: V;
  save: (values: V) => Promise<SettingsActionResult<V>>;
  onDirtyChange: (section: string, dirty: boolean) => void;
}) {
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, startSaving] = useTransition();
  const dirty = JSON.stringify(values) !== baseline;

  useEffect(() => onDirtyChange(section, dirty), [section, dirty, onDirtyChange]);

  /** Updates values and clears the errors of the fields that changed (`paths`). */
  const update = (fn: (prev: V) => V, ...paths: string[]) => {
    setValues(fn);
    if (paths.length && paths.some((p) => errors[p]))
      setErrors((prev) => {
        const next = { ...prev };
        for (const p of paths) delete next[p];
        return next;
      });
  };

  const submit = () => {
    if (saving) return;
    startSaving(async () => {
      try {
        const result = await save(values);
        if (result.ok) {
          setValues(result.data);
          setBaseline(JSON.stringify(result.data));
          setErrors({});
          toast.success(result.message);
        } else {
          const fieldErrors = result.fieldErrors ?? {};
          setErrors(fieldErrors);
          toast.error(result.message);
          const first = Object.keys(fieldErrors)[0];
          if (first) requestAnimationFrame(() => document.getElementById(fieldId(section, first))?.focus());
        }
      } catch {
        toast.error("The settings couldn't be saved. Check your connection and try again.");
      }
    });
  };

  const discard = () => {
    if (!dirty || window.confirm("Discard the unsaved changes in this section?")) {
      setValues(JSON.parse(baseline) as V);
      setErrors({});
    }
  };

  return { values, update, errors, saving, dirty, submit, discard };
}
