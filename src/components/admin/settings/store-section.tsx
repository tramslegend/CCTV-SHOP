"use client";

import { useCallback, useState } from "react";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import { ExternalLink } from "lucide-react";
import countryNames from "react-phone-number-input/locale/en.json";
import { saveStoreSettings } from "@/app/admin/(panel)/settings/actions";
import { FormField } from "@/components/admin/form-field";
import { SimpleSelect } from "@/components/admin/simple-select";
import { addressLine, mapHref } from "@/lib/settings/format";
import type { StoreAddress } from "@/lib/settings/schema";
import type { StoreFormValues } from "@/lib/settings/validation";
import { FieldGroup, fieldId, SettingsSection, TextField } from "./fields";
import { LogoField } from "./logo-field";
import { OpeningHoursEditor } from "./opening-hours-editor";
import { useSectionForm } from "./use-section-form";

const S = "store";

/** Every country the storefront's phone field offers, by name, with its dialling code. */
const PHONE_COUNTRIES = getCountries()
  .map((c) => ({ value: c as string, label: `${countryNames[c] ?? c} (+${getCountryCallingCode(c)})` }))
  .sort((a, b) => a.label.localeCompare(b.label, "en"));

export function StoreSection({ initial, onDirtyChange }: { initial: StoreFormValues; onDirtyChange: (section: string, dirty: boolean) => void }) {
  const form = useSectionForm({ section: S, initial, save: saveStoreSettings, onDirtyChange });
  const { values: v, errors } = form;
  const [uploads, setUploads] = useState({ logo: false, dark: false });
  const onLogoUploading = useCallback((logo: boolean) => setUploads((u) => (u.logo === logo ? u : { ...u, logo })), []);
  const onDarkUploading = useCallback((dark: boolean) => setUploads((u) => (u.dark === dark ? u : { ...u, dark })), []);

  const set = <K extends keyof StoreFormValues>(key: K) => (value: StoreFormValues[K]) => form.update((prev) => ({ ...prev, [key]: value }), key);
  const setAddress = (key: keyof StoreAddress) => (value: string) =>
    form.update((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }), `address.${key}`);

  const map = mapHref(v);
  const oneLine = addressLine(v.address);

  return (
    <SettingsSection
      id={S}
      title="Store details"
      description="Your shop's name, logo and contact details, shown in the header and footer, on the contact, visit and legal pages, and on invoices and emails. Leave a field empty to hide it."
      saveLabel="Save store details"
      dirty={form.dirty}
      saving={form.saving}
      busy={uploads.logo || uploads.dark ? "Uploading logo…" : undefined}
      onSave={form.submit}
      onDiscard={form.discard}
    >
      <FieldGroup title="Brand">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            section={S}
            path="name"
            label="Shop name"
            required
            value={v.name}
            onChange={set("name")}
            error={errors.name}
            maxLength={80}
            autoComplete="organization"
            hint="Used for the logo's alt text, page titles, emails and the footer copyright."
          />
          <TextField
            section={S}
            path="legalName"
            label="Legal (company) name"
            value={v.legalName}
            onChange={set("legalName")}
            error={errors.legalName}
            maxLength={120}
            placeholder={v.name ? `${v.name} Ltd` : "Example Trading Ltd"}
            hint="On VAT invoices and the terms page. Leave empty to use the shop name."
          />
        </div>
        <TextField
          section={S}
          path="tagline"
          label="Tagline"
          value={v.tagline}
          onChange={set("tagline")}
          error={errors.tagline}
          maxLength={200}
          hint="One short line shown under the logo in the footer."
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <LogoField
            id={fieldId(S, "logoUrl")}
            label="Logo"
            altText={v.name || "Shop logo"}
            value={v.logoUrl}
            onChange={set("logoUrl")}
            error={errors.logoUrl}
            onUploadingChange={onLogoUploading}
            hint="Shown in the header and on the sign-in pages. PNG or WebP with a transparent background works best; up to 2 MB. Without a logo the shop name is shown."
          />
          <LogoField
            id={fieldId(S, "logoDarkUrl")}
            label="Logo for dark backgrounds (optional)"
            altText={`${v.name || "Shop"} logo`}
            dark
            value={v.logoDarkUrl}
            onChange={set("logoDarkUrl")}
            error={errors.logoDarkUrl}
            onUploadingChange={onDarkUploading}
            hint="Used in the dark footer. Without it, the main logo is shown in white."
          />
        </div>
      </FieldGroup>

      <FieldGroup title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            section={S}
            path="phone"
            label="Phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={v.phone}
            onChange={set("phone")}
            error={errors.phone}
            placeholder="020 7946 0958"
            hint="Top bar, footer, contact pages and order help. Empty hides every phone link."
          />
          <FormField
            id={fieldId(S, "phoneCountry")}
            label="Phone numbers start on"
            error={errors.phoneCountry}
            hint="The country customers' phone fields (sign-up, checkout, contact forms) open on. They can pick any other country."
          >
            <SimpleSelect
              id={fieldId(S, "phoneCountry")}
              value={v.phoneCountry}
              onValueChange={set("phoneCountry")}
              options={PHONE_COUNTRIES}
              invalid={!!errors.phoneCountry}
              describedBy={errors.phoneCountry ? `${fieldId(S, "phoneCountry")}-error` : undefined}
            />
          </FormField>
          <TextField
            section={S}
            path="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={v.email}
            onChange={set("email")}
            error={errors.email}
            placeholder="hello@yourshop.co.uk"
            hint="Shown to customers and used as the reply-to address on order emails."
          />
        </div>
      </FieldGroup>

      <FieldGroup title="Address" description="Your shop or collection address. Shown in the footer, on the contact, visit and delivery pages, and on invoices.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField section={S} path="address.line1" label="Address line 1" autoComplete="address-line1" value={v.address.line1} onChange={setAddress("line1")} error={errors["address.line1"]} maxLength={120} />
          <TextField section={S} path="address.line2" label="Address line 2" autoComplete="address-line2" value={v.address.line2} onChange={setAddress("line2")} error={errors["address.line2"]} maxLength={120} />
          <TextField section={S} path="address.city" label="Town or city" autoComplete="address-level2" value={v.address.city} onChange={setAddress("city")} error={errors["address.city"]} maxLength={80} />
          <TextField section={S} path="address.county" label="County" autoComplete="address-level1" value={v.address.county} onChange={setAddress("county")} error={errors["address.county"]} maxLength={80} />
          <TextField section={S} path="address.postcode" label="Postcode" autoComplete="postal-code" value={v.address.postcode} onChange={setAddress("postcode")} error={errors["address.postcode"]} maxLength={16} className="sm:max-w-48" />
          <TextField section={S} path="address.country" label="Country" autoComplete="country-name" value={v.address.country} onChange={setAddress("country")} error={errors["address.country"]} maxLength={60} />
        </div>
        <TextField
          section={S}
          path="mapUrl"
          label="Map link"
          type="url"
          inputMode="url"
          value={v.mapUrl}
          onChange={set("mapUrl")}
          error={errors.mapUrl}
          placeholder="https://maps.app.goo.gl/…"
          hint={
            <>
              Used by &ldquo;Our Store&rdquo; and &ldquo;Get directions&rdquo;. Leave empty to search Google Maps for the address.
              {map && (
                <>
                  {" "}
                  <a href={map} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-emerald-700 hover:underline">
                    Test the link <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                </>
              )}
            </>
          }
        />
        {oneLine && (
          <p className="text-muted-foreground text-xs">
            Shown as: <span className="text-foreground font-medium">{oneLine}</span>
          </p>
        )}
      </FieldGroup>

      <FieldGroup title="Opening hours" description="Shown on the contact and visit pages, top to bottom.">
        <OpeningHoursEditor
          section={S}
          rows={v.openingHours}
          errors={errors}
          onChange={(rows, path) => form.update((prev) => ({ ...prev, openingHours: rows }), ...(path ? [path] : []))}
        />
      </FieldGroup>

      <FieldGroup title="Company" description="Printed on VAT invoices and the terms page.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            section={S}
            path="companyNumber"
            label="Company number"
            value={v.companyNumber}
            onChange={set("companyNumber")}
            error={errors.companyNumber}
            maxLength={20}
            placeholder="01234567"
            hint="Companies House number, if you trade as a limited company."
          />
          <TextField
            section={S}
            path="vatNumber"
            label="VAT registration number"
            value={v.vatNumber}
            onChange={set("vatNumber")}
            error={errors.vatNumber}
            maxLength={20}
            placeholder="GB 123 4567 89"
            hint="Required on VAT invoices once you're VAT registered."
          />
        </div>
        <TextField
          section={S}
          path="registeredOffice"
          label="Registered office address"
          value={v.registeredOffice}
          onChange={set("registeredOffice")}
          error={errors.registeredOffice}
          maxLength={240}
          hint="Only if it differs from the address above."
        />
      </FieldGroup>
    </SettingsSection>
  );
}
