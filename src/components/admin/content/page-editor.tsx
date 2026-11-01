"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, Download, ExternalLink, Eye, FileText, Loader2, MoreHorizontal, PencilLine, RotateCcw, Save, Scale, Undo2 } from "lucide-react";
import { importPageContent, revertPage, savePage } from "@/app/admin/(panel)/content/pages/actions";
import { CharCount, FormField, invalidProps } from "@/components/admin/form-field";
import { FormSection } from "@/components/admin/products/form-section";
import { AdminToaster, toast } from "@/components/admin/toast";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { ManagedPage } from "@/components/sites/cctvmaster/content/managed-page";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { newBlock, tokenValues, type BlockType, type PageBlock } from "@/lib/content/blocks";
import type { PageDef } from "@/lib/content/pages";
import type { ShopSettings } from "@/lib/settings/schema";
import { cn } from "@/lib/utils";
import { AddBlockMenu, BlockEditor } from "./block-editor";
import { fieldId, move } from "./faq-editor";
import { PageStatusBadge } from "./status";
import { TokenHelp } from "./token-help";
import { type FieldErrors, PAGE_STATUS_LABELS, type PageEditorMeta, type PageFormValues, type PageStatus } from "./types";

function focusFirstError(keys: string[]) {
  requestAnimationFrame(() => {
    let target = document.querySelector<HTMLElement>("#page-editor [aria-invalid='true']");
    for (const key of keys) {
      if (target) break;
      const parts = key.split(".");
      while (parts.length && !target) {
        target = document.getElementById(fieldId("pg", parts.join(".")));
        parts.pop();
      }
    }
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  });
}

/** Editor for one information page: details, ordered content blocks, preview, publish/draft, import and revert. */
export function PageEditor({
  def,
  meta,
  initialValues,
  settings,
  nowIso,
}: {
  def: PageDef;
  meta: PageEditorMeta;
  initialValues: PageFormValues;
  settings: ShopSettings;
  /** Server time, used as the "last updated" date in the preview of an unsaved page. */
  nowIso: string;
}) {
  const [values, setValues] = useState(initialValues);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialValues));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [uploads, setUploads] = useState(0);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [saving, startSaving] = useTransition();
  const [working, startWorking] = useTransition();

  const dirty = JSON.stringify(values) !== baseline;
  const uploading = uploads > 0;
  useUnsavedChanges(dirty && !saving);
  const tokens = tokenValues(settings);

  const clearErrors = (prefix: string) =>
    setErrors((e) => {
      const keys = Object.keys(e).filter((k) => k === prefix || k.startsWith(`${prefix}.`));
      if (!keys.length) return e;
      const next = { ...e };
      for (const k of keys) delete next[k];
      return next;
    });
  const set = <K extends keyof PageFormValues>(key: K, value: PageFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    clearErrors(key);
  };
  const setBlocks = (fn: (blocks: PageBlock[]) => PageBlock[]) => {
    setValues((v) => ({ ...v, blocks: fn(v.blocks) }));
    clearErrors("blocks");
  };
  const addBlock = (type: BlockType, at?: number) => {
    const block = newBlock(type);
    setBlocks((list) => {
      const next = [...list];
      next.splice(at ?? list.length, 0, block);
      return next;
    });
    requestAnimationFrame(() => {
      const el = document.getElementById(fieldId("pg", `block.${block.id}`));
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.querySelector<HTMLElement>("input, textarea")?.focus({ preventScroll: true });
    });
  };

  const save = () => {
    if (saving) return;
    if (uploading) return void toast.error("Wait for the images to finish uploading, then save.");
    const payload = values;
    startSaving(async () => {
      try {
        const result = await savePage(def.slug, payload);
        if (result.ok) {
          setErrors({});
          setFormError(null);
          setBaseline(JSON.stringify(payload));
          toast.success(result.message);
        } else {
          const fieldErrors = result.fieldErrors ?? {};
          setErrors(fieldErrors);
          setFormError(result.message);
          setTab("edit");
          toast.error(result.message);
          focusFirstError(Object.keys(fieldErrors));
        }
      } catch {
        setFormError("The page couldn't be saved. Check your connection and try again.");
        toast.error("The page couldn't be saved. Try again.");
      }
    });
  };

  const discard = () => {
    if (!dirty || window.confirm("Discard all unsaved changes?")) {
      setValues(JSON.parse(baseline) as PageFormValues);
      setErrors({});
      setFormError(null);
    }
  };

  const importCurrent = () => {
    if (values.blocks.length && !window.confirm("Replace the heading, intro and blocks below with the page's current built-in content?")) return;
    startWorking(async () => {
      const result = await importPageContent(def.slug);
      if (!result.ok) return void toast.error(result.message);
      const { title, intro, metaDescription, blocks } = result.data;
      setValues((v) => ({ ...v, title, intro, metaDescription, blocks }));
      setErrors({});
      setFormError(null);
      toast.success(blocks.length ? `Loaded ${blocks.length} blocks from the current page. Review them, then save.` : result.message);
    });
  };

  const revert = () =>
    startWorking(async () => {
      const result = await revertPage(def.slug);
      setConfirmRevert(false);
      if (!result.ok) return void toast.error(result.message);
      // The page re-renders with the built-in defaults; nothing left to lose.
      setBaseline(JSON.stringify(values));
      toast.success(result.message);
    });

  const liveNow = meta.saved && meta.status === "active";
  const errorCount = Object.keys(errors).length;
  const field = (key: string) => ({ id: fieldId("pg", key), error: errors[key] });
  const slotNote = def.fixed ? (
    <div className="mx-auto my-8 max-w-5xl px-4">
      <div className="text-muted-foreground rounded-xl border-2 border-dashed px-6 py-8 text-center text-sm">{def.fixed}</div>
    </div>
  ) : undefined;

  return (
    <form
      id="page-editor"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          save();
        }
      }}
    >
      <AdminToaster />
      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/content/pages" className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Back to pages">
            <ArrowLeft />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{def.label}</h1>
              <PageStatusBadge status={meta.saved ? meta.status : null} />
            </div>
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {saving ? "Saving…" : uploading ? "Uploading images…" : dirty ? "Unsaved changes" : meta.saved ? `Saved ${meta.updatedLabel ?? ""}` : "Showing the built-in page"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={def.path} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              View page <ExternalLink />
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" disabled={working} aria-label="More actions" />}>
                {working ? <Loader2 className="animate-spin" /> : <MoreHorizontal />} More
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={importCurrent}>
                  <Download /> Import current content
                </DropdownMenuItem>
                {meta.saved && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setConfirmRevert(true)}>
                      <Undo2 /> Revert to the built-in page…
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {dirty && (
              <Button type="button" variant="ghost" size="sm" onClick={discard} disabled={saving}>
                <RotateCcw /> Discard
              </Button>
            )}
            <Button type="submit" size="sm" disabled={saving || uploading || !dirty}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {values.status === "active" ? "Save & publish" : "Save draft"}
            </Button>
          </div>
        </div>
      </div>

      {formError && (
        <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">{formError}</p>
            {errorCount > 0 && <p className="mt-0.5 text-xs">{errorCount === 1 ? "1 field needs" : `${errorCount} fields need`} attention.</p>}
          </div>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="inline-flex self-start rounded-lg bg-border/60 p-0.5 text-sm" role="tablist" aria-label="Editor view">
            {(
              [
                { key: "edit", label: "Edit", icon: PencilLine },
                { key: "preview", label: "Preview", icon: Eye },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium", tab === t.key ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <t.icon className="size-3.5" aria-hidden="true" /> {t.label}
              </button>
            ))}
          </div>

          {tab === "preview" ? (
            <section aria-label="Preview" className="overflow-hidden rounded-xl bg-white ring-1 ring-black/10">
              <div className="text-muted-foreground flex items-center justify-between border-b bg-surface px-4 py-2 text-xs">
                <span>
                  Preview of <span className="font-medium text-foreground">{def.path}</span> with your unsaved changes
                </span>
                <span>{values.status === "active" ? "Will be published" : "Draft: the shop keeps the built-in page"}</span>
              </div>
              <div className="pointer-events-auto max-h-[75vh] overflow-y-auto">
                <ManagedPage
                  page={{ slug: def.slug, ...values, updatedAt: meta.updatedAt && !dirty ? meta.updatedAt : nowIso }}
                  settings={settings}
                  slot={slotNote}
                />
              </div>
            </section>
          ) : (
            <>
              <FormSection id="details" title="Page details">
                <FormField {...field("title")} label="Heading" required hint="The page's main heading, also used as its title in search results.">
                  <Input id="pg-title" value={values.title} maxLength={200} onChange={(e) => set("title", e.target.value)} {...invalidProps("pg-title", errors.title)} />
                </FormField>
                <FormField
                  {...field("intro")}
                  label="Intro"
                  hint={def.layout === "legal" ? "Optional lead paragraph above the first section." : "The short paragraph under the heading."}
                  labelAside={<CharCount value={values.intro} recommended={240} max={1500} />}
                >
                  <Textarea id="pg-intro" rows={3} value={values.intro} maxLength={1500} onChange={(e) => set("intro", e.target.value)} {...invalidProps("pg-intro", errors.intro)} />
                </FormField>
                <FormField
                  {...field("metaDescription")}
                  label="Meta description"
                  hint="Shown under the title in search results. Around 150–160 characters works best."
                  labelAside={<CharCount value={values.metaDescription} recommended={160} max={320} />}
                >
                  <Textarea
                    id="pg-metaDescription"
                    rows={2}
                    value={values.metaDescription}
                    maxLength={320}
                    onChange={(e) => set("metaDescription", e.target.value)}
                    {...invalidProps("pg-metaDescription", errors.metaDescription)}
                  />
                </FormField>
              </FormSection>

              <FormSection
                id="blocks"
                title="Content"
                description={
                  <>
                    {def.summary} {def.fixed}
                  </>
                }
                actions={values.blocks.length > 0 ? <AddBlockMenu onAdd={(type) => addBlock(type)} /> : undefined}
              >
                {errors.blocks && (
                  <p id="pg-blocks" tabIndex={-1} className="text-sm text-red-700">
                    {errors.blocks}
                  </p>
                )}
                {values.blocks.length ? (
                  <ol className="flex flex-col gap-3" aria-label="Content blocks">
                    {values.blocks.map((block, i) => (
                      <BlockEditor
                        key={block.id}
                        block={block}
                        index={i}
                        count={values.blocks.length}
                        errors={errors}
                        onChange={(next) => {
                          setValues((v) => ({ ...v, blocks: v.blocks.map((b) => (b.id === block.id ? next : b)) }));
                          clearErrors(`block.${block.id}`);
                        }}
                        onMove={(to) => setBlocks((list) => move(list, i, to))}
                        onRemove={() => {
                          const empty =
                            (block.type === "heading" && !block.text) ||
                            (block.type === "text" && !block.markdown) ||
                            (block.type === "image" && !block.url);
                          if (!empty && !window.confirm("Remove this block?")) return;
                          setBlocks((list) => list.filter((b) => b.id !== block.id));
                          clearErrors(`block.${block.id}`);
                        }}
                        onInsertAfter={(type) => addBlock(type, i + 1)}
                        onUploadingChange={(u) => setUploads((n) => Math.max(0, n + (u ? 1 : -1)))}
                      />
                    ))}
                  </ol>
                ) : (
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
                    <FileText className="text-muted-foreground size-7" aria-hidden="true" />
                    <div>
                      <p className="font-medium">{meta.saved ? "No content blocks yet" : "This page shows its built-in content"}</p>
                      <p className="text-muted-foreground mt-1 max-w-md text-sm">
                        Import the current content to edit it as blocks, or start from scratch. Nothing changes in the shop until you publish.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button type="button" size="sm" onClick={importCurrent} disabled={working}>
                        {working ? <Loader2 className="animate-spin" /> : <Download />} Import current content
                      </Button>
                      <AddBlockMenu onAdd={(type) => addBlock(type)} label="Start with a block" />
                    </div>
                  </div>
                )}
                {values.blocks.length > 0 && (
                  <div className="flex justify-center border-t border-dashed pt-4">
                    <AddBlockMenu onAdd={(type) => addBlock(type)} />
                  </div>
                )}
              </FormSection>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-36">
          <FormSection id="visibility" title="Visibility">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm" role="radiogroup" aria-label="Visibility">
              {(["active", "draft"] as PageStatus[]).map((s) => (
                <button
                  key={s}
                  id={s === "active" ? "pg-status" : undefined}
                  type="button"
                  role="radio"
                  aria-checked={values.status === s}
                  onClick={() => set("status", s)}
                  className={cn("rounded-md px-2 py-1.5 font-medium", values.status === s ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {PAGE_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              {values.status === "active"
                ? `Published: ${def.path} shows this version instead of the built-in page.`
                : `Draft: saved here only. ${def.path} keeps showing ${liveNow ? "the built-in page (your published version is taken down when you save)" : "the built-in page"}.`}
            </p>
            <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t pt-3 text-xs">
              <dt>In the shop now</dt>
              <dd className="text-foreground">{liveNow ? "Your version" : "Built-in page"}</dd>
              <dt>Last saved</dt>
              <dd className="text-foreground">{meta.updatedLabel ?? "Never"}</dd>
              <dt>Address</dt>
              <dd className="text-foreground">{def.path}</dd>
            </dl>
          </FormSection>

          {def.legal && (
            <section className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <Scale className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Legal text is your responsibility</p>
                <p className="mt-1 text-xs leading-relaxed">
                  The built-in text is a short general summary generated from your shop details. It isn&apos;t legal advice and may not fit your business.
                  Check this page with a qualified adviser and keep it accurate. Whatever you publish here is what customers see as your policy.
                </p>
              </div>
            </section>
          )}

          <TokenHelp values={tokens} />
        </aside>
      </div>

      <AlertDialog open={confirmRevert} onOpenChange={setConfirmRevert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to the built-in page?</AlertDialogTitle>
            <AlertDialogDescription>
              Your version of {def.label.toLowerCase()} is deleted and {def.path} shows the built-in content again. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={revert} disabled={working}>
              {working ? <Loader2 className="animate-spin" /> : <Undo2 />} Revert
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
