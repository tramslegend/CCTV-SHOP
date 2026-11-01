"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, ExternalLink, FileText, Loader2, RotateCcw, Save, Sparkles } from "lucide-react";
import { createPost, updatePost } from "@/app/admin/(panel)/content/blog/actions";
import { CharCount, FieldMessage, FormField, invalidProps } from "@/components/admin/form-field";
import { FormSection } from "@/components/admin/products/form-section";
import { slugify } from "@/components/admin/products/utils";
import { SimpleSelect } from "@/components/admin/simple-select";
import { AdminToaster, toast } from "@/components/admin/toast";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { countWords, readingMinutes } from "@/lib/content/markdown";
import { cn } from "@/lib/utils";
import { BodyEditor } from "./body-editor";
import { FaqEditor } from "./faq-editor";
import { ImageField } from "./image-field";
import { PostActions } from "./post-actions";
import { PostProductsEditor, RelatedPostsEditor, SourcesEditor } from "./post-lists-editors";
import { PostStatusBadge } from "./status";
import { type FieldErrors, POST_STATUS_HINTS, POST_STATUS_LABELS, POST_STATUSES, type PostFormMeta, type PostFormValues, type PostOption } from "./types";

const STATUS_OPTIONS = POST_STATUSES.map((s) => ({ value: s, label: POST_STATUS_LABELS[s] }));

function focusFirstError(keys: string[]) {
  requestAnimationFrame(() => {
    let target = document.querySelector<HTMLElement>("#post-form [aria-invalid='true']");
    for (const key of keys) {
      if (target) break;
      const parts = key.split(".");
      while (parts.length && !target) {
        target = document.getElementById(`pf-${parts.join("-")}`);
        parts.pop();
      }
    }
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  });
}

export function PostForm({
  mode,
  initialValues,
  meta,
  postOptions,
  storeName,
  today,
}: {
  mode: "create" | "edit";
  initialValues: PostFormValues;
  meta?: PostFormMeta;
  postOptions: PostOption[];
  storeName: string;
  /** Today's date in the UK, yyyy-mm-dd (from the server). */
  today: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialValues));
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [uploads, setUploads] = useState(0);
  const [saving, startSaving] = useTransition();

  const dirty = JSON.stringify(values) !== baseline;
  const uploading = uploads > 0;
  useUnsavedChanges(dirty && !saving);
  const onUploading = (u: boolean) => setUploads((n) => Math.max(0, n + (u ? 1 : -1)));

  const clearErrors = (key: string) =>
    setErrors((e) => {
      const keys = Object.keys(e).filter((k) => k === key || k.startsWith(`${key}.`));
      if (!keys.length) return e;
      const next = { ...e };
      for (const k of keys) delete next[k];
      return next;
    });
  const set = <K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    clearErrors(key);
  };

  const save = () => {
    if (saving) return;
    if (uploading) return void toast.error("Wait for the images to finish uploading, then save.");
    const payload = values;
    startSaving(async () => {
      try {
        const result = mode === "create" || !meta ? await createPost(payload) : await updatePost(meta.id, payload);
        if (result.ok) {
          setErrors({});
          setFormError(null);
          setBaseline(JSON.stringify(payload));
          toast.success(result.message);
          if (mode === "create") router.push(`/admin/content/blog/${result.data.id}`);
        } else {
          const fieldErrors = result.fieldErrors ?? {};
          setErrors(fieldErrors);
          setFormError(result.message);
          toast.error(result.message);
          focusFirstError(Object.keys(fieldErrors));
        }
      } catch {
        setFormError("The post couldn't be saved. Check your connection and try again.");
        toast.error("The post couldn't be saved. Try again.");
      }
    });
  };

  const discard = () => {
    if (!dirty || window.confirm("Discard all unsaved changes?")) {
      setValues(JSON.parse(baseline) as PostFormValues);
      setErrors({});
      setFormError(null);
    }
  };

  const field = (key: string) => ({ id: `pf-${key}`, error: errors[key] });
  const errorCount = Object.keys(errors).length;
  const words = values.body.trim() ? countWords(values.body) : (meta?.storedWordCount ?? 0);
  const shopUrl = meta && meta.status === "active" ? `/blog/${meta.slug}` : null;
  const listedTotal = (meta?.listedCount ?? 0) + (mode === "create" || !initialValues.listed ? 1 : 0);

  return (
    <form
      id="post-form"
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
          <Link href="/admin/content/blog" className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Back to blog posts">
            <ArrowLeft />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{mode === "create" ? "New blog post" : initialValues.title || "Untitled post"}</h1>
              {meta && <PostStatusBadge status={meta.status} />}
              {meta && !initialValues.listed && <span className="rounded-full border bg-white px-2 text-xs leading-5 font-medium">Unlisted</span>}
            </div>
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {saving ? "Saving…" : uploading ? "Uploading images…" : dirty ? "Unsaved changes" : mode === "edit" ? "All changes saved" : "Not saved yet"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {shopUrl && (
              <a href={shopUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
                View post <ExternalLink />
              </a>
            )}
            {meta && <PostActions id={meta.id} title={initialValues.title} dirty={dirty} linkedFrom={meta.linkedFrom} />}
            {dirty && (
              <Button type="button" variant="ghost" size="sm" onClick={discard} disabled={saving}>
                <RotateCcw /> Discard
              </Button>
            )}
            <Button type="submit" size="sm" disabled={saving || uploading || (mode === "edit" && !dirty)}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {mode === "create" ? "Create post" : "Save"}
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
          <FormSection id="basics" title="Basics">
            <FormField {...field("title")} label="Title" required>
              <Input
                id="pf-title"
                value={values.title}
                maxLength={200}
                placeholder="e.g. How many CCTV cameras does a small shop need?"
                onChange={(e) => {
                  const title = e.target.value;
                  setValues((v) => ({ ...v, title, ...(slugEdited ? {} : { slug: slugify(title) }) }));
                  clearErrors("title");
                  if (!slugEdited) clearErrors("slug");
                }}
                {...invalidProps("pf-title", errors.title)}
              />
            </FormField>
            <FormField
              {...field("slug")}
              label="URL slug"
              required
              hint={
                mode === "edit" && meta?.status === "active" && values.slug !== initialValues.slug
                  ? "Changing the address of a live post breaks links to the old one (product guide links and related posts are updated)."
                  : `Address: /blog/${values.slug || "…"}`
              }
              labelAside={
                <button
                  type="button"
                  className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-foreground"
                  onClick={() => {
                    set("slug", slugify(values.title));
                    setSlugEdited(false);
                  }}
                >
                  <Sparkles className="size-3" aria-hidden="true" /> From title
                </button>
              }
            >
              <div className="flex items-center">
                <span className="text-muted-foreground flex h-8 items-center rounded-l-lg border border-r-0 bg-surface px-2.5 text-sm">/blog/</span>
                <Input
                  id="pf-slug"
                  value={values.slug}
                  maxLength={200}
                  className="rounded-l-none"
                  onChange={(e) => {
                    setSlugEdited(true);
                    set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  }}
                  {...invalidProps("pf-slug", errors.slug)}
                />
              </div>
            </FormField>
            <FormField
              {...field("excerpt")}
              label="Excerpt"
              hint="Shown on the post's card on /blog, under its title, and in search results."
              labelAside={<CharCount value={values.excerpt} recommended={160} max={500} />}
            >
              <Textarea id="pf-excerpt" rows={3} maxLength={500} value={values.excerpt} onChange={(e) => set("excerpt", e.target.value)} {...invalidProps("pf-excerpt", errors.excerpt)} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField {...field("keywords")} label="Topic line" hint="Small capitals above the title on the post and its card, e.g. “nvr cctv”.">
                <Input id="pf-keywords" value={values.keywords} maxLength={200} onChange={(e) => set("keywords", e.target.value)} {...invalidProps("pf-keywords", errors.keywords)} />
              </FormField>
              <FormField {...field("section")} label="Section" hint="Optional category for search engines, e.g. “Buying guides”.">
                <Input id="pf-section" value={values.section} maxLength={100} onChange={(e) => set("section", e.target.value)} {...invalidProps("pf-section", errors.section)} />
              </FormField>
            </div>
            <FormField {...field("tags")} label="Tags" hint="Separate with commas. Shown as chips at the end of the post.">
              <Input id="pf-tags" value={values.tags} maxLength={1000} placeholder="e.g. hikvision, night vision, poe" onChange={(e) => set("tags", e.target.value)} {...invalidProps("pf-tags", errors.tags)} />
            </FormField>
          </FormSection>

          <FormSection id="cover" title="Cover image" description="Shown at the top of the post and on its card on /blog. A 16:9 picture works best.">
            <ImageField
              id="pf-coverImage"
              value={values.coverImage}
              onChange={(url) => set("coverImage", url)}
              onUploadingChange={onUploading}
              error={errors.coverImage}
              alt={values.title ? `Cover image for ${values.title}` : "Cover image"}
              className="max-w-xl"
            />
          </FormSection>

          <FormSection id="body" title="Article" description="The post's text. Its ## headings make the “On this page” table of contents.">
            {meta?.outlineMarkdown && !values.body.trim() && (
              <div className="flex flex-col gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 sm:flex-row sm:items-center">
                <FileText className="size-4 shrink-0" aria-hidden="true" />
                <p className="flex-1">
                  This post currently shows its outline: {meta.outlineSections} headings with a short summary under each. Write a body to replace it, or start from the
                  outline and expand it.
                </p>
                <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => set("body", meta.outlineMarkdown ?? "")}>
                  Start from the outline
                </Button>
              </div>
            )}
            <BodyEditor value={values.body} onChange={(v) => set("body", v)} error={errors.body} />
          </FormSection>

          <FormSection id="faq" title="Frequently asked questions" description="Shown under the article.">
            <FaqEditor items={values.faq} onChange={(faq) => set("faq", faq)} errors={errors} errorKey="faq" idPrefix="pf" />
          </FormSection>

          <FormSection id="products" title="Related products" description="Listed at the end of the article and as “Recommended products”.">
            <PostProductsEditor items={values.products} onChange={(products) => set("products", products)} errors={errors} />
          </FormSection>

          <FormSection id="related" title="Related reading" description="Other posts suggested at the end of this one.">
            <RelatedPostsEditor items={values.related} options={postOptions} onChange={(related) => set("related", related)} errors={errors} selfSlug={meta?.slug} />
          </FormSection>

          <FormSection id="sources" title="Sources & references" description="Outside pages the article draws on, listed under the FAQ.">
            <SourcesEditor items={values.sources} onChange={(sources) => set("sources", sources)} errors={errors} />
          </FormSection>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-36">
          <FormSection id="status" title="Visibility">
            <FormField {...field("status")} label="Status" hint={POST_STATUS_HINTS[values.status]}>
              <SimpleSelect id="pf-status" value={values.status} options={STATUS_OPTIONS} onValueChange={(v) => set("status", v)} invalid={!!errors.status} />
            </FormField>
            <div className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5">
              <div>
                <Label htmlFor="pf-listed">Listed on /blog</Label>
                <p className="text-muted-foreground mt-1 text-xs">Off: the post isn&apos;t on /blog, but its address still works.</p>
              </div>
              <Switch id="pf-listed" checked={values.listed} onCheckedChange={(v) => set("listed", v)} className="mt-0.5" />
            </div>
            {values.listed && (
              <FormField
                {...field("position")}
                label="Position on /blog"
                hint={`1 shows it first; the others move down. ${listedTotal} ${listedTotal === 1 ? "post is" : "posts are"} listed (drafts included).`}
              >
                <Input
                  id="pf-position"
                  inputMode="numeric"
                  className="w-28 tabular-nums"
                  value={values.position}
                  onChange={(e) => set("position", e.target.value.replace(/[^\d]/g, ""))}
                  {...invalidProps("pf-position", errors.position)}
                />
              </FormField>
            )}
          </FormSection>

          <FormSection id="dates" title="Dates">
            <FormField {...field("publishedAt")} label="Published" required>
              <Input id="pf-publishedAt" type="date" value={values.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} {...invalidProps("pf-publishedAt", errors.publishedAt)} />
            </FormField>
            <FormField
              {...field("modifiedAt")}
              label="Updated"
              hint="Shown as “Updated …” when it's later than the publish date."
              labelAside={
                <button type="button" className="text-muted-foreground text-xs hover:text-foreground" onClick={() => set("modifiedAt", today)}>
                  Today
                </button>
              }
            >
              <Input id="pf-modifiedAt" type="date" value={values.modifiedAt} onChange={(e) => set("modifiedAt", e.target.value)} {...invalidProps("pf-modifiedAt", errors.modifiedAt)} />
            </FormField>
            <p className="text-muted-foreground text-xs tabular-nums">
              {words ? `${words.toLocaleString("en-GB")} words · ${readingMinutes(words)} min read` : "Reading time appears once the article has text."}
            </p>
          </FormSection>

          <FormSection id="author" title="Author" description={`Leave empty to show “${storeName} team”.`}>
            <FormField {...field("authorName")} label="Name">
              <Input id="pf-authorName" value={values.authorName} maxLength={120} onChange={(e) => set("authorName", e.target.value)} {...invalidProps("pf-authorName", errors.authorName)} />
            </FormField>
            <FormField {...field("authorTitle")} label="Job title">
              <Input id="pf-authorTitle" value={values.authorTitle} maxLength={120} onChange={(e) => set("authorTitle", e.target.value)} {...invalidProps("pf-authorTitle", errors.authorTitle)} />
            </FormField>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm leading-none font-medium">Photo</p>
              <ImageField
                id="pf-authorImage"
                value={values.authorImage}
                onChange={(url) => set("authorImage", url)}
                onUploadingChange={onUploading}
                error={errors.authorImage}
                alt={values.authorName ? `Photo of ${values.authorName}` : "Author photo"}
                aspect="aspect-square w-28"
                hint="Optional. Square works best."
              />
            </div>
          </FormSection>

          {meta && (
            <section className="text-muted-foreground rounded-xl bg-white p-5 text-xs ring-1 ring-black/10">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                <dt>Created</dt>
                <dd className="text-foreground">{meta.createdLabel}</dd>
                <dt>Saved</dt>
                <dd className="text-foreground">{meta.updatedLabel}</dd>
                <dt>Linked from</dt>
                <dd className="text-foreground">
                  {meta.linkedFrom.products || meta.linkedFrom.posts
                    ? [meta.linkedFrom.products && `${meta.linkedFrom.products} products`, meta.linkedFrom.posts && `${meta.linkedFrom.posts} posts`].filter(Boolean).join(", ")
                    : "Nothing yet"}
                </dd>
                <dt>ID</dt>
                <dd className={cn("text-foreground")}>{meta.id}</dd>
              </dl>
            </section>
          )}
          <FieldMessage id="pf-form" error={errors.form} />
        </aside>
      </div>
    </form>
  );
}
