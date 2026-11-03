"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { submitTradeEnquiry } from "@/lib/enquiries/actions";
import { HoneypotField, useEnquiryGuard } from "@/lib/enquiries/form-guard";
import { isVatNumber, TRADE_BUSINESS_TYPES as BUSINESS_TYPES, TRADE_SPEND as SPEND } from "@/lib/enquiries/rules";
import { PHONE_INVALID } from "@/lib/phone";
import { PhoneInput } from "../phone-input";
import { PhoneLink, tryAgainMessage, useShopInfo } from "../shop-info";
import { Field, isEmail, isPhone, SelectInput, TextArea, TextInput } from "./form-fields";

// Trade account application: validates locally, then saves it through a server action (which validates again,
// emails the shop and sends the applicant an acknowledgement).

interface Values {
  company: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  spend: string;
  vat: string;
  notes: string;
  terms: boolean;
}

type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { company: "", name: "", email: "", phone: "", type: "", spend: "", vat: "", notes: "", terms: false };

function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.company.trim().length < 2) e.company = "Please enter your business name.";
  if (v.name.trim().length < 2) e.name = "Please enter your name.";
  if (!v.email.trim()) e.email = "Please enter your email address.";
  else if (!isEmail(v.email)) e.email = "Please enter a valid email address.";
  if (!v.phone.trim()) e.phone = "Please enter a phone number.";
  else if (!isPhone(v.phone)) e.phone = PHONE_INVALID;
  if (!v.type) e.type = "Please tell us what kind of business you are.";
  if (v.vat.trim() && !isVatNumber(v.vat))
    e.vat = "VAT numbers look like GB123456789 — or leave this blank.";
  if (!v.terms) e.terms = "Please confirm you buy for business use.";
  return e;
}

export function TradeForm() {
  const shop = useShopInfo();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [formError, setFormError] = useState("");
  const { trapRef, spamFields, refreshToken } = useEnquiryGuard();

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (attempted) setErrors(validate(next));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    setFormError("");
    const found = validate(values);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`trade-${first}`)?.focus();
      return;
    }
    setStatus("sending");
    try {
      const result = await submitTradeEnquiry({ ...values, ...(await spamFields()) });
      if (result.ok) {
        setStatus("sent");
        return;
      }
      if (result.retry === "token") void refreshToken();
      const serverErrors = result.fieldErrors ?? {};
      setErrors(serverErrors);
      setFormError(result.error);
      const firstServer = Object.keys(serverErrors)[0];
      if (firstServer) document.getElementById(`trade-${firstServer}`)?.focus();
    } catch {
      setFormError(tryAgainMessage(shop));
    }
    setStatus("idle");
  };

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700">
          <CircleCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Application received for {values.company.trim()}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            We’ve emailed a copy to <span className="font-medium text-foreground">{values.email.trim()}</span>. A real
            person reads every application and replies within one working day.
            {shop.phoneHref && (
              <>
                {" "}
                Questions in the meantime? Call <PhoneLink className="font-semibold text-brand-700 hover:underline" />.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
          onClick={() => {
            setValues(EMPTY);
            setErrors({});
            setFormError("");
            setAttempted(false);
            setStatus("idle");
          }}
        >
          Start a new application
        </button>
      </div>
    );
  }

  return (
    <form className="relative space-y-5 text-left" noValidate onSubmit={onSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="trade-company" label="Business name *" error={errors.company}>
          <TextInput
            id="trade-company"
            name="company"
            autoComplete="organization"
            placeholder="Acme Security Ltd"
            value={values.company}
            invalid={!!errors.company}
            describedBy="trade-company-error"
            onChange={(e) => set("company", e.target.value)}
          />
        </Field>
        <Field id="trade-name" label="Your name *" error={errors.name}>
          <TextInput
            id="trade-name"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            value={values.name}
            invalid={!!errors.name}
            describedBy="trade-name-error"
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="trade-email" label="Work email *" error={errors.email}>
          <TextInput
            id="trade-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.co.uk"
            value={values.email}
            invalid={!!errors.email}
            describedBy="trade-email-error"
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field id="trade-phone" label="Phone *" error={errors.phone}>
          <PhoneInput
            id="trade-phone"
            name="phone"
            autoComplete="tel"
            size="sm"
            className="mt-1.5"
            value={values.phone}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "trade-phone-error" : undefined}
            onChange={(v) => set("phone", v)}
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="trade-type" label="Type of business *" error={errors.type}>
          <SelectInput
            id="trade-type"
            name="type"
            wrapperClassName="w-full"
            value={values.type}
            placeholderShown={!values.type}
            invalid={!!errors.type}
            describedBy="trade-type-error"
            onChange={(e) => set("type", e.target.value)}
          >
            <option value="" disabled>
              Select one
            </option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t} className="text-foreground">
                {t}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field id="trade-spend" label="Typical monthly spend">
          <SelectInput
            id="trade-spend"
            name="spend"
            wrapperClassName="w-full"
            value={values.spend}
            placeholderShown={!values.spend}
            onChange={(e) => set("spend", e.target.value)}
          >
            <option value="">Prefer not to say</option>
            {SPEND.map((s) => (
              <option key={s} value={s} className="text-foreground">
                {s}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <Field id="trade-vat" label="VAT number (optional)" error={errors.vat}>
        <TextInput
          id="trade-vat"
          name="vat"
          placeholder="GB123456789"
          value={values.vat}
          invalid={!!errors.vat}
          describedBy="trade-vat-error"
          onChange={(e) => set("vat", e.target.value)}
        />
      </Field>
      <Field id="trade-notes" label="What do you usually buy? (optional)">
        <TextArea
          id="trade-notes"
          name="notes"
          rows={3}
          placeholder="e.g. 4–8 camera IP kits for retail units, Cat6 by the box"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>
      <div>
        <label className="flex items-start gap-2.5 text-sm text-foreground/80" htmlFor="trade-terms">
          <input
            id="trade-terms"
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700"
            checked={values.terms}
            aria-invalid={!!errors.terms || undefined}
            aria-describedby={errors.terms ? "trade-terms-error" : undefined}
            onChange={(e) => set("terms", e.target.checked)}
          />
          <span>
            I buy for business use and accept the{" "}
            <Link className="font-semibold text-brand-700 underline underline-offset-2" href="/terms">
              terms of sale
            </Link>
            .
          </span>
        </label>
        {errors.terms ? (
          <p id="trade-terms-error" className="text-destructive mt-1.5 text-sm" role="alert">
            {errors.terms}
          </p>
        ) : null}
      </div>
      <HoneypotField inputRef={trapRef} />
      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50 sm:w-auto"
      >
        {status === "sending" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {status === "sending" ? "Sending…" : "Apply for an account"}
      </button>
    </form>
  );
}
