"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { ImageOff, X } from "lucide-react";
import { SearchPicker } from "@/components/admin/search-picker";
import { SimpleSelect } from "@/components/admin/simple-select";
import { MONO } from "@/components/admin/products/utils";
import { Button } from "@/components/ui/button";
import type { CategoryChoice, PickedProduct } from "@/lib/homepage/admin";
import {
  ARTICLE_COUNTS,
  type FeaturePoint,
  type HomepageSettings,
  LIMITS,
  POPULAR_COUNTS,
  type SectionId,
} from "@/lib/homepage/schema";
import type { FieldMessages } from "@/lib/homepage/validation";
import { cn } from "@/lib/utils";
import { AddButton, fieldId, Group, IconSelect, ImagePicker, LinkFields, ListMessage, move, RowActions, TextInput, TokenHelp } from "./editor-kit";
import { PickedRow, ProductSearch } from "./product-picker";

export const P = "hp";

export interface SectionCtx {
  v: HomepageSettings;
  patch: <K extends SectionId>(key: K, value: Partial<HomepageSettings[K]>, ...paths: string[]) => void;
  errors: FieldMessages;
  warnings: FieldMessages;
  products: Map<string, PickedProduct>;
  addProduct: (p: PickedProduct) => void;
  categories: CategoryChoice[];
  onUploadingChange: (uploading: boolean) => void;
}

const HIGHLIGHT_HINT = "Copy part of the text above exactly, e.g. its last few words, to show it in another colour. Leave empty for none.";
const NOTE_HINT = (
  <>
    Optional. Write a link as <code className={cn("rounded bg-zinc-100 px-1 text-[11px]", MONO)}>[link text](/page)</code>.
  </>
);

/** Two-way choice shown as radio buttons. */
function ModeChoice<V extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string; hint: string }[];
}) {
  return (
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors",
            value === o.value ? "border-zinc-900 bg-zinc-50" : "hover:border-zinc-400",
          )}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-0.5 accent-zinc-900" />
          <span>
            <span className="block font-medium">{o.label}</span>
            <span className="text-muted-foreground block text-xs">{o.hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/** Rows of trust points / footer highlights: icon, title, detail. */
export function FeatureRows({
  prefix,
  path,
  rows,
  max,
  errors,
  onChange,
  what,
}: {
  prefix: string;
  path: string;
  rows: FeaturePoint[];
  max: number;
  errors: FieldMessages;
  onChange: (rows: FeaturePoint[], changed?: string) => void;
  what: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => (
        <div key={i} className="grid items-start gap-2 rounded-lg border p-3 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Icon</span>
            <IconSelect
              id={fieldId(prefix, `${path}.${i}.icon`)}
              value={row.icon}
              onChange={(icon) => onChange(rows.map((r, j) => (j === i ? { ...r, icon } : r)))}
            />
          </div>
          <TextInput
            prefix={prefix}
            path={`${path}.${i}.title`}
            label="Title"
            value={row.title}
            maxLength={60}
            error={errors[`${path}.${i}.title`]}
            onChange={(title) => onChange(rows.map((r, j) => (j === i ? { ...r, title } : r)), `${path}.${i}.title`)}
          />
          <TextInput
            prefix={prefix}
            path={`${path}.${i}.detail`}
            label="Detail"
            value={row.detail}
            maxLength={100}
            error={errors[`${path}.${i}.detail`]}
            onChange={(detail) => onChange(rows.map((r, j) => (j === i ? { ...r, detail } : r)), `${path}.${i}.detail`)}
          />
          <div className="sm:pt-6">
            <RowActions
              index={i}
              count={rows.length}
              label={`${what} ${i + 1}`}
              onMove={(to) => onChange(move(rows, i, to), path)}
              onRemove={() => onChange(rows.filter((_, j) => j !== i), path)}
            />
          </div>
        </div>
      ))}
      <AddButton label={`Add ${what}`} count={rows.length} max={max} onClick={() => onChange([...rows, { icon: "check", title: "", detail: "" }])} />
    </div>
  );
}

// ---------- hero ----------

export function HeroFields({ v, patch, errors, warnings, products, addProduct, onUploadingChange }: SectionCtx) {
  const h = v.hero;
  const kit = h.kit.productId ? products.get(h.kit.productId) : undefined;
  const kitError = errors["hero.kit.productId"];
  const kitWarning = warnings["hero.kit.productId"];
  return (
    <>
      <Group title="Text">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput prefix={P} path="hero.eyebrow" label="Small heading" value={h.eyebrow} maxLength={60} error={errors["hero.eyebrow"]} hint="The pill above the headline. Empty hides it." onChange={(eyebrow) => patch("hero", { eyebrow }, "hero.eyebrow")} />
          <TextInput prefix={P} path="hero.searchPlaceholder" label="Search box placeholder" value={h.searchPlaceholder} maxLength={80} error={errors["hero.searchPlaceholder"]} onChange={(searchPlaceholder) => patch("hero", { searchPlaceholder }, "hero.searchPlaceholder")} />
        </div>
        <TextInput prefix={P} path="hero.headline" label="Headline" required value={h.headline} maxLength={160} error={errors["hero.headline"]} onChange={(headline) => patch("hero", { headline }, "hero.headline", "hero.highlight")} />
        <TextInput prefix={P} path="hero.highlight" label="Highlighted words" value={h.highlight} maxLength={160} error={errors["hero.highlight"]} hint={HIGHLIGHT_HINT} onChange={(highlight) => patch("hero", { highlight }, "hero.highlight")} />
        <TextInput prefix={P} path="hero.intro" label="Intro text" multiline value={h.intro} maxLength={600} error={errors["hero.intro"]} onChange={(intro) => patch("hero", { intro }, "hero.intro")} />
        <TextInput prefix={P} path="hero.note" label="Line under the search box" value={h.note} maxLength={300} error={errors["hero.note"]} warning={warnings["hero.note"]} hint={NOTE_HINT} onChange={(note) => patch("hero", { note }, "hero.note")} />
      </Group>
      <Group title="Buttons" description="Leave both fields of a button empty to hide it.">
        <p className="text-xs font-medium text-zinc-600">Main button (dark)</p>
        <LinkFields prefix={P} path="hero.primary" value={h.primary} errors={errors} warnings={warnings} onChange={(primary, changed) => patch("hero", { primary }, changed)} />
        <p className="text-xs font-medium text-zinc-600">Second button (outlined)</p>
        <LinkFields prefix={P} path="hero.secondary" value={h.secondary} errors={errors} warnings={warnings} onChange={(secondary, changed) => patch("hero", { secondary }, changed)} />
      </Group>
      <Group title="Trust points" description="The strip under the hero, up to four.">
        <FeatureRows prefix={P} path="hero.trustPoints" rows={h.trustPoints} max={LIMITS.trustPoints} errors={errors} what="trust point" onChange={(trustPoints, changed) => patch("hero", { trustPoints }, changed ?? "hero.trustPoints")} />
      </Group>
      <Group title="Brands" description="Shown as names, or as logos when you add one. Empty list hides the strip.">
        <TextInput prefix={P} path="hero.brandsTitle" label="Strip title" value={h.brandsTitle} maxLength={60} error={errors["hero.brandsTitle"]} className="sm:max-w-sm" onChange={(brandsTitle) => patch("hero", { brandsTitle }, "hero.brandsTitle")} />
        {h.brands.map((b, i) => (
          <div key={i} className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
            <TextInput
              prefix={P}
              path={`hero.brands.${i}.name`}
              label="Brand"
              value={b.name}
              maxLength={60}
              className="min-w-40 flex-1"
              error={errors[`hero.brands.${i}.name`]}
              onChange={(name) => patch("hero", { brands: h.brands.map((x, j) => (j === i ? { ...x, name } : x)) }, `hero.brands.${i}.name`)}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Logo (optional)</span>
              <ImagePicker
                id={fieldId(P, `hero.brands.${i}.logoUrl`)}
                value={b.logoUrl}
                size={36}
                compact
                error={errors[`hero.brands.${i}.logoUrl`]}
                onUploadingChange={onUploadingChange}
                onChange={(logoUrl) => patch("hero", { brands: h.brands.map((x, j) => (j === i ? { ...x, logoUrl } : x)) }, `hero.brands.${i}.logoUrl`)}
              />
            </div>
            <div className="sm:pt-6">
              <RowActions
                index={i}
                count={h.brands.length}
                label={b.name || `brand ${i + 1}`}
                onMove={(to) => patch("hero", { brands: move(h.brands, i, to) }, "hero.brands")}
                onRemove={() => patch("hero", { brands: h.brands.filter((_, j) => j !== i) }, "hero.brands")}
              />
            </div>
          </div>
        ))}
        <AddButton label="Add brand" count={h.brands.length} max={LIMITS.brands} onClick={() => patch("hero", { brands: [...h.brands, { name: "", logoUrl: "" }] })} />
      </Group>
      <Group title="Featured kit" description="A ready-made kit shown in a card on the right, with its parts and real price. No kit hides the card.">
        <div data-field="hero.kit.productId" className="flex flex-col gap-2">
          {kit ? (
            <div className={cn("flex items-center gap-2 rounded-lg border p-2.5", kitError && "border-red-400")}>
              <div className="min-w-0 flex-1">
                <PickedRow product={kit} />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => patch("hero", { kit: { ...h.kit, productId: "" } }, "hero.kit.productId")}>
                <X /> Remove
              </Button>
            </div>
          ) : h.kit.productId ? (
            <p className="text-sm text-red-700">The chosen kit no longer exists.</p>
          ) : (
            <p className="text-muted-foreground text-sm">No kit chosen.</p>
          )}
          <ProductSearch
            id={fieldId(P, "hero.kit.productId")}
            type="kits"
            placeholder={kit ? "Search to choose a different kit…" : "Search kits by name or SKU…"}
            chosen={new Set(h.kit.productId ? [h.kit.productId] : [])}
            invalid={!!kitError}
            onSelect={(p) => {
              addProduct(p);
              patch("hero", { kit: { ...h.kit, productId: p.id } }, "hero.kit.productId");
            }}
          />
          <ListMessage error={kitError} warning={kitWarning} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextInput prefix={P} path="hero.kit.label" label="Card label" value={h.kit.label} maxLength={80} error={errors["hero.kit.label"]} onChange={(label) => patch("hero", { kit: { ...h.kit, label } }, "hero.kit.label")} />
          <TextInput prefix={P} path="hero.kit.badge" label="Badge" value={h.kit.badge} maxLength={40} error={errors["hero.kit.badge"]} hint="Optional, top right." onChange={(badge) => patch("hero", { kit: { ...h.kit, badge } }, "hero.kit.badge")} />
          <TextInput prefix={P} path="hero.kit.chip" label="Corner tag" value={h.kit.chip} maxLength={40} error={errors["hero.kit.chip"]} hint="Optional dark tag on the corner." onChange={(chip) => patch("hero", { kit: { ...h.kit, chip } }, "hero.kit.chip")} />
        </div>
      </Group>
      <TokenHelp />
    </>
  );
}

// ---------- shop by category ----------

function CategoryRow({
  choice,
  image,
  onImage,
  onUploadingChange,
  warning,
  actions,
}: {
  choice: CategoryChoice;
  image: string;
  onImage: (url: string) => void;
  onUploadingChange: (u: boolean) => void;
  warning?: string;
  actions?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{choice.name}</p>
        {choice.path !== choice.name && <p className="text-muted-foreground truncate text-xs">{choice.path}</p>}
        {warning && <p className="mt-0.5 text-xs font-medium text-amber-700">⚠ {warning}</p>}
      </div>
      <ImagePicker
        id={fieldId(P, `categories.images.${choice.slug}`)}
        value={image}
        fallback={choice.image}
        fallbackLabel="Category image"
        size={44}
        compact
        onUploadingChange={onUploadingChange}
        onChange={onImage}
      />
      {actions}
    </li>
  );
}

export function CategoriesFields({ v, patch, errors, warnings, categories, onUploadingChange }: SectionCtx) {
  const c = v.categories;
  const bySlug = new Map(categories.map((x) => [x.slug, x]));
  const setImage = (slug: string, url: string) => {
    const images = { ...c.images };
    if (url) images[slug] = url;
    else delete images[slug];
    patch("categories", { images }, `categories.images.${slug}`);
  };
  const top = categories.filter((x) => x.top);
  const chosen = new Set(c.picks);
  return (
    <>
      <Group title="Heading">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput prefix={P} path="categories.eyebrow" label="Small heading" value={c.eyebrow} maxLength={60} error={errors["categories.eyebrow"]} onChange={(eyebrow) => patch("categories", { eyebrow }, "categories.eyebrow")} />
          <TextInput prefix={P} path="categories.title" label="Heading" required value={c.title} maxLength={160} error={errors["categories.title"]} onChange={(title) => patch("categories", { title }, "categories.title", "categories.highlight")} />
        </div>
        <TextInput prefix={P} path="categories.highlight" label="Highlighted words" value={c.highlight} maxLength={160} error={errors["categories.highlight"]} hint={HIGHLIGHT_HINT} onChange={(highlight) => patch("categories", { highlight }, "categories.highlight")} />
        <LinkFields prefix={P} path="categories.link" labelLabel="Link text" value={c.link} errors={errors} warnings={warnings} onChange={(link, changed) => patch("categories", { link }, changed)} />
      </Group>
      <Group title="Tiles" description="Each tile uses the category's image unless you choose another one here; without any image a plain placeholder is shown.">
        <ModeChoice
          name="categories-mode"
          value={c.mode}
          onChange={(mode) => patch("categories", { mode }, "categories.picks")}
          options={[
            { value: "auto", label: "Automatic", hint: "Every visible top-level category, in the order set under Categories." },
            { value: "pick", label: "Hand-picked", hint: "Only the categories you choose, in your order." },
          ]}
        />
        {c.mode === "auto" ? (
          top.length ? (
            <ul className="divide-y rounded-lg border">
              {top.map((choice) => (
                <CategoryRow key={choice.slug} choice={choice} image={c.images[choice.slug] ?? ""} onImage={(url) => setImage(choice.slug, url)} onUploadingChange={onUploadingChange} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">There are no visible top-level categories yet, so the section is hidden.</p>
          )
        ) : (
          <div className="flex flex-col gap-3" data-field="categories.picks">
            <SearchPicker<CategoryChoice>
              id={fieldId(P, "categories.picks")}
              aria-label="Search categories to add"
              placeholder="Search categories to add…"
              search={(q) => {
                const needle = q.toLowerCase();
                return categories.filter((x) => x.path.toLowerCase().includes(needle)).slice(0, 30);
              }}
              minChars={0}
              getKey={(x) => x.slug}
              isDisabled={(x) => chosen.has(x.slug)}
              renderItem={(x) => (
                <span className="flex items-center gap-2">
                  <span className="relative size-7 shrink-0 overflow-hidden rounded border bg-white">
                    {x.image ? <Image src={x.image} alt="" fill sizes="56px" className="object-contain" /> : <ImageOff className="m-1.5 size-4 text-zinc-400" />}
                  </span>
                  <span className="truncate">{x.path}</span>
                </span>
              )}
              onSelect={(x) => c.picks.length < LIMITS.categoryPicks && patch("categories", { picks: [...c.picks, x.slug] }, "categories.picks")}
              invalid={!!errors["categories.picks"]}
              emptyText="No categories match"
            />
            <ListMessage error={errors["categories.picks"]} />
            {c.picks.length > 0 && (
              <ol className="divide-y rounded-lg border">
                {c.picks.map((slug, i) => {
                  const choice = bySlug.get(slug) ?? { slug, name: slug, path: "Hidden or deleted category", image: "", top: false };
                  return (
                    <CategoryRow
                      key={slug}
                      choice={choice}
                      image={c.images[slug] ?? ""}
                      onImage={(url) => setImage(slug, url)}
                      onUploadingChange={onUploadingChange}
                      warning={warnings[`categories.picks.${i}`]}
                      actions={
                        <RowActions
                          index={i}
                          count={c.picks.length}
                          label={choice.name}
                          onMove={(to) => patch("categories", { picks: move(c.picks, i, to) }, "categories.picks")}
                          onRemove={() => patch("categories", { picks: c.picks.filter((s) => s !== slug) }, "categories.picks")}
                        />
                      }
                    />
                  );
                })}
              </ol>
            )}
            <p className="text-muted-foreground text-xs tabular-nums">
              {c.picks.length} of {LIMITS.categoryPicks} categories
            </p>
          </div>
        )}
      </Group>
    </>
  );
}

// ---------- popular products ----------

export function PopularFields({ v, patch, errors, warnings, products, addProduct }: SectionCtx) {
  const s = v.popular;
  const chosen = new Set(s.picks);
  return (
    <>
      <Group title="Heading">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput prefix={P} path="popular.title" label="Heading" required value={s.title} maxLength={120} error={errors["popular.title"]} onChange={(title) => patch("popular", { title }, "popular.title")} />
          <TextInput prefix={P} path="popular.subtitle" label="Line under the heading" value={s.subtitle} maxLength={200} error={errors["popular.subtitle"]} onChange={(subtitle) => patch("popular", { subtitle }, "popular.subtitle")} />
        </div>
        <LinkFields prefix={P} path="popular.link" labelLabel="Link text" value={s.link} errors={errors} warnings={warnings} onChange={(link, changed) => patch("popular", { link }, changed)} />
      </Group>
      <Group title="Products">
        <ModeChoice
          name="popular-mode"
          value={s.mode}
          onChange={(mode) => patch("popular", { mode }, "popular.picks")}
          options={[
            { value: "auto", label: "Automatic", hint: "Most ordered in paid orders over the last 12 months, topped up with products from your categories." },
            { value: "pick", label: "Hand-picked", hint: "The products you choose, in your order." },
          ]}
        />
        {s.mode === "auto" ? (
          <div className="flex max-w-xs flex-col gap-1.5">
            <label htmlFor={fieldId(P, "popular.count")} className="text-sm font-medium">
              How many to show
            </label>
            <SimpleSelect
              id={fieldId(P, "popular.count")}
              value={String(s.count)}
              onValueChange={(n) => patch("popular", { count: Number(n) }, "popular.count")}
              options={POPULAR_COUNTS.map((n) => ({ value: String(n), label: `${n} products` }))}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3" data-field="popular.picks">
            <ProductSearch
              id={fieldId(P, "popular.picks")}
              type="all"
              placeholder="Search products by name or SKU to add…"
              chosen={chosen}
              invalid={!!errors["popular.picks"]}
              onSelect={(p) => {
                if (s.picks.length >= LIMITS.popularPicks || chosen.has(p.id)) return;
                addProduct(p);
                patch("popular", { picks: [...s.picks, p.id] }, "popular.picks");
              }}
            />
            <ListMessage error={errors["popular.picks"]} />
            {s.picks.length > 0 && (
              <ol className="divide-y rounded-lg border" aria-label="Hand-picked products">
                {s.picks.map((id, i) => {
                  const p = products.get(id);
                  const problem = errors[`popular.picks.${i}`];
                  const warning = warnings[`popular.picks.${i}`];
                  return (
                    <li key={id} className="flex items-center gap-2 px-3 py-2">
                      <span className="text-muted-foreground w-5 text-xs tabular-nums">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        {p ? <PickedRow product={p} /> : <span className="text-sm text-red-700">Deleted product</span>}
                        {(problem || warning) && <ListMessage error={problem} warning={warning} />}
                      </div>
                      <RowActions
                        index={i}
                        count={s.picks.length}
                        label={p?.name ?? "product"}
                        onMove={(to) => patch("popular", { picks: move(s.picks, i, to) }, "popular.picks")}
                        onRemove={() => patch("popular", { picks: s.picks.filter((x) => x !== id) }, "popular.picks")}
                      />
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="text-muted-foreground text-xs tabular-nums">
              {s.picks.length} of {LIMITS.popularPicks} products · all are shown, in this order (inactive ones are skipped)
            </p>
          </div>
        )}
      </Group>
    </>
  );
}

// ---------- why us ----------

export function WhyUsFields({ v, patch, errors }: SectionCtx) {
  const s = v.whyUs;
  return (
    <>
      <Group title="Heading">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput prefix={P} path="whyUs.eyebrow" label="Small heading" value={s.eyebrow} maxLength={60} error={errors["whyUs.eyebrow"]} onChange={(eyebrow) => patch("whyUs", { eyebrow }, "whyUs.eyebrow")} />
          <TextInput prefix={P} path="whyUs.title" label="Heading" required value={s.title} maxLength={160} error={errors["whyUs.title"]} onChange={(title) => patch("whyUs", { title }, "whyUs.title", "whyUs.highlight")} />
        </div>
        <TextInput prefix={P} path="whyUs.highlight" label="Highlighted words" value={s.highlight} maxLength={160} error={errors["whyUs.highlight"]} hint={HIGHLIGHT_HINT} onChange={(highlight) => patch("whyUs", { highlight }, "whyUs.highlight")} />
        <TextInput prefix={P} path="whyUs.intro" label="Intro text" multiline value={s.intro} maxLength={600} error={errors["whyUs.intro"]} onChange={(intro) => patch("whyUs", { intro }, "whyUs.intro")} />
        <TextInput prefix={P} path="whyUs.badge" label="Badge" value={s.badge} maxLength={60} error={errors["whyUs.badge"]} hint="Optional small badge under the intro." className="sm:max-w-sm" onChange={(badge) => patch("whyUs", { badge }, "whyUs.badge")} />
      </Group>
      <Group title="Reasons" description="Numbered cards, up to six.">
        {s.reasons.map((r, i) => (
          <div key={i} className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
            <div className="grid min-w-0 flex-1 gap-3">
              <TextInput
                prefix={P}
                path={`whyUs.reasons.${i}.title`}
                label={`Reason ${i + 1}`}
                value={r.title}
                maxLength={80}
                error={errors[`whyUs.reasons.${i}.title`]}
                onChange={(title) => patch("whyUs", { reasons: s.reasons.map((x, j) => (j === i ? { ...x, title } : x)) }, `whyUs.reasons.${i}.title`)}
              />
              <TextInput
                prefix={P}
                path={`whyUs.reasons.${i}.text`}
                label="Text"
                multiline
                rows={2}
                value={r.text}
                maxLength={400}
                error={errors[`whyUs.reasons.${i}.text`]}
                onChange={(text) => patch("whyUs", { reasons: s.reasons.map((x, j) => (j === i ? { ...x, text } : x)) }, `whyUs.reasons.${i}.text`)}
              />
            </div>
            <div className="sm:pt-6">
              <RowActions
                index={i}
                count={s.reasons.length}
                label={`reason ${i + 1}`}
                onMove={(to) => patch("whyUs", { reasons: move(s.reasons, i, to) }, "whyUs.reasons")}
                onRemove={() => patch("whyUs", { reasons: s.reasons.filter((_, j) => j !== i) }, "whyUs.reasons")}
              />
            </div>
          </div>
        ))}
        <AddButton label="Add reason" count={s.reasons.length} max={LIMITS.reasons} onClick={() => patch("whyUs", { reasons: [...s.reasons, { title: "", text: "" }] })} />
      </Group>
      <TokenHelp only={["shop", "cutoff", "freeFrom"]} />
    </>
  );
}

// ---------- delivery promise ----------

export function PromiseFields({ v, patch, errors, warnings }: SectionCtx) {
  const s = v.promise;
  return (
    <>
      <Group title="Promise">
        <TextInput prefix={P} path="promise.quote" label="Promise" required multiline rows={2} value={s.quote} maxLength={300} error={errors["promise.quote"]} onChange={(quote) => patch("promise", { quote }, "promise.quote", "promise.highlight")} />
        <TextInput prefix={P} path="promise.highlight" label="Highlighted words" value={s.highlight} maxLength={160} error={errors["promise.highlight"]} hint={HIGHLIGHT_HINT} onChange={(highlight) => patch("promise", { highlight }, "promise.highlight")} />
        <TextInput prefix={P} path="promise.byline" label="Line under the promise" multiline rows={2} value={s.byline} maxLength={400} error={errors["promise.byline"]} hint="Optional: a short explanation, or who said it." onChange={(byline) => patch("promise", { byline }, "promise.byline")} />
      </Group>
      <Group title="Figures" description="Up to three, e.g. Free · Delivery over {freeFrom}.">
        {s.stats.map((stat, i) => (
          <div key={i} className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
            <TextInput
              prefix={P}
              path={`promise.stats.${i}.value`}
              label="Figure"
              value={stat.value}
              maxLength={20}
              className="w-40"
              error={errors[`promise.stats.${i}.value`]}
              onChange={(value) => patch("promise", { stats: s.stats.map((x, j) => (j === i ? { ...x, value } : x)) }, `promise.stats.${i}.value`)}
            />
            <TextInput
              prefix={P}
              path={`promise.stats.${i}.label`}
              label="Label"
              value={stat.label}
              maxLength={60}
              className="min-w-48 flex-1"
              error={errors[`promise.stats.${i}.label`]}
              onChange={(label) => patch("promise", { stats: s.stats.map((x, j) => (j === i ? { ...x, label } : x)) }, `promise.stats.${i}.label`)}
            />
            <div className="sm:pt-6">
              <RowActions
                index={i}
                count={s.stats.length}
                label={`figure ${i + 1}`}
                onMove={(to) => patch("promise", { stats: move(s.stats, i, to) }, "promise.stats")}
                onRemove={() => patch("promise", { stats: s.stats.filter((_, j) => j !== i) }, "promise.stats")}
              />
            </div>
          </div>
        ))}
        <AddButton label="Add figure" count={s.stats.length} max={LIMITS.stats} onClick={() => patch("promise", { stats: [...s.stats, { value: "", label: "" }] })} />
      </Group>
      <TextInput prefix={P} path="promise.note" label="Small print" multiline rows={2} value={s.note} maxLength={400} error={errors["promise.note"]} warning={warnings["promise.note"]} hint={NOTE_HINT} onChange={(note) => patch("promise", { note }, "promise.note")} />
      <TokenHelp only={["freeFrom", "cutoff", "shop"]} />
    </>
  );
}

// ---------- latest articles ----------

export function ArticlesFields({ v, patch, errors, warnings }: SectionCtx) {
  const s = v.articles;
  return (
    <>
      <p className="text-muted-foreground text-sm">The newest published posts that are listed on the blog are shown automatically.</p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <TextInput prefix={P} path="articles.title" label="Heading" required value={s.title} maxLength={120} error={errors["articles.title"]} onChange={(title) => patch("articles", { title }, "articles.title")} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId(P, "articles.count")} className="text-sm font-medium">
            How many to show
          </label>
          <SimpleSelect
            id={fieldId(P, "articles.count")}
            value={String(s.count)}
            onValueChange={(n) => patch("articles", { count: Number(n) }, "articles.count")}
            options={ARTICLE_COUNTS.map((n) => ({ value: String(n), label: `${n} articles` }))}
          />
        </div>
      </div>
      <LinkFields prefix={P} path="articles.link" labelLabel="Link text" value={s.link} errors={errors} warnings={warnings} onChange={(link, changed) => patch("articles", { link }, changed)} />
    </>
  );
}

// ---------- call to action ----------

export function CtaFields({ v, patch, errors, warnings }: SectionCtx) {
  const s = v.cta;
  return (
    <>
      <Group title="Text">
        <TextInput prefix={P} path="cta.eyebrow" label="Small heading" value={s.eyebrow} maxLength={60} error={errors["cta.eyebrow"]} className="sm:max-w-sm" onChange={(eyebrow) => patch("cta", { eyebrow }, "cta.eyebrow")} />
        <TextInput prefix={P} path="cta.headline" label="Headline" required value={s.headline} maxLength={200} error={errors["cta.headline"]} onChange={(headline) => patch("cta", { headline }, "cta.headline", "cta.highlight")} />
        <TextInput prefix={P} path="cta.highlight" label="Highlighted words" value={s.highlight} maxLength={160} error={errors["cta.highlight"]} hint={HIGHLIGHT_HINT} onChange={(highlight) => patch("cta", { highlight }, "cta.highlight")} />
        <TextInput prefix={P} path="cta.text" label="Text" multiline rows={2} value={s.text} maxLength={400} error={errors["cta.text"]} hint="Optional line under the headline." onChange={(text) => patch("cta", { text }, "cta.text")} />
      </Group>
      <Group title="Buttons" description="Up to three. The first one is the solid button.">
        {s.buttons.map((b, i) => (
          <div key={i} className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <LinkFields
                prefix={P}
                path={`cta.buttons.${i}`}
                value={b}
                errors={errors}
                warnings={warnings}
                onChange={(next, changed) => patch("cta", { buttons: s.buttons.map((x, j) => (j === i ? next : x)) }, changed)}
              />
            </div>
            <div className="sm:pt-6">
              <RowActions
                index={i}
                count={s.buttons.length}
                label={b.label || `button ${i + 1}`}
                onMove={(to) => patch("cta", { buttons: move(s.buttons, i, to) }, "cta.buttons")}
                onRemove={() => patch("cta", { buttons: s.buttons.filter((_, j) => j !== i) }, "cta.buttons")}
              />
            </div>
          </div>
        ))}
        <AddButton label="Add button" count={s.buttons.length} max={LIMITS.ctaButtons} onClick={() => patch("cta", { buttons: [...s.buttons, { label: "", href: "" }] })} />
      </Group>
    </>
  );
}
