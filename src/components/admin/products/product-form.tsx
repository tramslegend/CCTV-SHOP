"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, ExternalLink, Loader2, RotateCcw, Save, Sparkles } from "lucide-react";
import { createProduct, updateProduct } from "@/app/admin/(panel)/products/actions";
import { CharCount, FieldMessage, FormField, invalidProps } from "@/components/admin/form-field";
import { SimpleSelect } from "@/components/admin/simple-select";
import { AdminToaster, toast } from "@/components/admin/toast";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatGBP, VAT_RATE, withVat } from "@/lib/cctvmaster/money";
import { cn } from "@/lib/utils";
import { CategoriesEditor } from "./categories-editor";
import { DescriptionEditor } from "./description-editor";
import { FormSection } from "./form-section";
import { GuidesEditor } from "./guides-editor";
import { ImagesEditor } from "./images-editor";
import { KitComponentsEditor, KitFields } from "./kit-editor";
import { ProductActions } from "./product-actions";
import { RelatedEditor } from "./related-editor";
import { SeoEditor } from "./seo-editor";
import { SpecsEditor } from "./specs-editor";
import { StatusBadge } from "./status-badges";
import {
  AVAILABILITIES,
  AVAILABILITY_LABELS,
  type CategoryOption,
  type FieldErrors,
  type GuideOption,
  PRODUCT_STATUSES,
  type ProductFormValues,
  STATUS_HINTS,
  STATUS_LABELS,
} from "./types";
import { MONO, parseAmount, slugify } from "./utils";

export interface ProductFormMeta {
  id: string;
  slug: string;
  status: ProductFormValues["status"];
  isKit: boolean;
  /** Dates pre-formatted on the server (avoids time-zone hydration differences). */
  createdLabel: string;
  updatedLabel: string;
  orderCount: number;
  usedInKits: number;
}

const STATUS_OPTIONS = PRODUCT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));
const AVAILABILITY_OPTIONS = AVAILABILITIES.map((a) => ({ value: a, label: AVAILABILITY_LABELS[a] }));
const BADGE_SUGGESTIONS = ["New", "Sale", "Best seller", "Clearance", "Limited stock", "Trade favourite"];

/** "£12.34 inc VAT" preview under a money field. */
function VatPreview({ amount, children }: { amount: number | null; children?: ReactNode }) {
  if (amount === null) return <p className="text-muted-foreground text-xs">Enter the price before VAT.</p>;
  return (
    <p className="text-muted-foreground text-xs">
      <span className="text-foreground font-medium">{formatGBP(withVat(amount))}</span> inc {Math.round(VAT_RATE * 100)}% VAT{children}
    </p>
  );
}

function MoneyInput({ id, value, onChange, error, placeholder }: { id: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">£</span>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={placeholder ?? "0.00"}
        className="pl-6 tabular-nums"
        onChange={(e) => onChange(e.target.value)}
        {...invalidProps(id, error)}
      />
    </div>
  );
}

function ToggleRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}

/** The element for an error key: "attributes.2.value" → #pf-attributes-2-value, falling back to its parents. */
function focusFirstError(keys: string[]) {
  requestAnimationFrame(() => {
    const invalid = document.querySelector<HTMLElement>("#product-form [aria-invalid='true']");
    let target: HTMLElement | null = invalid;
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

export function ProductForm({
  mode,
  initialValues,
  meta,
  categories,
  guides,
  brands,
  siteHost,
  siteName,
  titleTemplate,
}: {
  mode: "create" | "edit";
  initialValues: ProductFormValues;
  meta?: ProductFormMeta;
  categories: CategoryOption[];
  guides: GuideOption[];
  brands: string[];
  siteHost: string;
  siteName: string;
  titleTemplate: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialValues));
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const isKit = values.kit !== null;
  const dirty = JSON.stringify(values) !== baseline;
  const uploading = values.images.some((i) => i.uploading);
  useUnsavedChanges(dirty && !saving);

  const clearErrors = (key: string) =>
    setErrors((e) => {
      const keys = Object.keys(e).filter((k) => k === key || k.startsWith(`${key}.`));
      if (!keys.length) return e;
      const next = { ...e };
      for (const k of keys) delete next[k];
      return next;
    });
  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    clearErrors(key);
  };
  const updateList =
    <K extends "images" | "attributes" | "related" | "components">(key: K) =>
    (fn: (prev: ProductFormValues[K]) => ProductFormValues[K]) => {
      setValues((v) => ({ ...v, [key]: fn(v[key]) }));
      clearErrors(key);
    };

  const save = () => {
    if (saving) return;
    if (uploading) {
      toast.error("Wait for the images to finish uploading, then save.");
      return;
    }
    const payload = values;
    startSaving(async () => {
      try {
        const result = mode === "create" || !meta ? await createProduct(payload) : await updateProduct(meta.id, payload);
        if (result.ok) {
          setErrors({});
          setFormError(null);
          setBaseline(JSON.stringify(payload));
          toast.success(result.message);
          if (mode === "create") router.push(`/admin/products/${result.data.id}`);
        } else {
          const fieldErrors = result.fieldErrors ?? {};
          setErrors(fieldErrors);
          setFormError(result.message);
          toast.error(result.message);
          focusFirstError(Object.keys(fieldErrors));
        }
      } catch {
        setFormError("The product couldn't be saved. Check your connection and try again.");
        toast.error("The product couldn't be saved. Try again.");
      }
    });
  };

  const discard = () => {
    if (!dirty || window.confirm("Discard all unsaved changes?")) {
      setValues(JSON.parse(baseline) as ProductFormValues);
      setErrors({});
      setFormError(null);
    }
  };

  // ----- derived values -----
  const price = parseAmount(values.price);
  const compareAt = parseAmount(values.compareAtPrice);
  const cost = parseAmount(values.costPrice);
  const margin = price !== null && price > 0 && cost !== null ? ((price - cost) / price) * 100 : null;
  const discount = price !== null && compareAt !== null && compareAt > price ? Math.round((1 - price / compareAt) * 100) : null;
  const stockIsZero = values.trackStock && values.stock.trim() !== "" && Number(values.stock) === 0;
  const primary = categories.find((c) => c.id === values.primaryCategoryId);
  const errorCount = Object.keys(errors).length;
  const shopUrl = meta && meta.status === "active" ? `/products/${meta.slug}` : null;

  const field = (key: string) => ({ id: `pf-${key}`, error: errors[key] });

  return (
    <form
      id="product-form"
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
      {/* Title + save bar: stays under the admin header while scrolling. */}
      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/products" className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Back to products">
            <ArrowLeft />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {mode === "create" ? (isKit ? "New kit" : "New product") : initialValues.name || "Untitled product"}
              </h1>
              {meta && <StatusBadge status={meta.status} />}
              {isKit && <span className="rounded-full border bg-white px-2 text-xs leading-5 font-medium">Kit</span>}
            </div>
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {saving ? "Saving…" : uploading ? "Uploading images…" : dirty ? "Unsaved changes" : mode === "edit" ? "All changes saved" : "Not saved yet"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {shopUrl && (
              <a href={shopUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
                View in shop <ExternalLink />
              </a>
            )}
            {meta && <ProductActions id={meta.id} sku={initialValues.sku} status={meta.status} orderCount={meta.orderCount} usedInKits={meta.usedInKits} dirty={dirty} />}
            {dirty && (
              <Button type="button" variant="ghost" size="sm" onClick={discard} disabled={saving}>
                <RotateCcw /> Discard
              </Button>
            )}
            <Button type="submit" size="sm" disabled={saving || uploading || (mode === "edit" && !dirty)}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {mode === "create" ? (isKit ? "Create kit" : "Create product") : "Save"}
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
            <FormField {...field("name")} label="Name" required>
              <Input
                id="pf-name"
                value={values.name}
                maxLength={300}
                placeholder="e.g. Hikvision 4MP ColorVu Turret Camera"
                onChange={(e) => {
                  const name = e.target.value;
                  setValues((v) => ({ ...v, name, ...(slugEdited ? {} : { slug: slugify(name) }) }));
                  clearErrors("name");
                  if (!slugEdited) clearErrors("slug");
                }}
                {...invalidProps("pf-name", errors.name)}
              />
            </FormField>
            <FormField
              {...field("slug")}
              label="URL slug"
              required
              hint={
                mode === "edit" && meta?.status === "active" && values.slug !== initialValues.slug
                  ? "Changing the URL of a live product breaks links to the old address."
                  : `Shop address: /products/${values.slug || "…"}`
              }
              labelAside={
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
              }
            >
              <div className="flex items-center">
                <span className="text-muted-foreground flex h-8 items-center rounded-l-lg border border-r-0 bg-surface px-2.5 text-sm">/products/</span>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField {...field("sku")} label="SKU" required hint="Your stock code. Must be unique.">
                <Input
                  id="pf-sku"
                  value={values.sku}
                  maxLength={100}
                  autoComplete="off"
                  className={cn(MONO, "text-[13px]")}
                  onChange={(e) => set("sku", e.target.value)}
                  {...invalidProps("pf-sku", errors.sku)}
                />
              </FormField>
              <FormField {...field("brand")} label="Brand">
                <Input id="pf-brand" list="pf-brand-options" value={values.brand} maxLength={100} onChange={(e) => set("brand", e.target.value)} {...invalidProps("pf-brand", errors.brand)} />
                <datalist id="pf-brand-options">
                  {brands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </FormField>
            </div>
            <FormField
              {...field("shortDescription")}
              label="Short description"
              hint="One or two sentences. Used as the search-result description when no SEO description is set."
              labelAside={<CharCount value={values.shortDescription} recommended={160} max={500} />}
            >
              <Textarea
                id="pf-shortDescription"
                rows={2}
                maxLength={500}
                value={values.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
                {...invalidProps("pf-shortDescription", errors.shortDescription)}
              />
            </FormField>
          </FormSection>

          <FormSection id="images" title="Images" description="Drag to reorder. The first image is shown on listings and at the top of the product page.">
            <ImagesEditor images={values.images} onChange={updateList("images")} errors={errors} productName={values.name} />
          </FormSection>

          <FormSection id="description" title="Description" description="Shown in the “Product Description” section of the product page.">
            <DescriptionEditor value={values.description} onChange={(v) => set("description", v)} error={errors.description} />
          </FormSection>

          <FormSection id="pricing" title="Pricing" description="Prices are entered before VAT; the shop shows them with VAT.">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField {...field("price")} label="Price (ex VAT)" required hint={undefined}>
                <MoneyInput id="pf-price" value={values.price} onChange={(v) => set("price", v)} error={errors.price} />
                {!errors.price && <VatPreview amount={price} />}
              </FormField>
              <FormField {...field("compareAtPrice")} label="Compare-at price (ex VAT)" hint={errors.compareAtPrice ? undefined : "Optional “was” price."}>
                <MoneyInput id="pf-compareAtPrice" value={values.compareAtPrice} onChange={(v) => set("compareAtPrice", v)} error={errors.compareAtPrice} placeholder="" />
                {compareAt !== null && !errors.compareAtPrice && <VatPreview amount={compareAt}>{discount !== null && discount > 0 ? ` · ${discount}% off` : ""}</VatPreview>}
              </FormField>
              <FormField {...field("costPrice")} label="Cost price (ex VAT)" hint={errors.costPrice ? undefined : "Only visible here."}>
                <MoneyInput id="pf-costPrice" value={values.costPrice} onChange={(v) => set("costPrice", v)} error={errors.costPrice} placeholder="" />
                {margin !== null && price !== null && cost !== null && (
                  <p className={cn("text-xs", margin < 0 ? "text-red-700" : "text-muted-foreground")}>
                    Margin <span className="text-foreground font-medium">{margin.toFixed(1)}%</span> · {formatGBP(Math.round((price - cost) * 100) / 100)} profit per unit
                  </p>
                )}
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleRow
                id="pf-isContactSales"
                label="Contact sales"
                hint="Replace “Add to basket” with a request-a-quote button."
                checked={values.isContactSales}
                onChange={(v) => set("isContactSales", v)}
              />
              <ToggleRow
                id="pf-isCallForPrice"
                label="Call for price"
                hint="Hide the price and ask customers to call."
                checked={values.isCallForPrice}
                onChange={(v) => set("isCallForPrice", v)}
              />
            </div>
          </FormSection>

          <FormSection id="inventory" title="Inventory">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField {...field("availability")} label="Availability" required>
                <SimpleSelect
                  id="pf-availability"
                  value={values.availability}
                  options={AVAILABILITY_OPTIONS}
                  onValueChange={(v) => set("availability", v)}
                  invalid={!!errors.availability}
                />
              </FormField>
              <FormField {...field("stock")} label="Quantity in stock" hint={values.trackStock ? undefined : "Turn on stock tracking to record a quantity."}>
                <Input
                  id="pf-stock"
                  inputMode="numeric"
                  value={values.stock}
                  disabled={!values.trackStock}
                  onChange={(e) => set("stock", e.target.value)}
                  {...invalidProps("pf-stock", errors.stock)}
                />
              </FormField>
              <FormField {...field("weightGrams")} label="Weight (grams)" hint="Optional, for delivery.">
                <Input id="pf-weightGrams" inputMode="numeric" value={values.weightGrams} onChange={(e) => set("weightGrams", e.target.value)} {...invalidProps("pf-weightGrams", errors.weightGrams)} />
              </FormField>
            </div>
            <ToggleRow
              id="pf-trackStock"
              label="Track stock"
              hint="Record how many you have. Availability isn't changed automatically."
              checked={values.trackStock}
              onChange={(v) => set("trackStock", v)}
            />
            {stockIsZero && values.availability === "in_stock" && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span>Stock is 0 but the product is marked in stock.</span>
                <Button type="button" size="xs" variant="outline" onClick={() => set("availability", "out_of_stock")}>
                  Set to out of stock
                </Button>
              </div>
            )}
          </FormSection>

          {values.kit && (
            <>
              <FormSection id="kit" title="Kit details" description="Used by the kit range filters, the recording estimate and the kit summary.">
                <KitFields
                  kit={values.kit}
                  errors={errors}
                  onChange={(patch) => {
                    setValues((v) => (v.kit ? { ...v, kit: { ...v.kit, ...patch } } : v));
                    for (const key of Object.keys(patch)) clearErrors(`kit.${key}`);
                  }}
                />
              </FormSection>
              <FormSection id="components" title="What's in the kit" description="Components appear in the “What's in the box” list, in this order.">
                <KitComponentsEditor parts={values.components} onChange={updateList("components")} errors={errors} kitPrice={values.price} cameraCount={values.kit.cameraCount} />
              </FormSection>
            </>
          )}

          <FormSection id="specifications" title="Specifications">
            <SpecsEditor rows={values.attributes} onChange={updateList("attributes")} errors={errors} />
          </FormSection>

          <FormSection id="related" title="Related products" description="Shown as “You may also like” on the product page.">
            <RelatedEditor items={values.related} onChange={updateList("related")} errors={errors} selfId={meta?.id} />
          </FormSection>

          <FormSection id="guides" title="Helpful guides" description="Blog posts linked from the product page.">
            <GuidesEditor options={guides} value={values.guides} onChange={(v) => set("guides", v)} errors={errors} />
          </FormSection>

          <FormSection id="seo" title="Search engine listing">
            <SeoEditor
              seoTitle={values.seoTitle}
              seoDescription={values.seoDescription}
              onChange={(patch) => {
                setValues((v) => ({ ...v, ...patch }));
                for (const key of Object.keys(patch)) clearErrors(key);
              }}
              errors={errors}
              siteHost={siteHost}
              siteName={siteName}
              titleTemplate={titleTemplate}
              fallback={{
                name: values.name,
                slug: values.slug,
                sku: values.sku,
                brand: values.brand,
                shortDescription: values.shortDescription,
                category: primary?.name,
              }}
            />
          </FormSection>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-36">
          <FormSection id="status" title="Status">
            <FormField {...field("status")} label="Visibility" hint={STATUS_HINTS[values.status]}>
              <SimpleSelect id="pf-status" value={values.status} options={STATUS_OPTIONS} onValueChange={(v) => set("status", v)} invalid={!!errors.status} />
            </FormField>
            <FormField {...field("badge")} label="Badge" hint="Short label on the product card, e.g. “New”.">
              <Input id="pf-badge" list="pf-badge-options" value={values.badge} maxLength={40} onChange={(e) => set("badge", e.target.value)} {...invalidProps("pf-badge", errors.badge)} />
              <datalist id="pf-badge-options">
                {BADGE_SUGGESTIONS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </FormField>
          </FormSection>

          <FormSection id="organisation" title="Categories">
            <CategoriesEditor
              options={categories}
              primaryId={values.primaryCategoryId}
              extraIds={values.extraCategoryIds}
              onPrimaryChange={(id) => set("primaryCategoryId", id)}
              onExtraChange={(ids) => set("extraCategoryIds", ids)}
              errors={errors}
            />
          </FormSection>

          {meta && (
            <section className="text-muted-foreground rounded-xl bg-white p-5 text-xs ring-1 ring-black/10">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                <dt>Type</dt>
                <dd className="text-foreground">{meta.isKit ? "Ready-made kit" : "Single product"}</dd>
                <dt>Created</dt>
                <dd className="text-foreground">{meta.createdLabel}</dd>
                <dt>Updated</dt>
                <dd className="text-foreground">{meta.updatedLabel}</dd>
                <dt>Orders</dt>
                <dd className="text-foreground">{meta.orderCount ? `${meta.orderCount} order lines` : "None yet"}</dd>
                {meta.usedInKits > 0 && (
                  <>
                    <dt>In kits</dt>
                    <dd className="text-foreground">Component of {meta.usedInKits} kits</dd>
                  </>
                )}
                <dt>ID</dt>
                <dd className={cn("text-foreground truncate", MONO)}>{meta.id}</dd>
              </dl>
            </section>
          )}
          <FieldMessage id="pf-form" error={errors.form} />
        </aside>
      </div>
    </form>
  );
}
