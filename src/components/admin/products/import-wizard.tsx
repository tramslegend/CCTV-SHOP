"use client";

// Spreadsheet import, step by step: choose a CSV file → check it (every row previewed; nothing changes yet) → import
// → results. The file is read in the browser (UTF-8, or Windows-1252 as older Excel versions save "CSV") and sent as
// text to /admin/products/api/import.
import Link from "next/link";
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, RotateCcw, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  IMPORT_COLUMNS,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  type ImportAction,
  type ImportOutcome,
  type ImportPreview,
  type ImportResponse,
  type ImportResult,
} from "./import-types";
import { STATUS_LABELS } from "./types";

type Phase =
  | { step: "choose" }
  | { step: "checking"; fileName: string }
  | { step: "preview" | "importing"; fileName: string; csv: string; preview: ImportPreview }
  | { step: "done"; fileName: string; result: ImportResult };

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const n = (v: number) => v.toLocaleString("en-GB");
const plural = (count: number, one: string, many = `${one}s`) => `${n(count)} ${count === 1 ? one : many}`;

async function readCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

async function send(mode: "preview" | "run", csv: string): Promise<ImportResponse> {
  let res: Response;
  try {
    res = await fetch("/admin/products/api/import", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ mode, csv }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "The shop couldn't be reached. Check your connection and try again." };
  }
  if (res.redirected) return { ok: false, error: "Your session has ended. Sign in again in another tab, then try again." };
  try {
    return (await res.json()) as ImportResponse;
  } catch {
    return {
      ok: false,
      error:
        mode === "run"
          ? "The import took longer than the server allows. Rows saved so far stay saved: import the same file again to finish."
          : "The shop sent an unexpected answer. Try again.",
    };
  }
}

const ACTION_BADGE: Record<ImportAction, { label: string; className: string }> = {
  create: { label: "New", className: "bg-emerald-50 text-emerald-700" },
  update: { label: "Update", className: "bg-sky-50 text-sky-700" },
  error: { label: "Problem", className: "bg-red-50 text-red-700" },
};
const OUTCOME_BADGE: Record<ImportOutcome, { label: string; className: string }> = {
  created: { label: "Created", className: "bg-emerald-50 text-emerald-700" },
  updated: { label: "Updated", className: "bg-sky-50 text-sky-700" },
  unchanged: { label: "No changes", className: "bg-zinc-100 text-zinc-600" },
  failed: { label: "Not imported", className: "bg-red-50 text-red-700" },
};

export function ImportWizard() {
  const [phase, setPhase] = useState<Phase>({ step: "choose" });
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [filter, setFilter] = useState<"all" | ImportAction>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  async function check(file: File) {
    setError(null);
    if (/\.(xlsx|xlsm|xls|numbers|ods)$/i.test(file.name)) {
      setError("This is a spreadsheet workbook, not a CSV file. In Excel choose File → Save As → “CSV UTF-8 (Comma delimited)”, then choose the saved file.");
      return;
    }
    if (file.size > IMPORT_MAX_BYTES) {
      setError(`This file is larger than 4 MB. Split it into smaller files of up to ${n(IMPORT_MAX_ROWS)} products each.`);
      return;
    }
    setPhase({ step: "checking", fileName: file.name });
    const csv = await readCsvFile(file);
    const res = await send("preview", csv);
    if (!res.ok || res.kind !== "preview") {
      setError(res.ok ? "The shop sent an unexpected answer. Try again." : res.error);
      setPhase({ step: "choose" });
      return;
    }
    setFilter("all");
    setPhase({ step: "preview", fileName: file.name, csv, preview: res });
  }

  async function runImport() {
    if (phase.step !== "preview") return;
    setError(null);
    setPhase({ ...phase, step: "importing" });
    const res = await send("run", phase.csv);
    if (!res.ok || res.kind !== "result") {
      setError(res.ok ? "The shop sent an unexpected answer. Try again." : res.error);
      setPhase({ ...phase, step: "preview" });
      return;
    }
    setPhase({ step: "done", fileName: phase.fileName, result: res });
  }

  function reset() {
    setError(null);
    setPhase({ step: "choose" });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {(phase.step === "choose" || phase.step === "checking") && (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file && phase.step === "choose") void check(file);
            }}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-white px-6 py-12 text-center transition-colors",
              dragging ? "border-zinc-900 bg-zinc-50" : "border-zinc-300",
            )}
          >
            {phase.step === "checking" ? (
              <>
                <Loader2 className="size-8 animate-spin text-zinc-400" aria-hidden="true" />
                <p className="font-medium" role="status">
                  Checking {phase.fileName}…
                </p>
                <p className="text-muted-foreground text-sm">Every row is checked. Nothing in the shop changes yet.</p>
              </>
            ) : (
              <>
                <FileSpreadsheet className="size-8 text-zinc-400" aria-hidden="true" />
                <div>
                  <p className="font-medium">Choose a CSV file, or drag it here</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Save your spreadsheet as CSV (in Excel: File → Save As → CSV UTF-8). Up to {n(IMPORT_MAX_ROWS)} products per file.
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  id="import-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void check(file);
                  }}
                />
                <label htmlFor="import-file" className={cn(buttonVariants(), "cursor-pointer")}>
                  <Upload /> Choose file
                </label>
              </>
            )}
          </div>
          <ColumnGuide />
        </>
      )}

      {(phase.step === "preview" || phase.step === "importing") && (
        <PreviewStep phase={phase} filter={filter} onFilter={setFilter} onImport={runImport} onReset={reset} />
      )}

      {phase.step === "done" && <ResultStep fileName={phase.fileName} result={phase.result} onReset={reset} />}
    </div>
  );
}

function PreviewStep({
  phase,
  filter,
  onFilter,
  onImport,
  onReset,
}: {
  phase: { step: "preview" | "importing"; fileName: string; preview: ImportPreview };
  filter: "all" | ImportAction;
  onFilter: (f: "all" | ImportAction) => void;
  onImport: () => void;
  onReset: () => void;
}) {
  const { preview } = phase;
  const importing = phase.step === "importing";
  const importable = preview.counts.create + preview.counts.update;
  const rows = filter === "all" ? preview.rows : preview.rows.filter((r) => r.action === filter);
  const tabs: { key: "all" | ImportAction; label: string; count: number }[] = [
    { key: "all", label: "All rows", count: preview.rows.length },
    { key: "create", label: "New", count: preview.counts.create },
    { key: "update", label: "Updates", count: preview.counts.update },
    { key: "error", label: "Problems", count: preview.counts.error },
  ];

  return (
    <section aria-labelledby="preview-title" className="space-y-4">
      <div className="rounded-xl border bg-white p-5">
        <h2 id="preview-title" className="font-semibold">
          {phase.fileName}: checked, nothing changed yet
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {plural(preview.counts.create, "new product")}, {plural(preview.counts.update, "update")}
          {preview.counts.error ? `, ${plural(preview.counts.error, "row")} with problems (skipped unless you fix them and check the file again)` : ""}.
        </p>
        {!!preview.newCategories.length && (
          <p className="mt-2 text-sm">
            <span className="font-medium">New categories to create:</span> {preview.newCategories.join(", ")}
          </p>
        )}
        {!!preview.ignoredColumns.length && (
          <p className="text-muted-foreground mt-2 text-sm">
            Columns not used (names not recognised): {preview.ignoredColumns.join(", ")}.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={onImport} disabled={importing || !importable}>
            {importing ? <Loader2 className="animate-spin" /> : <Upload />}
            {importing ? "Importing…" : importable ? `Import ${plural(importable, "product")}` : "Nothing to import"}
          </Button>
          <Button variant="outline" onClick={onReset} disabled={importing}>
            <RotateCcw /> Choose another file
          </Button>
        </div>
        {importing && (
          <p className="text-muted-foreground mt-3 text-sm" role="status">
            Saving products and downloading images. Large files can take a few minutes: keep this page open.
          </p>
        )}
      </div>

      <nav aria-label="Filter rows" className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onFilter(t.key)}
            aria-pressed={filter === t.key}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              filter === t.key ? "border-zinc-900 text-zinc-950" : "border-transparent text-zinc-500 hover:text-zinc-900",
            )}
          >
            {t.label}
            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", filter === t.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600")}>
              {n(t.count)}
            </span>
          </button>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Row</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Price ex VAT</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Images</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.line} className="align-top">
                <TableCell className="text-muted-foreground tabular-nums">{r.line}</TableCell>
                <TableCell className="max-w-xs whitespace-normal">
                  <p className="font-medium">{r.name || <span className="text-muted-foreground italic">No name</span>}</p>
                  <p className="text-muted-foreground font-mono text-xs">{r.sku || "—"}</p>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.price === null ? "—" : gbp.format(r.price)}</TableCell>
                <TableCell>{r.status ? STATUS_LABELS[r.status] : "—"}</TableCell>
                <TableCell className="max-w-56 whitespace-normal">{r.category ?? <span className="text-muted-foreground">None</span>}</TableCell>
                <TableCell className="text-right tabular-nums">{r.images}</TableCell>
                <TableCell className="max-w-md whitespace-normal">
                  <Badge className={ACTION_BADGE[r.action].className}>{ACTION_BADGE[r.action].label}</Badge>
                  {r.errors.map((e) => (
                    <p key={e} className="mt-1 text-sm text-red-700">
                      {e}
                    </p>
                  ))}
                  {r.notes.map((note) => (
                    <p key={note} className="text-muted-foreground mt-1 text-xs">
                      {note}
                    </p>
                  ))}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                  No rows in this group.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function ResultStep({ fileName, result, onReset }: { fileName: string; result: ImportResult; onReset: () => void }) {
  const { counts } = result;
  const notable = result.rows.filter((r) => r.outcome === "failed" || r.warnings.length);
  return (
    <section aria-labelledby="result-title" className="space-y-4">
      <div className="rounded-xl border bg-white p-5">
        <h2 id="result-title" className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
          {fileName} imported
        </h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
          {(["created", "updated", "unchanged", "failed"] as const).map((k) => (
            <li key={k} className="rounded-lg bg-zinc-50 px-3 py-2">
              <span className="block text-xl font-semibold tabular-nums">{n(counts[k])}</span>
              <span className="text-muted-foreground">{OUTCOME_BADGE[k].label}</span>
            </li>
          ))}
        </ul>
        {!!result.newCategories.length && (
          <p className="mt-3 text-sm">
            <span className="font-medium">Categories created:</span> {result.newCategories.join(", ")}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/products" className={buttonVariants()}>
            View products
          </Link>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw /> Import another file
          </Button>
        </div>
      </div>

      {!!notable.length && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <p className="border-b px-4 py-3 text-sm font-medium">Rows to look at</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Row</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notable.map((r) => (
                <TableRow key={r.line} className="align-top">
                  <TableCell className="text-muted-foreground tabular-nums">{r.line}</TableCell>
                  <TableCell className="max-w-xs whitespace-normal">
                    {r.productId ? (
                      <Link href={`/admin/products/${r.productId}`} className="font-medium hover:underline">
                        {r.name || r.sku}
                      </Link>
                    ) : (
                      <p className="font-medium">{r.name || <span className="text-muted-foreground italic">No name</span>}</p>
                    )}
                    <p className="text-muted-foreground font-mono text-xs">{r.sku || "—"}</p>
                  </TableCell>
                  <TableCell className="max-w-xl whitespace-normal">
                    <Badge className={OUTCOME_BADGE[r.outcome].className}>{OUTCOME_BADGE[r.outcome].label}</Badge>
                    {r.message && <p className="mt-1 text-sm text-red-700">{r.message}</p>}
                    {r.warnings.map((w) => (
                      <p key={w} className="mt-1 text-sm text-amber-700">
                        {w}
                      </p>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

/** What goes in each column, from the same list the import reads. */
function ColumnGuide() {
  return (
    <details className="group rounded-xl border bg-white">
      <summary className="cursor-pointer px-5 py-4 font-medium select-none">What goes in each column</summary>
      <div className="border-t px-5 py-4">
        <ul className="text-muted-foreground mb-4 list-disc space-y-1 pl-5 text-sm">
          <li>Each row is one product. The first row holds the column names; columns can be in any order and unused ones left out.</li>
          <li>A SKU that&apos;s already in the shop updates that product. Blank cells keep its current value.</li>
          <li>Ready-made kits aren&apos;t imported: edit them on their own product page.</li>
        </ul>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Column</TableHead>
                <TableHead>What to write</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {IMPORT_COLUMNS.map((c) => (
                <TableRow key={c.key} className="align-top">
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {c.header}
                    {c.required && (
                      <span className="ml-2 font-sans text-[11px] text-red-700">{c.required === "always" ? "required" : "required for new"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm whitespace-normal">{c.help}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </details>
  );
}
