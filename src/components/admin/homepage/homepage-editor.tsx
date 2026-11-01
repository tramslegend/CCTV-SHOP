"use client";

import { type ReactNode, useCallback, useState } from "react";
import { ExternalLink } from "lucide-react";
import { saveHomepage } from "@/app/admin/(panel)/content/homepage/actions";
import { AdminToaster } from "@/components/admin/toast";
import { buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { CategoryChoice, PickedProduct } from "@/lib/homepage/admin";
import { type HomepageSettings, SECTION_IDS, SECTION_LABELS, type SectionId } from "@/lib/homepage/schema";
import type { FieldMessages } from "@/lib/homepage/validation";
import { EditorBar, move, Panel, RowActions, useContentForm } from "./editor-kit";
import {
  ArticlesFields,
  CategoriesFields,
  CtaFields,
  HeroFields,
  P,
  PopularFields,
  PromiseFields,
  type SectionCtx,
  WhyUsFields,
} from "./section-fields";

const DESCRIPTIONS: Record<SectionId, string> = {
  hero: "Headline, buttons, search box, trust points, brands and the featured kit.",
  categories: "Category tiles with pictures.",
  popular: "Best-selling or hand-picked products.",
  whyUs: "Heading and numbered reasons to buy from you.",
  promise: "Delivery and returns promise with key figures.",
  articles: "The newest blog posts.",
  cta: "Dark band with a headline and buttons near the bottom.",
};

const FIELDS: Record<SectionId, (ctx: SectionCtx) => ReactNode> = {
  hero: HeroFields,
  categories: CategoriesFields,
  popular: PopularFields,
  whyUs: WhyUsFields,
  promise: PromiseFields,
  articles: ArticlesFields,
  cta: CtaFields,
};

const sectionOf = (path: string) => SECTION_IDS.find((id) => path === id || path.startsWith(`${id}.`));

/** /admin/content/homepage: the homepage's sections in display order, each switchable, reorderable and editable. */
export function HomepageEditor({
  initial,
  initialWarnings,
  categories,
  products: initialProducts,
}: {
  initial: HomepageSettings;
  initialWarnings: FieldMessages;
  categories: CategoryChoice[];
  products: PickedProduct[];
}) {
  const [open, setOpen] = useState<Partial<Record<SectionId, boolean>>>({});
  const [products, setProducts] = useState(() => new Map(initialProducts.map((p) => [p.id, p])));
  const [uploads, setUploads] = useState(0);
  const onErrors = useCallback((paths: string[]) => {
    setOpen((prev) => {
      const next = { ...prev };
      for (const p of paths) {
        const id = sectionOf(p);
        if (id) next[id] = true;
      }
      return next;
    });
  }, []);
  const form = useContentForm({ prefix: P, initial, initialWarnings, save: saveHomepage, onErrors });
  const { values: v, errors, warnings } = form;

  const patch: SectionCtx["patch"] = (key, value, ...paths) => form.update((prev) => ({ ...prev, [key]: { ...prev[key], ...value } }), ...paths);
  const onUploadingChange = useCallback((u: boolean) => setUploads((n) => Math.max(0, n + (u ? 1 : -1))), []);
  const ctx: SectionCtx = {
    v,
    patch,
    errors,
    warnings,
    products,
    addProduct: (p) => setProducts((prev) => new Map(prev).set(p.id, p)),
    categories,
    onUploadingChange,
  };

  const count = (id: SectionId, messages: FieldMessages) => Object.keys(messages).filter((k) => sectionOf(k) === id).length;
  const allOpen = SECTION_IDS.every((id) => open[id]);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.submit();
      }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          form.submit();
        }
      }}
    >
      <AdminToaster />
      <EditorBar
        title="Homepage"
        backHref="/admin/content"
        backLabel="Back to content"
        dirty={form.dirty}
        saving={form.saving}
        busy={uploads ? "Uploading image…" : undefined}
        onDiscard={form.discard}
        actions={
          <a href="/" target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })} data-skip-unsaved-guard>
            Preview <ExternalLink />
          </a>
        }
      />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-2xl text-sm">
          Sections appear on the homepage in this order. Switch a section off to hide it, use the arrows to move it, and open it to edit its content.
          Saved changes show on the homepage straight away; Preview opens it in a new tab.
        </p>
        <button
          type="button"
          className="text-sm font-medium text-foreground/80 underline-offset-4 hover:underline"
          onClick={() => setOpen(allOpen ? {} : Object.fromEntries(SECTION_IDS.map((id) => [id, true])))}
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <ol className="flex flex-col gap-3" aria-label="Homepage sections">
        {v.sections.map((section, i) => {
          const { id } = section;
          const Fields = FIELDS[id];
          const label = SECTION_LABELS[id];
          return (
            <li key={id}>
              <Panel
                id={`section-${id}`}
                title={`${i + 1}. ${label}`}
                description={DESCRIPTIONS[id]}
                open={!!open[id]}
                onOpenChange={(o) => setOpen((prev) => ({ ...prev, [id]: o }))}
                errorCount={count(id, errors)}
                muted={!section.enabled}
                header={
                  <>
                    <label className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                      <Switch
                        checked={section.enabled}
                        aria-label={`Show ${label} on the homepage`}
                        onCheckedChange={(enabled) =>
                          form.update((prev) => ({ ...prev, sections: prev.sections.map((s) => (s.id === id ? { ...s, enabled } : s)) }), id)
                        }
                      />
                      {section.enabled ? "Shown" : "Hidden"}
                    </label>
                    <RowActions
                      index={i}
                      count={v.sections.length}
                      label={label}
                      onMove={(to) => form.update((prev) => ({ ...prev, sections: move(prev.sections, i, to) }))}
                    />
                  </>
                }
              >
                <Fields {...ctx} />
              </Panel>
            </li>
          );
        })}
      </ol>
    </form>
  );
}
