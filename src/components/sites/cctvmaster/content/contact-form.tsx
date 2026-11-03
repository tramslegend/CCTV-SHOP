"use client";

import { CircleAlert, CircleCheck, LoaderCircle, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { submitContactEnquiry } from "@/lib/enquiries/actions";
import { HoneypotField, useEnquiryGuard } from "@/lib/enquiries/form-guard";
import { PHONE_INVALID } from "@/lib/phone";
import { PhoneInput } from "../phone-input";
import { PhoneLink, tryAgainMessage, useShopInfo } from "../shop-info";
import { Field, isEmail, isPhone, SelectInput, TextArea, TextInput } from "./form-fields";
import { CONTACT_SUBJECTS, type ContactSubject } from "./store-facts";

// Contact form: validates locally, then saves the message through a server action (which validates again, emails
// the shop and sends the customer an acknowledgement). Opened as /contact?product=<slug> it is a quote request.

interface Values {
  name: string;
  email: string;
  phone: string;
  subject: ContactSubject | "";
  message: string;
}

type Errors = Partial<Record<keyof Values, string>>;

function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Please enter your name.";
  if (!v.email.trim()) e.email = "Please enter your email address.";
  else if (!isEmail(v.email)) e.email = "Please enter a valid email address.";
  if (!v.phone.trim()) e.phone = "Please enter a phone number.";
  else if (!isPhone(v.phone)) e.phone = PHONE_INVALID;
  if (!v.subject) e.subject = "Please choose a subject.";
  if (v.message.trim().length < 10) e.message = "Please tell us a little more (at least 10 characters).";
  return e;
}

export function ContactForm({
  initialSubject = "",
  initialMessage = "",
}: {
  initialSubject?: ContactSubject | "";
  initialMessage?: string;
}) {
  const shop = useShopInfo();
  const [values, setValues] = useState<Values>({
    name: "",
    email: "",
    phone: "",
    subject: initialSubject,
    message: initialMessage,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [formError, setFormError] = useState("");
  const product = useSearchParams().get("product") ?? undefined;
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
      document.getElementById(first)?.focus();
      return;
    }
    setStatus("sending");
    try {
      const result = await submitContactEnquiry({ ...values, product, ...(await spamFields()) });
      if (result.ok) {
        setStatus("sent");
        return;
      }
      if (result.retry === "token") void refreshToken();
      const serverErrors = result.fieldErrors ?? {};
      setErrors(serverErrors);
      setFormError(result.error);
      const firstServer = Object.keys(serverErrors)[0];
      if (firstServer) document.getElementById(firstServer)?.focus();
    } catch {
      setFormError(tryAgainMessage(shop));
    }
    setStatus("idle");
  };

  if (status === "sent") {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700">
          <CircleCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Thanks, {values.name.trim().split(/\s+/)[0]} — {product ? "quote request" : "message"} received
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            We’ve emailed a copy to <span className="font-medium text-foreground">{values.email.trim()}</span> and someone
            from our team will reply as soon as they can — usually within an hour on weekdays.
            {shop.phoneHref && (
              <>
                {" "}
                If it’s urgent, call <PhoneLink className="font-semibold text-brand-700 hover:underline" />.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
          onClick={() => {
            setValues({ name: "", email: "", phone: "", subject: "", message: "" });
            setErrors({});
            setFormError("");
            setAttempted(false);
            setStatus("idle");
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="relative space-y-5" noValidate onSubmit={onSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name *" error={errors.name}>
          <TextInput
            id="name"
            name="name"
            autoComplete="name"
            required
            placeholder="Your name"
            value={values.name}
            invalid={!!errors.name}
            describedBy="name-error"
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field id="email" label="Email *" error={errors.email}>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@email.com"
            value={values.email}
            invalid={!!errors.email}
            describedBy="email-error"
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="phone" label="Phone *" error={errors.phone}>
          <PhoneInput
            id="phone"
            name="phone"
            autoComplete="tel"
            required
            size="sm"
            className="mt-1.5"
            value={values.phone}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            onChange={(v) => set("phone", v)}
          />
        </Field>
        <Field id="subject" label="Subject *" error={errors.subject}>
          <SelectInput
            id="subject"
            name="subject"
            required
            value={values.subject}
            placeholderShown={!values.subject}
            invalid={!!errors.subject}
            describedBy="subject-error"
            onChange={(e) => set("subject", e.target.value as ContactSubject | "")}
          >
            <option value="" disabled>
              Select a subject
            </option>
            {CONTACT_SUBJECTS.map((s) => (
              <option key={s.value} value={s.value} className="text-foreground">
                {s.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <Field id="message" label="Message *" error={errors.message}>
        <TextArea
          id="message"
          name="message"
          rows={5}
          required
          placeholder="How can we help?"
          value={values.message}
          invalid={!!errors.message}
          describedBy="message-error"
          onChange={(e) => set("message", e.target.value)}
        />
      </Field>
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
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand-700 px-8 text-sm font-medium whitespace-nowrap text-white shadow-[0_10px_20px_-10px_rgba(42,120,204,0.6)] transition-colors hover:bg-brand-800 focus-visible:ring-1 focus-visible:ring-brand-700 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:w-auto [&_svg]:size-4 [&_svg]:shrink-0"
      >
        {status === "sending" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
