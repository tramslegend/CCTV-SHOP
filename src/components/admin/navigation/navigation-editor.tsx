"use client";

import { useCallback, useState } from "react";
import { ExternalLink } from "lucide-react";
import { saveNavigation } from "@/app/admin/(panel)/content/navigation/actions";
import {
  AddButton,
  EditorBar,
  fieldId,
  Group,
  LinkFields,
  move,
  Panel,
  RowActions,
  SwitchField,
  TextInput,
  TokenHelp,
  useContentForm,
} from "@/components/admin/homepage/editor-kit";
import { FeatureRows } from "@/components/admin/homepage/section-fields";
import { AdminToaster } from "@/components/admin/toast";
import { MONO } from "@/components/admin/products/utils";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import type { FieldMessages } from "@/lib/homepage/validation";
import type { HeaderMeta } from "@/lib/navigation/admin";
import {
  ANNOUNCEMENT_COLOUR_LABELS,
  ANNOUNCEMENT_COLOURS,
  ANNOUNCEMENT_STYLES,
  LIMITS,
  type NavigationSettings,
  PAYMENT_MARKS,
} from "@/lib/navigation/schema";
import type { NavigationFormValues } from "@/lib/navigation/validation";
import { cn } from "@/lib/utils";
import { HeaderEditor, N } from "./header-editor";

type Area = "announcement" | "topLinks" | "header" | "footer";
const AREA_OF: [string, Area][] = [
  ["announcement", "announcement"],
  ["navigation.topBar", "topLinks"],
  ["navigation.topLinks", "topLinks"],
  ["navigation.header", "header"],
  ["navigation.footer", "footer"],
];
const areaOf = (path: string) => AREA_OF.find(([prefix]) => path === prefix || path.startsWith(`${prefix}.`))?.[1];

/** /admin/content/navigation: announcement banner, top bar and its links, header category bar and footer. */
export function NavigationEditor({
  initial,
  initialWarnings,
  meta,
  hiddenCategories,
}: {
  initial: NavigationFormValues;
  initialWarnings: FieldMessages;
  meta: HeaderMeta[];
  hiddenCategories: string[];
}) {
  const [open, setOpen] = useState<Record<Area, boolean>>({ announcement: true, topLinks: true, header: true, footer: true });
  const [uploads, setUploads] = useState(0);
  const onErrors = useCallback((paths: string[]) => {
    setOpen((prev) => {
      const next = { ...prev };
      for (const p of paths) {
        const a = areaOf(p);
        if (a) next[a] = true;
      }
      return next;
    });
  }, []);
  const form = useContentForm({ prefix: N, initial, initialWarnings, save: saveNavigation, onErrors });
  const { values: v, errors, warnings } = form;
  const onUploadingChange = useCallback((u: boolean) => setUploads((n) => Math.max(0, n + (u ? 1 : -1))), []);

  const setNav = (patch: Partial<NavigationSettings>, ...paths: string[]) =>
    form.update((prev) => ({ ...prev, navigation: { ...prev.navigation, ...patch } }), ...paths);
  const setFooter = (patch: Partial<NavigationSettings["footer"]>, ...paths: string[]) =>
    form.update((prev) => ({ ...prev, navigation: { ...prev.navigation, footer: { ...prev.navigation.footer, ...patch } } }), ...paths);
  const setBanner = (patch: Partial<NavigationFormValues["announcement"]>, ...paths: string[]) =>
    form.update((prev) => ({ ...prev, announcement: { ...prev.announcement, ...patch } }), ...paths);
  const setTopBar = (patch: Partial<NavigationSettings["topBar"]>, ...paths: string[]) =>
    form.update((prev) => ({ ...prev, navigation: { ...prev.navigation, topBar: { ...prev.navigation.topBar, ...patch } } }), ...paths);

  const count = (area: Area) => Object.keys(errors).filter((k) => areaOf(k) === area).length;
  const a = v.announcement;
  const top = v.navigation.topBar;
  const footer = v.navigation.footer;
  const columns = footer.columns;

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
        title="Navigation"
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
      <div className="flex flex-col gap-4">
        <Panel
          id="announcement"
          title="Announcement banner"
          description="A coloured strip at the very top of every page, above the top bar."
          open={open.announcement}
          onOpenChange={(o) => setOpen((p) => ({ ...p, announcement: o }))}
          errorCount={count("announcement")}
          muted={!a.enabled}
          header={
            <label className="flex items-center gap-2 text-xs font-medium text-foreground/80">
              <Switch checked={a.enabled} aria-label="Show the announcement banner" onCheckedChange={(enabled) => setBanner({ enabled }, "announcement")} />
              {a.enabled ? "On" : "Off"}
            </label>
          }
        >
          <TextInput
            prefix={N}
            path="announcement.text"
            label="Text"
            required={a.enabled}
            value={a.text}
            maxLength={200}
            error={errors["announcement.text"]}
            placeholder="e.g. Free delivery on orders over {freeFrom} this week"
            onChange={(text) => setBanner({ text }, "announcement.text")}
          />
          <LinkFields
            prefix={N}
            path="announcement.link"
            labelLabel="Link text (optional)"
            hrefLabel="Link"
            value={a.link}
            errors={errors}
            warnings={warnings}
            onChange={(link, changed) => setBanner({ link }, changed)}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Colour</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {ANNOUNCEMENT_COLOURS.map((c) => (
                <label
                  key={c}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                    a.colour === c ? "border-primary ring-1 ring-primary" : "hover:border-zinc-400",
                  )}
                >
                  <input type="radio" name="announcement-colour" value={c} checked={a.colour === c} onChange={() => setBanner({ colour: c })} className="sr-only" />
                  <span className={cn("size-4 rounded-full border border-black/10", ANNOUNCEMENT_STYLES[c])} aria-hidden="true" />
                  {ANNOUNCEMENT_COLOUR_LABELS[c]}
                </label>
              ))}
            </div>
          </fieldset>
          <SwitchField
            id={fieldId(N, "announcement.dismissible")}
            label="Shoppers can close it"
            hint="Once closed it stays closed in their browser, until you change the text or link."
            checked={a.dismissible}
            onChange={(dismissible) => setBanner({ dismissible })}
          />
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">Preview</p>
            <div className={cn("rounded-md px-4 py-2 text-center text-[13px] font-medium", ANNOUNCEMENT_STYLES[a.colour])}>
              {a.text || "Your announcement"}
              {a.link.label && <span className="ml-1 font-semibold underline underline-offset-2">{a.link.label}</span>}
            </div>
          </div>
          <TokenHelp only={["freeFrom", "cutoff", "shop"]} />
        </Panel>

        <Panel
          id="top-links"
          title="Top bar"
          description="The black bar at the very top, above the logo: phone number, store link, where you deliver to, and links on the right."
          open={open.topLinks}
          onOpenChange={(o) => setOpen((p) => ({ ...p, topLinks: o }))}
          errorCount={count("topLinks")}
          muted={!top.enabled}
          header={
            <label className="flex items-center gap-2 text-xs font-medium text-foreground/80">
              <Switch checked={top.enabled} aria-label="Show the top bar" onCheckedChange={(enabled) => setTopBar({ enabled }, "navigation.topBar")} />
              {top.enabled ? "On" : "Off"}
            </label>
          }
        >
          <SwitchField
            id={fieldId(N, "navigation.topBar.showPhone")}
            label="Phone number"
            hint="Your number from Settings → Store details. Hidden when none is set."
            checked={top.showPhone}
            onChange={(showPhone) => setTopBar({ showPhone }, "navigation.topBar.showPhone")}
          />
          <SwitchField
            id={fieldId(N, "navigation.topBar.showStore")}
            label="“Our Store” map link"
            hint="Opens your address on a map (Settings → Store details)."
            checked={top.showStore}
            onChange={(showStore) => setTopBar({ showStore }, "navigation.topBar.showStore")}
          />
          <TextInput
            prefix={N}
            path="navigation.topBar.deliverTo"
            label="Deliver to"
            value={top.deliverTo}
            maxLength={40}
            error={errors["navigation.topBar.deliverTo"]}
            placeholder="e.g. Spain, Europe or Worldwide"
            hint="Shown as “Deliver to …”, linking to your delivery page. Leave empty to hide it."
            onChange={(deliverTo) => setTopBar({ deliverTo }, "navigation.topBar.deliverTo")}
          />
          <p className="text-sm font-medium">Links on the right</p>
          {v.navigation.topLinks.map((link, i) => (
            <div key={i} className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <LinkFields
                  prefix={N}
                  path={`navigation.topLinks.${i}`}
                  labelLabel="Text"
                  value={link}
                  errors={errors}
                  warnings={warnings}
                  onChange={(next, changed) => setNav({ topLinks: v.navigation.topLinks.map((x, j) => (j === i ? next : x)) }, changed)}
                />
              </div>
              <div className="sm:pt-6">
                <RowActions
                  index={i}
                  count={v.navigation.topLinks.length}
                  label={link.label || `link ${i + 1}`}
                  onMove={(to) => setNav({ topLinks: move(v.navigation.topLinks, i, to) }, "navigation.topLinks")}
                  onRemove={() => setNav({ topLinks: v.navigation.topLinks.filter((_, j) => j !== i) }, "navigation.topLinks")}
                />
              </div>
            </div>
          ))}
          <AddButton
            label="Add link"
            count={v.navigation.topLinks.length}
            max={LIMITS.topLinks}
            onClick={() => setNav({ topLinks: [...v.navigation.topLinks, { label: "", href: "" }] })}
          />
        </Panel>

        <Panel
          id="header"
          title="Header category bar"
          description="The row of categories under the search box (computers). Choose which appear, their order and pictures, and whether each opens a menu."
          open={open.header}
          onOpenChange={(o) => setOpen((p) => ({ ...p, header: o }))}
          errorCount={count("header")}
        >
          <HeaderEditor
            meta={meta}
            items={v.navigation.header}
            errors={errors}
            hiddenCategories={hiddenCategories}
            onUploadingChange={onUploadingChange}
            onChange={(header, changed) => setNav({ header }, ...(changed ? [changed] : ["navigation.header"]))}
          />
        </Panel>

        <Panel
          id="footer"
          title="Footer"
          description="Highlights strip, link columns, payment marks and the bottom line. Your logo, tagline, contact details and social links come from Settings."
          open={open.footer}
          onOpenChange={(o) => setOpen((p) => ({ ...p, footer: o }))}
          errorCount={count("footer")}
        >
          <Group title="Highlights" description="The strip at the top of the footer, up to three.">
            <FeatureRows
              prefix={N}
              path="navigation.footer.highlights"
              rows={footer.highlights}
              max={LIMITS.highlights}
              errors={errors}
              what="highlight"
              onChange={(highlights, changed) => setFooter({ highlights }, changed ?? "navigation.footer.highlights")}
            />
          </Group>
          <Group
            title="Link columns"
            description={`Up to ${LIMITS.columns} columns of up to ${LIMITS.columnLinks} links. A link is a page on the shop such as /contact, or a full web address.`}
          >
            {columns.map((col, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-lg border p-3" data-testid={`footer-column-${i}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <TextInput
                    prefix={N}
                    path={`navigation.footer.columns.${i}.title`}
                    label={`Column ${i + 1} heading`}
                    value={col.title}
                    maxLength={60}
                    className="min-w-48 flex-1"
                    error={errors[`navigation.footer.columns.${i}.title`]}
                    onChange={(title) => setFooter({ columns: columns.map((c, j) => (j === i ? { ...c, title } : c)) }, `navigation.footer.columns.${i}.title`)}
                  />
                  <div className="sm:pt-6">
                    <RowActions
                      index={i}
                      count={columns.length}
                      label={`column ${col.title || i + 1}`}
                      onMove={(to) => setFooter({ columns: move(columns, i, to) }, "navigation.footer.columns")}
                      onRemove={() => {
                        if (!col.links.length || window.confirm(`Remove the "${col.title || `column ${i + 1}`}" column and its links?`))
                          setFooter({ columns: columns.filter((_, j) => j !== i) }, "navigation.footer.columns");
                      }}
                    />
                  </div>
                </div>
                <ol className="flex flex-col gap-2 border-l pl-3">
                  {col.links.map((link, k) => {
                    const setLinks = (links: typeof col.links, ...paths: string[]) =>
                      setFooter({ columns: columns.map((c, j) => (j === i ? { ...c, links } : c)) }, ...paths);
                    return (
                      <li key={k} className="flex flex-wrap items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <LinkFields
                            prefix={N}
                            path={`navigation.footer.columns.${i}.links.${k}`}
                            labelLabel="Text"
                            hrefHint=""
                            value={link}
                            errors={errors}
                            warnings={warnings}
                            onChange={(next, changed) => setLinks(col.links.map((x, j) => (j === k ? next : x)), changed)}
                          />
                        </div>
                        <div className="sm:pt-6">
                          <RowActions
                            index={k}
                            count={col.links.length}
                            label={link.label || `link ${k + 1}`}
                            onMove={(to) => setLinks(move(col.links, k, to), `navigation.footer.columns.${i}.links`)}
                            onRemove={() => setLinks(col.links.filter((_, j) => j !== k), `navigation.footer.columns.${i}.links`)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <AddButton
                  label="Add link"
                  count={col.links.length}
                  max={LIMITS.columnLinks}
                  onClick={() => setFooter({ columns: columns.map((c, j) => (j === i ? { ...c, links: [...c.links, { label: "", href: "" }] } : c)) })}
                />
              </div>
            ))}
            <AddButton label="Add column" count={columns.length} max={LIMITS.columns} onClick={() => setFooter({ columns: [...columns, { title: "", links: [] }] })} />
          </Group>
          <Group title="Payment marks" description="Card and wallet marks shown at the bottom.">
            <div className="flex flex-wrap gap-2">
              {PAYMENT_MARKS.map((m) => {
                const id = fieldId(N, `payments-${m.id}`);
                const on = footer.payments.includes(m.id);
                return (
                  <label key={m.id} htmlFor={id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm", on && "border-primary")}>
                    <Checkbox
                      id={id}
                      checked={on}
                      aria-label={`Show ${m.label}`}
                      onCheckedChange={(checked) =>
                        setFooter({ payments: checked ? [...footer.payments, m.id] : footer.payments.filter((p) => p !== m.id) })
                      }
                    />
                    <span className={cn("grid h-6 min-w-11 place-items-center rounded border border-zinc-800 bg-primary px-1.5 text-[10px] font-semibold tracking-wider text-zinc-300", MONO)}>
                      {m.mark}
                    </span>
                    {m.label}
                  </label>
                );
              })}
            </div>
          </Group>
          <Group title="Bottom line">
            <TextInput
              prefix={N}
              path="navigation.footer.bottomText"
              label="Small text at the bottom left"
              value={footer.bottomText}
              maxLength={200}
              error={errors["navigation.footer.bottomText"]}
              hint="Optional. The copyright line with your shop name is always shown on the right."
              className="sm:max-w-xl"
              onChange={(bottomText) => setFooter({ bottomText }, "navigation.footer.bottomText")}
            />
          </Group>
          <TokenHelp />
        </Panel>
      </div>
    </form>
  );
}
