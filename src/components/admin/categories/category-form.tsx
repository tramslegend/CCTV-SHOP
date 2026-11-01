"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, ExternalLink, Loader2, RotateCcw, Save, Sparkles, X } from "lucide-react";
import { createCategory, updateCategory } from "@/app/admin/(panel)/categories/actions";
import { CharCount, FormField, invalidProps } from "@/components/admin/form-field";
import { DescriptionEditor } from "@/components/admin/products/description-editor";
import { FormSection } from "@/components/admin/products/form-section";
import { MONO, slugify } from "@/components/admin/products/utils";
import { SearchPicker } from "@/components/admin/search-picker";
import { AdminToaster, toast } from "@/components/admin/toast";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { KitFacts } from "@/lib/admin/categories/kit-rule";
import type { CategoryFormValues, CategoryMeta, CategoryOption, FieldErrors } from "@/lib/admin/categories/types";
import { cn } from "@/lib/utils";
import { CategoryDeleteButton } from "./category-delete-button";
import { CategoryImageField } from "./category-image-field";
import { KitRuleEditor } from "./kit-rule-editor";
import { VisibilityBadge } from "./visibility-badge";

const KIT_ROOT_SLUG = "cctv-kits";
const META_RECOMMENDED = 160;

/** Matches every word of the query against the category's full path. */
const pathMatches = (o: CategoryOption, q: string) => {
  const text = o.path.join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => text.includes(w));
};

function PathLabel({ option }: { option: CategoryOption }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm">{option.name}</span>
      {option.path.length > 1 && <span className="text-muted-foreground truncate text-xs">{option.path.slice(0, -1).join(" › ")}</span>}
    </span>
  );
}

function focusFirstError() {
  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>("#category-form [aria-invalid='true']");
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    // A picker opens its list on focus, which would cover the message under it: only scroll to those.
    if (target?.getAttribute("role") !== "combobox") target?.focus({ preventScroll: true });
  });
}

export function CategoryForm({
  mode,
  initialValues,
  meta,
  options,
  descendantIds = [],
  parentHidden,
  kits,
  children,
}: {
  mode: "create" | "edit";
  initialValues: CategoryFormValues;
  meta?: CategoryMeta;
  /** Every category in tree order (parent choices are filtered to the same type). */
  options: CategoryOption[];
  /** This category and everything below it: they can't become its parent. */
  descendantIds?: number[];
  /** Whether a parent of the saved category is hidden (then the shop hides this one too). */
  parentHidden: boolean;
  /** Kits in the shop, for the kit rule's live count (kit ranges only). */
  kits: KitFacts[];
  /** Sections shown under the form (products in the category, kits in the range). */
  children?: ReactNode;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialValues));
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, startSaving] = useTransition();

  const isKitRange = values.isKitRange;
  const isKitRoot = meta?.slug === KIT_ROOT_SLUG;
  const dirty = JSON.stringify(values) !== baseline;
  useUnsavedChanges(dirty && !saving);
  const saved = JSON.parse(baseline) as CategoryFormValues;

  const clearError = (key: string) =>
    setErrors((e) => {
      const keys = Object.keys(e).filter((k) => k === key || k.startsWith(`${key}.`));
      if (!keys.length) return e;
      const next = { ...e };
      for (const k of keys) delete next[k];
      return next;
    });
  const set = <K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    clearError(key);
  };

  const save = () => {
    if (saving) return;
    if (uploading) return void toast.error("Wait for the image to finish uploading, then save.");
    const payload = values;
    startSaving(async () => {
      try {
        const result = mode === "create" || !meta ? await createCategory(payload) : await updateCategory(meta.id, payload);
        if (result.ok) {
          setErrors({});
          setFormError(null);
          setBaseline(JSON.stringify(payload));
          toast.success(result.message);
          if (mode === "create") router.push(`/admin/categories/${result.data.id}`);
        } else {
          setErrors(result.fieldErrors ?? {});
          setFormError(result.message);
          toast.error(result.message);
          focusFirstError();
        }
      } catch {
        setFormError("The category couldn't be saved. Check your connection and try again.");
        toast.error("The category couldn't be saved. Try again.");
      }
    });
  };

  const discard = () => {
    if (!dirty || window.confirm("Discard all unsaved changes?")) {
      setValues(saved);
      setErrors({});
      setFormError(null);
    }
  };

  // ----- parent choices: same type, never itself or anything below it -----
  const byId = new Map(options.map((o) => [o.id, o]));
  const blocked = new Set(descendantIds);
  const parentChoices = options.filter((o) => o.isKitRange === isKitRange && o.id !== meta?.id);
  const parent = values.parentId !== null ? byId.get(values.parentId) : undefined;
  const searchParents = (q: string) => (q ? parentChoices.filter((o) => pathMatches(o, q)) : parentChoices).slice(0, 80);

  const slugChanged = mode === "edit" && values.slug !== saved.slug;
  const errorCount = Object.keys(errors).length;
  const field = (key: string) => ({ id: `cf-${key}`, error: errors[key] });
  const heading = mode === "create" ? (isKitRange ? "New kit range" : "New category") : saved.name || "Untitled category";
  const shopHref = meta?.shopHref ?? null;

  return (
    <div
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          save();
        }
      }}
    >
      <AdminToaster />
      {/* Title + save bar: stays under the admin header while scrolling. */}
      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/categories" className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Back to categories">
            <ArrowLeft />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{heading}</h1>
              {mode === "edit" && <VisibilityBadge visible={saved.visible} hiddenByParent={parentHidden} />}
              {isKitRange && <span className="rounded-full border bg-white px-2 text-xs leading-5 font-medium">Kit range</span>}
            </div>
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {saving ? "Saving…" : uploading ? "Uploading image…" : dirty ? "Unsaved changes" : mode === "edit" ? "All changes saved" : "Not saved yet"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === "edit" &&
              (shopHref ? (
                <a href={shopHref} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  View in shop <ExternalLink />
                </a>
              ) : (
                <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")} title="Hidden from the shop">
                  View in shop <ExternalLink />
                </span>
              ))}
            {meta && (
              <CategoryDeleteButton
                id={meta.id}
                name={saved.name}
                childCount={meta.childCount}
                primaryCount={meta.primaryCount}
                linkCount={meta.linkCount}
                isKitRoot={isKitRoot}
              />
            )}
            {dirty && (
              <Button type="button" variant="ghost" size="sm" onClick={discard} disabled={saving}>
                <RotateCcw /> Discard
              </Button>
            )}
            <Button type="button" size="sm" onClick={save} disabled={saving || uploading || (mode === "edit" && !dirty)}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {mode === "create" ? (isKitRange ? "Create kit range" : "Create category") : "Save"}
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
        <div className="flex min-w-0 flex-col gap-6">
          <form
            id="category-form"
            noValidate
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <FormSection id="basics" title="Basics">
              <FormField {...field("name")} label="Name" required hint="Shown in menus, breadcrumbs and category lists.">
                <Input
                  id="cf-name"
                  value={values.name}
                  maxLength={120}
                  placeholder={isKitRange ? "e.g. Outdoor Kits" : "e.g. Doorbell Cameras"}
                  onChange={(e) => {
                    const name = e.target.value;
                    setValues((v) => ({ ...v, name, ...(slugEdited ? {} : { slug: slugify(name) }) }));
                    clearError("name");
                    if (!slugEdited) clearError("slug");
                  }}
                  {...invalidProps("cf-name", errors.name)}
                />
              </FormField>
              <FormField
                {...field("slug")}
                label="URL slug"
                required
                hint={
                  isKitRoot
                    ? "The kit pages are built around this address, so it can't change."
                    : slugChanged
                      ? undefined
                      : `Shop address: /categories/${values.slug || "…"}`
                }
                labelAside={
                  !isKitRoot && (
                    <button
                      type="button"
                      className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-foreground"
                      onClick={() => {
                        set("slug", slugify(values.name));
                        setSlugEdited(false);
                      }}
                    >
                      <Sparkles className="size-3" aria-hidden="true" /> From name
                    </button>
                  )
                }
              >
                <div className="flex items-center">
                  <span className="text-muted-foreground flex h-8 items-center rounded-l-lg border border-r-0 bg-surface px-2.5 text-sm">/categories/</span>
                  <Input
                    id="cf-slug"
                    value={values.slug}
                    maxLength={120}
                    disabled={isKitRoot}
                    className={cn("rounded-l-none", MONO, "text-[13px]")}
                    onChange={(e) => {
                      setSlugEdited(true);
                      set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                    }}
                    {...invalidProps("cf-slug", errors.slug)}
                  />
                </div>
                {slugChanged && !errors.slug && (
                  <p className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900" role="note">
                    <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      This changes the page address to <span className={MONO}>/categories/{values.slug || "…"}</span>. Links and search results
                      pointing to <span className={MONO}>/categories/{saved.slug}</span> will stop working.
                    </span>
                  </p>
                )}
              </FormField>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cf-parentId">{isKitRange ? "Sits under" : "Parent category"}</Label>
                {isKitRoot ? (
                  <p className="text-muted-foreground text-sm">Top level. CCTV Kits is the top of the kit ranges.</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 rounded-lg border bg-surface px-2.5 py-1.5" data-testid="parent-current">
                      <span className="min-w-0 flex-1 truncate text-sm" title={parent?.path.join(" › ")}>
                        {parent ? (
                          parent.path.map((name, i) => (
                            <span key={`${name}-${i}`} className={i === parent.path.length - 1 ? "font-medium" : "text-muted-foreground"}>
                              {i > 0 && " › "}
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">{isKitRange ? "Choose where the range goes" : "Top level (no parent)"}</span>
                        )}
                      </span>
                      {parent && !isKitRange && (
                        <Button type="button" variant="ghost" size="icon-xs" aria-label="Make it a top-level category" title="Make it top level" onClick={() => set("parentId", null)}>
                          <X />
                        </Button>
                      )}
                    </div>
                    <SearchPicker<CategoryOption>
                      id="cf-parentId"
                      placeholder={parent ? "Move it under another category…" : "Search categories…"}
                      search={searchParents}
                      getKey={(o) => String(o.id)}
                      isDisabled={(o) => blocked.has(o.id)}
                      disabledLabel="Inside this category"
                      renderItem={(o) => <PathLabel option={o} />}
                      onSelect={(o) => set("parentId", o.id)}
                      minChars={0}
                      emptyText="No categories match"
                      invalid={!!errors.parentId}
                      describedBy={errors.parentId ? "cf-parentId-error" : undefined}
                    />
                    {errors.parentId ? (
                      <p id="cf-parentId-error" className="text-xs leading-snug text-red-700">
                        {errors.parentId}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs leading-snug">
                        {mode === "edit" && values.parentId !== saved.parentId
                          ? "Moving it changes its breadcrumb in the shop; its products are listed under the new parent instead of the old one."
                          : isKitRange
                            ? "Kit ranges sit under CCTV Kits or another kit range."
                            : "A category can't go inside itself or one of its own sub-categories."}
                      </p>
                    )}
                  </>
                )}
              </div>
            </FormSection>

            <FormSection id="page" title="Category page" description={`What customers see at /categories/${values.slug || "…"}.`}>
              <FormField
                {...field("title")}
                label="Page title"
                hint="The heading (h1) at the top of the page and the browser tab title. Leave empty to use the name."
                labelAside={<CharCount value={values.title} recommended={70} max={200} />}
              >
                <Input
                  id="cf-title"
                  value={values.title}
                  maxLength={200}
                  placeholder={values.name || "Page title"}
                  onChange={(e) => set("title", e.target.value)}
                  {...invalidProps("cf-title", errors.title)}
                />
              </FormField>
              {!isKitRange && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pf-description">Description</Label>
                  <p className="text-muted-foreground -mt-0.5 text-xs">
                    Shown at the top of the category page, above the products. Leave empty to show the shop&apos;s generated introduction.
                  </p>
                  <DescriptionEditor value={values.description} onChange={(v) => set("description", v)} error={errors.description} />
                </div>
              )}
            </FormSection>

            {isKitRange && values.kitRule && (
              <FormSection id="kit-rule" title="Kits in this range" description="The range lists every ready-made kit that matches all of these. Leave a property on “Any” to include every option.">
                <KitRuleEditor
                  rule={values.kitRule}
                  onChange={(patch) => {
                    setValues((v) => (v.kitRule ? { ...v, kitRule: { ...v.kitRule, ...patch } } : v));
                    for (const key of Object.keys(patch)) clearError(`kitRule.${key}`);
                  }}
                  kits={kits}
                  builtIn={meta?.builtInRule && !slugChanged ? meta.builtInRule : null}
                  saved={mode === "edit" ? saved.kitRule : null}
                  errors={errors}
                />
              </FormSection>
            )}

            <FormSection id="seo" title="Search engine listing">
              <FormField
                {...field("metaDescription")}
                label="Meta description"
                hint="The summary under the page title in Google results. Aim for about 160 characters."
                labelAside={<CharCount value={values.metaDescription} recommended={META_RECOMMENDED} max={320} />}
              >
                <Textarea
                  id="cf-metaDescription"
                  rows={3}
                  maxLength={320}
                  value={values.metaDescription}
                  onChange={(e) => set("metaDescription", e.target.value)}
                  {...invalidProps("cf-metaDescription", errors.metaDescription)}
                />
              </FormField>
            </FormSection>
          </form>
          {children}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-36">
          <FormSection id="visibility" title="Visibility">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="cf-visible">Show in the shop</Label>
                <p className="text-muted-foreground mt-1 text-xs">
                  {values.visible
                    ? "Customers can open the page and see it in menus and category lists."
                    : "The page returns “not found” and the category disappears from menus and lists, with everything below it."}
                </p>
              </div>
              <Switch id="cf-visible" checked={values.visible} onCheckedChange={(v) => set("visible", v)} className="mt-0.5" />
            </div>
            {parentHidden && values.visible && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">A parent category is hidden, so the shop hides this one too.</p>
            )}
          </FormSection>

          <FormSection id="image" title="Image" description="Used for the category's tile on the homepage and category lists.">
            <CategoryImageField value={values.imageUrl} onChange={(url) => set("imageUrl", url)} onUploadingChange={setUploading} error={errors.imageUrl} name={values.name} />
          </FormSection>

          {meta && (
            <section className="text-muted-foreground rounded-xl bg-white p-5 text-xs ring-1 ring-black/10">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                <dt>Type</dt>
                <dd className="text-foreground">{isKitRange ? "Kit range (lists kits by rule)" : "Shop category"}</dd>
                <dt>Sub-categories</dt>
                <dd className="text-foreground">{meta.childCount || "None"}</dd>
                <dt>Created</dt>
                <dd className="text-foreground">{meta.createdLabel}</dd>
                <dt>Updated</dt>
                <dd className="text-foreground">{meta.updatedLabel}</dd>
                <dt>ID</dt>
                <dd className={cn("text-foreground", MONO)}>{meta.id}</dd>
              </dl>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
