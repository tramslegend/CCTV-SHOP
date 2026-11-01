"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { fieldId, ImagePicker, move, RowActions, SwitchField } from "@/components/admin/homepage/editor-kit";
import { MONO } from "@/components/admin/products/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { HeaderMeta, MenuLinkMeta } from "@/lib/navigation/admin";
import type { HeaderItemSetting } from "@/lib/navigation/schema";
import { cn } from "@/lib/utils";

export const N = "nav";

const allHrefs = (links: MenuLinkMeta[]): string[] => links.flatMap((l) => [l.href, ...allHrefs(l.items)]);

/** The generated menu of one category: show/hide each link and optionally choose its picture. */
function MenuContents({
  meta,
  item,
  topIcon,
  onChange,
  onUploadingChange,
}: {
  meta: HeaderMeta;
  item: HeaderItemSetting;
  topIcon: string;
  onChange: (next: HeaderItemSetting) => void;
  onUploadingChange: (u: boolean) => void;
}) {
  const hidden = new Set(item.hidden);
  const toggle = (href: string, show: boolean) =>
    onChange({ ...item, hidden: show ? item.hidden.filter((h) => h !== href) : [...item.hidden, href] });
  const setIcon = (href: string, url: string) => {
    const icons = { ...item.icons };
    if (url) icons[href] = url;
    else delete icons[href];
    onChange({ ...item, icons });
  };
  const row = (link: MenuLinkMeta, fallback: string, level: number) => {
    const resolved = item.icons[link.href] || link.ownImage || fallback;
    const shown = !hidden.has(link.href);
    const id = fieldId(N, `menu-${meta.slug}-${link.href}`).replace(/[^a-zA-Z0-9_-]/g, "_");
    return (
      <li key={link.href} className={cn(level === 0 ? "rounded-lg border p-3" : "")}>
        <div className={cn("flex flex-wrap items-center gap-3", !shown && "opacity-60")}>
          <Checkbox id={id} checked={shown} onCheckedChange={(v) => toggle(link.href, v === true)} aria-label={`Show ${link.name} in the ${meta.name} menu`} />
          <label htmlFor={id} className={cn("min-w-0 flex-1 text-sm", level === 0 ? "font-semibold" : "text-foreground/80")}>
            {link.name}
            <span className={cn("text-muted-foreground ml-2 text-[11px] font-normal", MONO)}>{link.href}</span>
          </label>
          <ImagePicker
            id={`${id}-icon`}
            value={item.icons[link.href] ?? ""}
            fallback={link.ownImage || fallback}
            fallbackLabel="Default"
            size={level === 0 ? 36 : 28}
            compact
            onUploadingChange={onUploadingChange}
            onChange={(url) => setIcon(link.href, url)}
          />
        </div>
        {link.items.length > 0 && (
          <ul className={cn("mt-2 grid gap-2 border-l pl-4 sm:grid-cols-2", !shown && "opacity-60")}>{link.items.map((child) => row(child, resolved, level + 1))}</ul>
        )}
      </li>
    );
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">
        {meta.isKitRoot
          ? "Built from the kit ranges (by system, then cameras, resolution and colour). Hidden kit ranges are left out automatically."
          : "Built from this category's subcategories and theirs, in the order set under Categories. Hidden categories are left out automatically."}{" "}
        Untick a link to leave it out of the menu; a picture you choose replaces the subcategory&apos;s own (or its parent&apos;s) picture.
      </p>
      <ul className="flex flex-col gap-2">{meta.links.map((l) => row(l, topIcon, 0))}</ul>
    </div>
  );
}

/** Header category bar: which top-level categories appear, their order, pictures and menus. */
export function HeaderEditor({
  meta,
  items,
  onChange,
  onUploadingChange,
  hiddenCategories,
  errors,
}: {
  meta: HeaderMeta[];
  items: HeaderItemSetting[];
  onChange: (items: HeaderItemSetting[], changed?: string) => void;
  onUploadingChange: (u: boolean) => void;
  hiddenCategories: string[];
  errors: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const bySlug = new Map(meta.map((m) => [m.slug, m]));
  const set = (i: number, next: HeaderItemSetting, changed?: string) => onChange(items.map((x, j) => (j === i ? next : x)), changed);
  return (
    <div className="flex flex-col gap-3">
      {errors["navigation.header"] && <p className="text-xs text-red-700">{errors["navigation.header"]}</p>}
      <ol className="flex flex-col gap-2" aria-label="Header categories">
        {items.map((item, i) => {
          const m = bySlug.get(item.slug);
          if (!m) return null;
          const topIcon = item.icon || m.categoryImage;
          const hrefs = new Set(allHrefs(m.links));
          const links = hrefs.size;
          const hasMenu = links > 0;
          const shownLinks = links - item.hidden.filter((h) => hrefs.has(h)).length;
          const isOpen = expanded === item.slug;
          return (
            <li key={item.slug} className={cn("rounded-lg border bg-white", !item.show && "bg-surface")} data-testid={`header-item-${item.slug}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
                <RowActions index={i} count={items.length} label={m.name} onMove={(to) => onChange(move(items, i, to))} />
                <div className="min-w-36 flex-1">
                  <p className={cn("text-sm font-semibold", !item.show && "text-muted-foreground")}>{m.name}</p>
                  <p className={cn("text-muted-foreground text-[11px]", MONO)}>{m.href}</p>
                </div>
                <ImagePicker
                  id={fieldId(N, `navigation.header.${i}.icon`)}
                  value={item.icon}
                  fallback={m.categoryImage}
                  fallbackLabel="Category image"
                  size={36}
                  compact
                  error={errors[`navigation.header.${i}.icon`]}
                  onUploadingChange={onUploadingChange}
                  onChange={(icon) => set(i, { ...item, icon }, `navigation.header.${i}.icon`)}
                />
                <SwitchField
                  id={fieldId(N, `navigation.header.${i}.show`)}
                  label="In the header"
                  checked={item.show}
                  onChange={(show) => set(i, { ...item, show })}
                />
                <SwitchField
                  id={fieldId(N, `navigation.header.${i}.menu`)}
                  label="Opens a menu"
                  hint={hasMenu ? undefined : "No subcategories"}
                  checked={item.menu && hasMenu}
                  disabled={!hasMenu}
                  onChange={(menu) => set(i, { ...item, menu })}
                />
                {hasMenu && (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : item.slug)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-foreground/80 hover:bg-muted"
                  >
                    Menu contents ({shownLinks}/{links} links)
                    <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                  </button>
                )}
              </div>
              {isOpen && hasMenu && (
                <div className="border-t p-3">
                  <MenuContents meta={m} item={item} topIcon={topIcon} onChange={(next) => set(i, next)} onUploadingChange={onUploadingChange} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-muted-foreground text-xs">
        New top-level categories are added at the end automatically. Category names come from Categories.
        {hiddenCategories.length > 0 && ` Hidden categories never appear here: ${hiddenCategories.join(", ")}.`}
      </p>
    </div>
  );
}
