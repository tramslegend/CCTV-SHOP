"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { FieldMessage, invalidProps } from "@/components/admin/form-field";
import { PickRow } from "@/components/admin/products/related-editor";
import type { ProductPick } from "@/components/admin/products/types";
import { searchProductPicks } from "@/components/admin/products/utils";
import { SearchPicker } from "@/components/admin/search-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newId } from "@/lib/content/blocks";
import { move } from "./faq-editor";
import { PostStatusBadge } from "./status";
import type { FieldErrors, PostOption, SourceValue } from "./types";

const normalise = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

/** Products recommended under the article ("Related products" and "Recommended products"), in display order. */
export function PostProductsEditor({ items, onChange, errors }: { items: ProductPick[]; onChange: (items: ProductPick[]) => void; errors: FieldErrors }) {
  const chosen = new Set(items.map((p) => p.id));
  return (
    <div className="flex flex-col gap-3">
      <SearchPicker<ProductPick>
        id="pf-products"
        aria-label="Search products to recommend"
        placeholder="Search by name or SKU to add a product…"
        search={(q) => searchProductPicks(q, "all")}
        getKey={(p) => p.id}
        isDisabled={(p) => chosen.has(p.id)}
        renderItem={(p) => <PickRow pick={p} />}
        onSelect={(p) => onChange(items.some((x) => x.id === p.id) ? items : [...items, p])}
        minChars={2}
        emptyText="No products match"
      />
      {errors.products && <p className="text-xs text-red-700">{errors.products}</p>}
      {items.length ? (
        <ol className="divide-y rounded-lg border">
          {items.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 px-3 py-2">
              <span className="text-muted-foreground w-5 text-xs tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <PickRow pick={p} />
                {errors[`products.${i}`] && <p className="mt-1 text-xs text-red-700">{errors[`products.${i}`]}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${p.sku} up`} disabled={i === 0} onClick={() => onChange(move(items, i, i - 1))}>
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${p.sku} down`} disabled={i === items.length - 1} onClick={() => onChange(move(items, i, i + 1))}>
                <ArrowDown />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${p.sku}`} onClick={() => onChange(items.filter((x) => x.id !== p.id))}>
                <X />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">No products. Inactive products are skipped in the shop.</p>
      )}
    </div>
  );
}

/** "Related reading" posts, in display order, picked from every post by title or slug. */
export function RelatedPostsEditor({
  items,
  options,
  onChange,
  errors,
  selfSlug,
}: {
  items: PostOption[];
  options: PostOption[];
  onChange: (items: PostOption[]) => void;
  errors: FieldErrors;
  selfSlug?: string;
}) {
  const chosen = new Set(items.map((p) => p.slug));
  const search = (q: string) => {
    const words = normalise(q).split(" ").filter(Boolean);
    return options
      .filter((o) => o.slug !== selfSlug && words.every((w) => normalise(`${o.title} ${o.slug}`).includes(w)))
      .slice(0, 20);
  };
  return (
    <div className="flex flex-col gap-3">
      <SearchPicker<PostOption>
        id="pf-related"
        aria-label="Search posts to add as related reading"
        placeholder="Search posts by title to add…"
        search={search}
        getKey={(p) => p.slug}
        isDisabled={(p) => chosen.has(p.slug)}
        renderItem={(p) => (
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{p.title}</span>
            {p.status !== "active" && <PostStatusBadge status={p.status} />}
          </span>
        )}
        onSelect={(p) => onChange(items.some((x) => x.slug === p.slug) ? items : [...items, p])}
        minChars={2}
        emptyText="No posts match"
      />
      {errors.related && <p className="text-xs text-red-700">{errors.related}</p>}
      {items.length ? (
        <ol className="divide-y rounded-lg border">
          {items.map((p, i) => (
            <li key={p.slug} className="flex items-center gap-2 px-3 py-2">
              <span className="text-muted-foreground w-5 text-xs tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm">{p.title}</span>
                  {p.status !== "active" && <PostStatusBadge status={p.status} />}
                </span>
                <span className="text-muted-foreground block truncate text-xs">/blog/{p.slug}</span>
                {errors[`related.${i}`] && <p className="mt-1 text-xs text-red-700">{errors[`related.${i}`]}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${p.title} up`} disabled={i === 0} onClick={() => onChange(move(items, i, i - 1))}>
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${p.title} down`} disabled={i === items.length - 1} onClick={() => onChange(move(items, i, i + 1))}>
                <ArrowDown />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${p.title}`} onClick={() => onChange(items.filter((x) => x.slug !== p.slug))}>
                <X />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">No related posts. Unpublished posts are skipped in the shop.</p>
      )}
    </div>
  );
}

/** "Sources & references": title + web address pairs. */
export function SourcesEditor({ items, onChange, errors }: { items: SourceValue[]; onChange: (items: SourceValue[]) => void; errors: FieldErrors }) {
  const update = (i: number, patch: Partial<SourceValue>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div className="flex flex-col gap-3">
      {errors.sources && <p className="text-xs text-red-700">{errors.sources}</p>}
      {items.length > 0 && (
        <ol className="flex flex-col gap-2">
          {items.map((src, i) => {
            const tId = `pf-sources-${i}-title`;
            const uId = `pf-sources-${i}-url`;
            return (
              <li key={src.id} className="flex gap-2 rounded-lg border bg-zinc-50/60 p-3">
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Input
                      id={tId}
                      aria-label={`Source ${i + 1} title`}
                      placeholder="Title, e.g. ICO guidance on CCTV"
                      value={src.title}
                      maxLength={300}
                      className="bg-white"
                      onChange={(e) => update(i, { title: e.target.value })}
                      {...invalidProps(tId, errors[`sources.${i}.title`])}
                    />
                    <FieldMessage id={tId} error={errors[`sources.${i}.title`]} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Input
                      id={uId}
                      aria-label={`Source ${i + 1} address`}
                      placeholder="https://…"
                      inputMode="url"
                      value={src.url}
                      maxLength={2000}
                      className="bg-white"
                      onChange={(e) => update(i, { url: e.target.value.trim() })}
                      {...invalidProps(uId, errors[`sources.${i}.url`])}
                    />
                    <FieldMessage id={uId} error={errors[`sources.${i}.url`]} />
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`Move source ${i + 1} up`} disabled={i === 0} onClick={() => onChange(move(items, i, i - 1))}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`Move source ${i + 1} down`} disabled={i === items.length - 1} onClick={() => onChange(move(items, i, i + 1))}>
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove source ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { id: newId("s"), title: "", url: "" }])}>
          <Plus /> Add source
        </Button>
      </div>
    </div>
  );
}
