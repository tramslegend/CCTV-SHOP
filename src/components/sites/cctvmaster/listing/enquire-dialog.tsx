"use client";

import { CircleAlert, LoaderCircle, Minus, Phone, Plus, X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type PartsField, submitPartsEnquiry } from "@/lib/enquiries/actions";
import { HoneypotField, useEnquiryGuard } from "@/lib/enquiries/form-guard";
import { isEmail, isPhone } from "@/lib/enquiries/rules";
import { PHONE_INVALID } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { PhoneInput } from "../phone-input";
import { tryAgainMessage, useShopInfo } from "../shop-info";
import { showToast } from "../shop-state";

const input =
  "border-input h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/30 md:text-sm";
const label = "flex items-center gap-2 text-sm leading-none font-medium select-none";

type Contact = { name: string; company: string; phone: string; email: string };
type Errors = Partial<Record<PartsField, string>>;

/** Same rules as the server action (src/lib/enquiries/validation.ts). */
function validate(qty: number, c: Contact): Errors {
  const e: Errors = {};
  if (!Number.isInteger(qty) || qty < 1) e.qty = "Please enter how many you need.";
  if (c.name.trim().length < 2) e.name = "Please enter your name.";
  if (!c.phone.trim()) e.phone = "Please enter a phone number.";
  else if (!isPhone(c.phone)) e.phone = PHONE_INVALID;
  if (!c.email.trim()) e.email = "Please enter your email address.";
  else if (!isEmail(c.email)) e.email = "Please enter a valid email address.";
  return e;
}

/** "Enquire" link for back-ordered parts: opens the "Buy this through our sales team" form, saved as a parts enquiry. */
export function EnquireButton({ name, sku }: { name: string; sku: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-primary hover:underline">
        Enquire
      </button>
      {/* Portalled: the button sits in a nowrap, right-aligned table cell whose styles would leak into the dialog. */}
      {open ? createPortal(<EnquireDialog name={name} sku={sku} onClose={() => setOpen(false)} />, document.body) : null}
    </>
  );
}

function EnquireDialog({ name, sku, onClose }: { name: string; sku: string; onClose: () => void }) {
  const shop = useShopInfo();
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState<Contact>({ name: "", company: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const { trapRef, spamFields, refreshToken } = useEnquiryGuard();
  const fallback = `Hi, could you sort out ${qty} of ${name} for me? Please let me know the price and how long it'll take.`;

  useEffect(() => {
    panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const setField = (key: keyof Contact, value: string) => {
    setContact((c) => ({ ...c, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const focusFirst = (found: Errors) => {
    const first = (Object.keys(found) as PartsField[]).find((k) => found[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    const found = validate(qty, contact);
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirst(found);
      return;
    }
    setSending(true);
    try {
      const result = await submitPartsEnquiry({ qty, ...contact, message, sku, productName: name, ...(await spamFields()) });
      if (result.ok) {
        showToast({
          title: "Enquiry sent",
          description: `Our sales team will be in touch about ${name}. We've emailed you a copy.`,
        });
        onClose();
        return;
      }
      if (result.retry === "token") void refreshToken();
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error);
      focusFirst(result.fieldErrors ?? {});
    } catch {
      setFormError(tryAgainMessage(shop));
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        className="bg-background relative grid max-h-[90vh] w-full max-w-[calc(100%-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] rounded-lg border text-left shadow-lg sm:max-w-lg"
      >
        <form className="contents" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2 border-b px-6 py-4">
            <h2 id={`${id}-title`} className="flex items-center gap-2 text-lg leading-none font-semibold">
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
              Buy this through our sales team
            </h2>
            <p id={`${id}-desc`} className="text-muted-foreground text-sm">
              We&apos;ll sort out <span className="text-foreground font-medium">{name}</span> for you. Tell us how many you
              need and our sales team will come back to you with a price and a delivery date.
            </p>
          </div>
          <div className="relative space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <label htmlFor={`${id}-qty`} className={label}>
                Quantity needed <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="border-input bg-background hover:bg-accent inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border shadow-sm disabled:pointer-events-none disabled:opacity-50"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  id={`${id}-qty`}
                  name="qty"
                  type="number"
                  min={1}
                  required
                  value={qty}
                  aria-invalid={!!errors.qty || undefined}
                  aria-describedby={errors.qty ? `${id}-qty-error` : undefined}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className={cn(input, "w-24 text-center")}
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => q + 1)}
                  className="border-input bg-background hover:bg-accent inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border shadow-sm"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="text-muted-foreground ml-auto text-xs">SKU {sku}</span>
              </div>
              <FieldError id={`${id}-qty-error`} error={errors.qty} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id={`${id}-name`}
                name="name"
                label="Your name"
                required
                autoComplete="name"
                value={contact.name}
                error={errors.name}
                onChange={(v) => setField("name", v)}
              />
              <Field
                id={`${id}-company`}
                name="company"
                label="Company"
                autoComplete="organization"
                value={contact.company}
                error={errors.company}
                onChange={(v) => setField("company", v)}
              />
              <Field
                id={`${id}-phone`}
                name="phone"
                label="Phone"
                required
                type="tel"
                autoComplete="tel"
                value={contact.phone}
                error={errors.phone}
                onChange={(v) => setField("phone", v)}
              />
              <Field
                id={`${id}-email`}
                name="email"
                label="Email"
                required
                type="email"
                autoComplete="email"
                value={contact.email}
                error={errors.email}
                onChange={(v) => setField("email", v)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-message`} className={label}>
                Message
              </label>
              <textarea
                id={`${id}-message`}
                name="message"
                rows={3}
                value={message}
                placeholder={fallback}
                aria-invalid={!!errors.message || undefined}
                aria-describedby={errors.message ? `${id}-message-error` : undefined}
                onChange={(e) => setMessage(e.target.value)}
                className="border-input placeholder:text-muted-foreground aria-invalid:border-destructive w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/30 md:text-sm"
              />
              {errors.message ? (
                <FieldError id={`${id}-message-error`} error={errors.message} />
              ) : (
                <p className="text-muted-foreground text-xs">If you leave this empty, we&apos;ll send the message shown in the box.</p>
              )}
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
          </div>
          <div className="flex items-center justify-between gap-2 border-t px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="hover:bg-accent inline-flex h-9 items-center rounded-md px-4 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-50"
            >
              {sending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {sending ? "Sending…" : "Send enquiry"}
            </button>
          </div>
        </form>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="text-destructive text-sm" role="alert">
      {error}
    </p>
  ) : null;
}

function Field({
  id,
  name,
  label: text,
  required = false,
  type = "text",
  autoComplete,
  value,
  error,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={label}>
        {text}
        {required ? <span className="text-destructive">*</span> : null}
      </label>
      {type === "tel" ? (
        <PhoneInput
          id={id}
          name={name}
          size="md"
          required={required}
          autoComplete={autoComplete}
          value={value}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={onChange}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          value={value}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cn(input, "aria-invalid:border-destructive")}
        />
      )}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}
