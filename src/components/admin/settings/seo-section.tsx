"use client";

import { saveSeoSettings } from "@/app/admin/(panel)/settings/actions";
import { CharCount, FormField, invalidProps } from "@/components/admin/form-field";
import { Textarea } from "@/components/ui/textarea";
import type { SeoSettings, SocialSettings } from "@/lib/settings/schema";
import type { SeoFormValues } from "@/lib/settings/validation";
import { FieldGroup, fieldId, SettingsSection, TextField } from "./fields";
import { useSectionForm } from "./use-section-form";

const S = "seo";

const SOCIAL: { key: keyof SocialSettings; label: string; placeholder: string }[] = [
  { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/yourshop" },
  { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/yourshop" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/yourshop" },
  { key: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/@yourshop" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/company/yourshop" },
];

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function SeoSection({
  initial,
  storeName,
  siteHost,
  onDirtyChange,
}: {
  initial: SeoFormValues;
  storeName: string;
  siteHost: string;
  onDirtyChange: (section: string, dirty: boolean) => void;
}) {
  const form = useSectionForm({ section: S, initial, save: saveSeoSettings, onDirtyChange });
  const { values: v, errors } = form;
  const setSeo = (key: keyof SeoSettings) => (value: string) =>
    form.update((prev) => ({ ...prev, seo: { ...prev.seo, [key]: value } }), `seo.${key}`);
  const setSocial = (key: keyof SocialSettings) => (value: string) =>
    form.update((prev) => ({ ...prev, social: { ...prev.social, [key]: value } }), `social.${key}`);

  const homeTitle = v.seo.siteTitle.trim() || storeName;
  const template = v.seo.titleTemplate.includes("%s") ? v.seo.titleTemplate : `%s | ${storeName}`;
  const descriptionId = fieldId(S, "seo.description");

  return (
    <SettingsSection
      id={S}
      title="SEO & social"
      description="How the shop appears in search results and browser tabs, and the social profiles linked from the footer."
      saveLabel="Save SEO & social"
      dirty={form.dirty}
      saving={form.saving}
      onSave={form.submit}
      onDiscard={form.discard}
    >
      <FieldGroup title="Search engines">
        <TextField
          section={S}
          path="seo.siteTitle"
          label="Homepage title"
          value={v.seo.siteTitle}
          onChange={setSeo("siteTitle")}
          error={errors["seo.siteTitle"]}
          maxLength={70}
          placeholder={storeName}
          labelAside={<CharCount value={v.seo.siteTitle} recommended={60} max={70} />}
          hint="The browser-tab and search-result title of the homepage. Leave empty to use the shop name."
        />
        <TextField
          section={S}
          path="seo.titleTemplate"
          label="Title pattern for other pages"
          value={v.seo.titleTemplate}
          onChange={setSeo("titleTemplate")}
          error={errors["seo.titleTemplate"]}
          maxLength={80}
          placeholder={`%s | ${storeName}`}
          spellCheck={false}
          hint={
            <>
              %s is replaced by the page&apos;s own title, e.g. &ldquo;{template.replace("%s", "Contact Us")}&rdquo;. Leave empty for
              &ldquo;%s | {storeName}&rdquo;.
            </>
          }
        />
        <FormField
          id={descriptionId}
          label="Meta description"
          error={errors["seo.description"]}
          hint="Default search-result summary for pages that don't have their own. Aim for 160 characters or fewer."
          labelAside={<CharCount value={v.seo.description} recommended={160} max={320} />}
        >
          <Textarea
            id={descriptionId}
            rows={3}
            maxLength={320}
            value={v.seo.description}
            onChange={(e) => setSeo("description")(e.target.value)}
            {...invalidProps(descriptionId, errors["seo.description"])}
          />
        </FormField>
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-medium">Homepage search result preview</p>
          <div className="rounded-lg border bg-white p-4 font-[arial,sans-serif]" aria-label="Search result preview">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-700" aria-hidden="true">
                {storeName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm text-[#202124]">{storeName}</p>
                <p className="truncate text-xs text-[#4d5156]">{siteHost}</p>
              </div>
            </div>
            <p className="mt-2 line-clamp-1 text-xl leading-snug text-[#1a0dab]">{clip(homeTitle, 65)}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-normal text-[#4d5156]">
              {v.seo.description.trim() ? clip(v.seo.description.trim(), 160) : <span className="italic">No description: search engines will pick text from the page.</span>}
            </p>
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title="Social profiles" description="Each link set here appears in the footer. Leave empty to hide it.">
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL.map(({ key, label, placeholder }) => (
            <TextField
              key={key}
              section={S}
              path={`social.${key}`}
              label={label}
              type="url"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              value={v.social[key]}
              onChange={setSocial(key)}
              error={errors[`social.${key}`]}
              placeholder={placeholder}
            />
          ))}
        </div>
      </FieldGroup>
    </SettingsSection>
  );
}
