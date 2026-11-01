"use client";

import {
  ArrowRight,
  Check,
  CircleCheck,
  CreditCard,
  FlaskConical,
  Info,
  LoaderCircle,
  Lock,
  MapPin,
  PauseCircle,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  TriangleAlert,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { placeOrder, quoteBasket, type QuoteResult } from "@/app/(store)/checkout/actions";
import { availableOptions, type DeliveryOption, pricingFor, type PublicCheckout } from "@/lib/checkout/settings";
import { useHydrated } from "@/lib/local-store";
import { formatGBP } from "@/lib/cctvmaster/money";
import { describeDiscount } from "@/lib/discounts/rules";
import { discountLabel, type PricingSettings } from "@/lib/orders/pricing";
import { cn } from "@/lib/utils";
import { PhoneLink, useShopInfo } from "../shop-info";
import { cartStore, showToast, syncCart, useCart, type CartLine } from "../shop-state";
import {
  AddressFields,
  emptyAddress,
  validateAddress,
  type AddressErrors,
  type AddressMode,
  type AddressValue,
} from "./address-fields";
import { PhoneInput } from "../phone-input";
import { ProductThumb } from "./product-thumb";
import { checkoutInput, checkoutLabel, linkButton } from "./styles";
import { basketTotals, itemsLabel } from "./totals";
import { EMAIL_RE, PHONE_INVALID, normalisePhone } from "./validation";

type Step = "shipping" | "review" | "payment";
type ContactField = "name" | "email" | "phone";
export type CheckoutPaymentMode = "stripe" | "test" | "disabled";

export interface CheckoutAccount {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface CheckoutAddress {
  id: number;
  label?: string;
  name: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  phone?: string;
  isDefault: boolean;
}

type Quote = Extract<QuoteResult, { ok: true }>;

const steps: { id: Step; label: string; Icon: LucideIcon }[] = [
  { id: "shipping", label: "Details", Icon: Truck },
  { id: "review", label: "Review", Icon: ShoppingBag },
  { id: "payment", label: "Payment", Icon: CreditCard },
];

const dispatchNote = (cutoff: string) => {
  const [h, m] = cutoff.split(":").map(Number);
  const time = `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
  return `Same-day dispatch on orders placed before ${time} (Monday to Friday)`;
};

/** A full UK postcode as typed (delivery options are filtered by postcode only once it's complete). */
const FULL_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** What an option costs for an items total (inc VAT): "Free" once its threshold is reached. */
const optionPrice = (o: DeliveryOption, itemsIncVat: number) =>
  o.price === 0 || (o.freeFrom !== null && itemsIncVat >= o.freeFrom) ? 0 : o.price;

const PAUSED_TEXT = "We're not taking online orders at the moment. Please call or email us to order.";

/** The source's checkout page wrapper (fixed-header offset, then a 1.5fr / 1fr grid). */
export function CheckoutFrame({ children }: { children: ReactNode }) {
  return (
    <div className="pt-26">
      <div className="fc-rise mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:py-10">{children}</div>
    </div>
  );
}

export function CheckoutFlow(props: {
  pricing: PricingSettings;
  checkout: PublicCheckout;
  mode: CheckoutPaymentMode;
  account: CheckoutAccount | null;
  addresses: CheckoutAddress[];
  returnedFromPayment?: boolean;
}) {
  const hydrated = useHydrated();
  const lines = useCart();
  const [placing, setPlacing] = useState<false | "stripe" | "local">(false);

  if (!hydrated) {
    return (
      <CheckoutFrame>
        <div className="mx-auto min-h-[50vh] max-w-5xl px-4 py-10" aria-busy="true" />
      </CheckoutFrame>
    );
  }

  if (placing) {
    return (
      <CheckoutFrame>
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 py-16 text-muted-foreground" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" aria-hidden="true" />
          {placing === "stripe" ? "Taking you to secure payment…" : "Placing your order…"}
        </div>
      </CheckoutFrame>
    );
  }

  if (!props.checkout.ordering.enabled) {
    return (
      <CheckoutFrame>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center" role="status">
          <PauseCircle className="mx-auto h-10 w-10 text-amber-600" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Online ordering is paused</h1>
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{props.checkout.ordering.pausedMessage || PAUSED_TEXT}</p>
          <p className="mt-2 text-sm text-muted-foreground">Your basket is saved, so you can come back to it later.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Continue browsing
          </Link>
        </div>
      </CheckoutFrame>
    );
  }

  if (lines.length > 0 && !props.checkout.form.guestCheckout && !props.account) {
    return (
      <CheckoutFrame>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <Lock className="mx-auto h-9 w-9 text-emerald-700" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Sign in to check out</h1>
          <p className="mt-2 text-muted-foreground">You need an account to place an order. It takes a minute, and you can follow your orders from it.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/login?next=/checkout"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Sign in
            </Link>
            <Link
              href="/signup?next=/checkout"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-zinc-300 px-5 text-sm font-semibold text-foreground hover:bg-surface"
            >
              Create an account
            </Link>
          </div>
        </div>
      </CheckoutFrame>
    );
  }

  if (lines.length === 0) {
    return (
      <CheckoutFrame>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">Add some products to your cart before checking out.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Continue shopping
          </Link>
        </div>
      </CheckoutFrame>
    );
  }

  return <CheckoutForm {...props} lines={lines} onPlacing={setPlacing} />;
}

const fromSaved = (a: CheckoutAddress): AddressValue => ({
  line1: a.line1,
  line2: a.line2 ?? "",
  city: a.city,
  county: a.county ?? "",
  postcode: a.postcode,
});

function CheckoutForm({
  lines,
  onPlacing,
  pricing,
  checkout,
  mode,
  account,
  addresses,
  returnedFromPayment,
}: {
  lines: CartLine[];
  onPlacing: (how: false | "stripe" | "local") => void;
  pricing: PricingSettings;
  checkout: PublicCheckout;
  mode: CheckoutPaymentMode;
  account: CheckoutAccount | null;
  addresses: CheckoutAddress[];
  returnedFromPayment?: boolean;
}) {
  const router = useRouter();
  const shop = useShopInfo();
  const rules = checkout.form;
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  const [step, setStep] = useState<Step>("shipping");
  const [contact, setContact] = useState({
    name: account?.name ?? defaultAddress?.name ?? "",
    email: account?.email ?? "",
    phone: account?.phone ?? defaultAddress?.phone ?? "",
    company: account?.company ?? defaultAddress?.company ?? "",
  });
  const [optOut, setOptOut] = useState(false);
  const [contactErrors, setContactErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [savedId, setSavedId] = useState<number | null>(defaultAddress?.id ?? null);
  const [ship, setShip] = useState<AddressValue>(defaultAddress ? fromSaved(defaultAddress) : emptyAddress);
  const [shipMode, setShipMode] = useState<AddressMode>(defaultAddress ? "manual" : "find");
  const [shipErrors, setShipErrors] = useState<AddressErrors>({});
  const [saveAddress, setSaveAddress] = useState(true);
  const [billingSame, setBillingSame] = useState(true);
  const [bill, setBill] = useState<AddressValue>(emptyAddress);
  const [billMode, setBillMode] = useState<AddressMode>("manual");
  const [billErrors, setBillErrors] = useState<AddressErrors>({});
  const [discount, setDiscount] = useState("");
  const [discountError, setDiscountError] = useState("");
  /** Code the server accepted for this basket (its value always comes from the server quote). */
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    returnedFromPayment ? "Payment wasn’t completed, so nothing has been charged. Your basket is still here." : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [deliveryId, setDeliveryId] = useState(checkout.options[0]?.id ?? "");
  const [deliveryError, setDeliveryError] = useState("");
  const [note, setNote] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsError, setTermsError] = useState("");
  const noticeRef = useRef<HTMLDivElement>(null);

  // Delivery options for the postcode (once it's complete); the chosen one falls back to the first that serves it.
  const postcodeKnown = FULL_POSTCODE.test(ship.postcode.trim());
  const available = availableOptions(checkout.options, postcodeKnown ? ship.postcode : "");
  const hiddenOptions = checkout.options.length - available.length;
  const selected = available.find((o) => o.id === deliveryId) ?? available[0] ?? null;
  const collect = selected?.kind === "collect";
  const local = basketTotals(lines, selected ? pricingFor(pricing, selected) : pricing);

  const totals = quote
    ? {
        count: quote.totals.units,
        itemsExVat: quote.totals.itemsExVat,
        itemsIncVat: quote.totals.itemsIncVat,
        vat: quote.totals.itemsVat,
        delivery: quote.totals.deliveryIncVat,
        total: quote.totals.total,
        vatPercent: Math.round(quote.totals.vatRate * 1000) / 10,
      }
    : { ...local, itemsIncVat: local.subtotal };
  /** The applied discount as priced by the server (null until a quote with the code exists). */
  const applied = quote?.totals.discountCode ?? null;

  // Any change to the basket (another tab, quantity edits) or the delivery option invalidates the server quote.
  const keyFor = (cart: { slug: string; qty: number }[]) => `${cart.map((l) => `${l.slug}:${l.qty}`).join("|")}#${selected?.id ?? ""}`;
  const basketKey = keyFor(lines);
  const quotedKey = useRef<string | null>(null);
  useEffect(() => {
    if (quotedKey.current !== null && quotedKey.current !== basketKey) {
      quotedKey.current = null;
      setQuote(null);
      setStep((s) => (s === "shipping" ? s : "review"));
    }
  }, [basketKey]);

  const go = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showNotice = (text: string) => {
    setNotice(text);
    window.setTimeout(() => noticeRef.current?.focus(), 0);
  };

  /** Applies a server quote: the basket takes the server's prices and any stock limits. */
  function applyQuote(q: Quote) {
    syncCart(q.lines);
    quotedKey.current = keyFor(cartStore.get());
    setQuote(q);
    if (q.problems.length) {
      showNotice(
        `We’ve updated your basket: ${q.problems.map((p) => `${p.name ?? p.slug} — ${p.message}${p.available > 0 ? ` Quantity set to ${p.available}.` : " Removed."}`).join(" ")}`,
      );
    }
  }

  const cartInput = () => lines.map((l) => ({ slug: l.slug, qty: l.qty }));
  const emailForCode = () => (EMAIL_RE.test(contact.email.trim()) ? contact.email.trim() : undefined);
  const delivery = selected?.id;

  /** Fresh server quote, with the applied discount code (or `code` when given; null = without one). */
  async function refreshQuote(code: string | null = appliedCode) {
    setQuoting(true);
    try {
      const result = await quoteBasket(cartInput(), code ? { code, email: emailForCode(), delivery } : { delivery });
      if (!result.ok) {
        showNotice(result.error);
        return null;
      }
      if (code && result.discountError) {
        // The basket or the code changed (e.g. now under the minimum spend): the quote comes back without it.
        setAppliedCode(null);
        setDiscount(code);
        setDiscountError(result.discountError);
      }
      applyQuote(result);
      return result;
    } catch {
      showNotice("We couldn’t check the latest prices. Please check your connection and try again.");
      return null;
    } finally {
      setQuoting(false);
    }
  }

  async function applyCode() {
    const code = discount.trim().toUpperCase().replace(/\s+/g, "");
    if (!code || applying) return;
    setApplying(true);
    setDiscountError("");
    try {
      const result = await quoteBasket(cartInput(), { code, email: emailForCode(), delivery });
      if (!result.ok) {
        setDiscountError(result.error);
        return;
      }
      if (result.discountError || !result.totals.discountCode) {
        setDiscountError(result.discountError ?? "We don’t recognise that code. Check it and try again.");
        return;
      }
      setAppliedCode(result.totals.discountCode.code);
      setDiscount("");
      applyQuote(result);
    } catch {
      setDiscountError("We couldn’t check that code. Please check your connection and try again.");
    } finally {
      setApplying(false);
    }
  }

  /** Takes the code off. The chip stays until the fresh quote arrives, so the summary and the box change together. */
  async function removeCode() {
    setDiscountError("");
    if (!quote) {
      setAppliedCode(null);
      return;
    }
    setQuoting(true);
    try {
      const result = await quoteBasket(cartInput(), { delivery });
      setAppliedCode(null);
      if (result.ok) applyQuote(result);
      else {
        setQuote(null);
        showNotice(result.error);
      }
    } catch {
      setAppliedCode(null);
      setQuote(null);
    } finally {
      setQuoting(false);
    }
  }

  const setContactField = (field: keyof typeof contact, value: string) => {
    setContact((c) => ({ ...c, [field]: value }));
    if (field !== "company" && contactErrors[field]) setContactErrors((e) => ({ ...e, [field]: undefined }));
  };

  const chooseSaved = (a: CheckoutAddress | null) => {
    setShipErrors({});
    if (!a) {
      setSavedId(null);
      setShip(emptyAddress);
      setShipMode("find");
      return;
    }
    setSavedId(a.id);
    setShip(fromSaved(a));
    setShipMode("manual");
    setContact((c) => ({
      ...c,
      name: c.name || a.name,
      phone: c.phone || a.phone || "",
      company: c.company || a.company || "",
    }));
  };

  async function continueToReview() {
    const c: Partial<Record<ContactField, string>> = {};
    if (!contact.name.trim() || contact.name.trim().length < 2) c.name = "Please enter your full name.";
    if (!contact.email.trim()) c.email = "Please enter your email.";
    else if (!EMAIL_RE.test(contact.email.trim())) c.email = "That email address doesn’t look right.";
    if (rules.phone !== "hidden") {
      if (!contact.phone.trim()) {
        if (rules.phone === "required") c.phone = "Please enter a contact phone number.";
      } else if (!normalisePhone(contact.phone)) c.phone = PHONE_INVALID;
    }
    const s = validateAddress(ship);
    const b = billingSame ? {} : validateAddress(bill, true);
    const d = selected ? "" : "No delivery option is available for this postcode. Please contact us to order.";
    setContactErrors(c);
    setShipErrors(s);
    setBillErrors(b);
    setDeliveryError(d);

    const firstInvalid = [
      c.name && "guest-name",
      c.email && "guest-email",
      c.phone && "guest-phone",
      (s.line1 || s.city || s.postcode) && (shipMode === "find" ? "ship-find" : s.line1 ? "ship-line1" : s.city ? "ship-city" : "ship-postcode"),
      (b.line1 || b.city || b.postcode) && (billMode === "find" ? "bill-find" : b.line1 ? "bill-line1" : b.city ? "bill-city" : "bill-postcode"),
      d && "delivery-options",
    ].find(Boolean);
    if (firstInvalid) {
      if ((s.line1 || s.city || s.postcode) && savedId !== null) setSavedId(null);
      document.getElementById(firstInvalid)?.focus();
      showToast({ title: "Please fix the highlighted fields to continue." });
      return;
    }
    const q = await refreshQuote();
    if (q) go("review");
  }

  async function continueToPayment() {
    const q = quote ?? (await refreshQuote());
    if (!q) return;
    if (!q.lines.length) {
      showNotice("Nothing in your basket can be bought online right now.");
      return;
    }
    if (belowMinimum(q)) {
      showNotice(`The minimum order is ${formatGBP(rules.minimumOrder)} (items, inc. VAT). Please add a little more to your basket.`);
      return;
    }
    go("payment");
  }

  /** Items total after any discount on them, against the shop's minimum order. */
  const belowMinimum = (q: Quote | null) =>
    !!q && rules.minimumOrder > 0 && q.totals.itemsIncVat - (q.totals.discountCode?.items ?? 0) < rules.minimumOrder - 0.004;

  const addressInput = (a: AddressValue) => ({
    line1: a.line1,
    line2: a.line2 || undefined,
    city: a.city,
    county: a.county || undefined,
    postcode: a.postcode,
  });

  async function pay() {
    if (!quote || submitting || mode === "disabled") return;
    if (rules.requireTerms && !acceptTerms) {
      setTermsError("Please tick the box to agree to the terms of sale.");
      document.getElementById("accept-terms")?.focus();
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await placeOrder({
        cart: lines.map((l) => ({ slug: l.slug, qty: l.qty })),
        contact: {
          name: contact.name,
          email: contact.email,
          phone: rules.phone === "hidden" ? undefined : contact.phone.trim() || undefined,
          company: (rules.company && contact.company) || undefined,
        },
        shipping: addressInput(ship),
        billing: billingSame ? null : addressInput(bill),
        marketingOptOut: optOut,
        saveAddress: !!account && savedId === null && saveAddress,
        discountCode: appliedCode ?? undefined,
        deliveryOption: selected?.id,
        note: rules.notes && note.trim() ? note.trim() : undefined,
        acceptTerms,
        expectedTotal: quote.totals.total,
      });
      if (result.ok) {
        onPlacing(result.external ? "stripe" : "local");
        if (result.external) window.location.assign(result.url);
        else router.push(result.url);
        return;
      }
      if (result.discountRejected) {
        setDiscount(appliedCode ?? "");
        setAppliedCode(null);
        setDiscountError(result.quote?.discountError ?? "This code can’t be used any more.");
      }
      if (result.quote) {
        applyQuote(result.quote);
        go("review");
      } else if (result.fieldErrors) {
        const f = result.fieldErrors;
        if (f.terms && Object.keys(f).length === 1) {
          setTermsError(f.terms);
          return;
        }
        setContactErrors({ name: f["contact.name"], email: f["contact.email"], phone: f["contact.phone"] });
        setShipErrors({ line1: f["shipping.line1"], city: f["shipping.city"], postcode: f["shipping.postcode"] });
        setBillErrors({ line1: f["billing.line1"], city: f["billing.city"], postcode: f["billing.postcode"] });
        setDeliveryError(f.delivery ?? "");
        if (f.terms) setTermsError(f.terms);
        if (Object.keys(f).some((k) => k.startsWith("shipping."))) {
          setSavedId(null);
          setShipMode("manual");
        }
        if (Object.keys(f).some((k) => k.startsWith("billing."))) setBillMode("manual");
        go("shipping");
      } else if (result.needsAccount) {
        router.push("/login?next=/checkout");
        return;
      }
      showNotice(result.error);
    } catch {
      showNotice("Something went wrong placing your order. Nothing has been charged; please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const shipTo = [contact.name, ship.line1, ship.line2, ship.city, ship.county, ship.postcode.toUpperCase()]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  const billTo = [bill.line1, bill.line2, bill.city, bill.county, bill.postcode.toUpperCase()]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  const reviewLines = quote?.lines ?? [];
  const DISPATCH_NOTE = dispatchNote(pricing.cutoff);

  return (
    <CheckoutFrame>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0">
          <StepList current={step} onBack={go} />

          {checkout.notice && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
              <p className="whitespace-pre-line">{checkout.notice}</p>
            </div>
          )}

          {notice && (
            <div
              ref={noticeRef}
              tabIndex={-1}
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 focus:outline-none"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{notice}</p>
            </div>
          )}

          {step === "shipping" && (
            <section className="space-y-6 rounded-xl border border-border bg-white p-4 sm:p-6">
              {!account && (
                <p className="rounded-lg border border-border bg-surface/80 px-3 py-2.5 text-sm text-muted-foreground">
                  Have an account?{" "}
                  <Link href="/login?next=/checkout" className="font-semibold text-emerald-700 underline underline-offset-2">
                    Sign in
                  </Link>{" "}
                  to use your saved addresses and follow this order from your account.
                </p>
              )}
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">Your details</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    id="guest-name"
                    label="Full name"
                    required
                    autoComplete="name"
                    value={contact.name}
                    onChange={(v) => setContactField("name", v)}
                    error={contactErrors.name}
                  />
                  <TextField
                    id="guest-email"
                    label="Email"
                    required
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.co.uk"
                    value={contact.email}
                    onChange={(v) => setContactField("email", v)}
                    error={contactErrors.email}
                  />
                  {rules.phone !== "hidden" && (
                    <div>
                      <label htmlFor="guest-phone" className={checkoutLabel}>
                        Phone
                        {rules.phone === "required" ? (
                          <span aria-hidden="true" className="ml-0.5 text-emerald-700">
                            *
                          </span>
                        ) : (
                          <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                        )}
                      </label>
                      <PhoneInput
                        id="guest-phone"
                        autoComplete="tel"
                        required={rules.phone === "required"}
                        aria-required={rules.phone === "required" ? "true" : undefined}
                        value={contact.phone}
                        onChange={(v) => setContactField("phone", v)}
                        aria-invalid={contactErrors.phone ? true : undefined}
                        aria-describedby={contactErrors.phone ? "guest-phone-error" : undefined}
                      />
                      {contactErrors.phone && (
                        <p id="guest-phone-error" className="mt-1 text-sm text-red-600">
                          {contactErrors.phone}
                        </p>
                      )}
                    </div>
                  )}
                  {rules.company && (
                    <TextField
                      id="guest-company"
                      label="Company"
                      optional
                      autoComplete="organization"
                      placeholder="Printed on your invoice"
                      value={contact.company}
                      onChange={(v) => setContactField("company", v)}
                    />
                  )}
                </div>
                <label className="flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                  <input
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-emerald-700"
                    type="checkbox"
                    checked={optOut}
                    onChange={(e) => setOptOut(e.target.checked)}
                  />
                  <span>
                    We&apos;ll email you about this order. We may also email you now and then about similar products
                    and offers — tick here if you&apos;d rather we didn&apos;t. You can unsubscribe from any email.
                  </span>
                </label>
              </div>

              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">{collect ? "Your address" : "Delivery address"}</h2>
                {collect && <p className="text-sm text-muted-foreground">For your invoice. You&apos;ll collect the order from {checkout.collectFrom}.</p>}
                {addresses.length > 0 && (
                  <fieldset className="space-y-2">
                    <legend className="sr-only">Saved addresses</legend>
                    {addresses.map((a) => (
                      <label
                        key={a.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm",
                          savedId === a.id ? "border-emerald-600/40 bg-emerald-50/70" : "border-border hover:bg-surface",
                        )}
                      >
                        <input
                          type="radio"
                          name="saved-address"
                          checked={savedId === a.id}
                          onChange={() => chooseSaved(a)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700"
                        />
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-foreground">
                            {a.label || a.name}
                            {a.isDefault && <span className="ml-2 text-xs font-normal text-muted-foreground">Default</span>}
                          </span>
                          <span className="block text-muted-foreground">
                            {[a.label ? a.name : null, a.company, a.line1, a.line2, a.city, a.county, a.postcode].filter(Boolean).join(", ")}
                          </span>
                        </span>
                      </label>
                    ))}
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold",
                        savedId === null ? "border-emerald-600/40 bg-emerald-50/70" : "border-border hover:bg-surface",
                      )}
                    >
                      <input
                        type="radio"
                        name="saved-address"
                        checked={savedId === null}
                        onChange={() => chooseSaved(null)}
                        className="h-4 w-4 shrink-0 accent-emerald-700"
                      />
                      Deliver somewhere else
                    </label>
                  </fieldset>
                )}
                {savedId === null && (
                  <>
                    <AddressFields
                      idPrefix="ship"
                      value={ship}
                      onChange={(patch) => {
                        setShip((a) => ({ ...a, ...patch }));
                        setShipErrors((e) => {
                          const next = { ...e };
                          for (const key of Object.keys(patch)) delete next[key as keyof AddressErrors];
                          return next;
                        });
                      }}
                      errors={shipErrors}
                      mode={shipMode}
                      onModeChange={setShipMode}
                    />
                    {account && (
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={saveAddress}
                          onChange={(e) => setSaveAddress(e.target.checked)}
                          className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-emerald-700"
                        />
                        Save this address to my account
                      </label>
                    )}
                  </>
                )}
              </div>

              {billingSame ? (
                <div className="checkout-billing-fold flex items-center gap-3 rounded-lg border border-border bg-surface/80 px-3 py-1.5">
                  <CircleCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <p className="min-w-0 flex-1 py-1.5 text-sm text-foreground/80">
                    <span className="font-semibold">Billing address:</span> same as delivery
                  </p>
                  <button
                    type="button"
                    aria-expanded="false"
                    aria-controls="guest-billing-panel"
                    onClick={() => setBillingSame(false)}
                    className="text-primary focus-visible:ring-primary inline-flex min-h-11 shrink-0 items-center rounded-sm px-1 text-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Change<span className="sr-only"> billing address</span>
                  </button>
                </div>
              ) : (
                <div id="guest-billing-panel" className="space-y-3 rounded-lg border border-border p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-foreground">Billing address</h2>
                    <button
                      type="button"
                      aria-expanded="true"
                      aria-controls="guest-billing-panel"
                      onClick={() => {
                        setBillingSame(true);
                        setBillErrors({});
                      }}
                      className={cn(linkButton, "min-h-9")}
                    >
                      Same as delivery
                    </button>
                  </div>
                  <AddressFields
                    idPrefix="bill"
                    value={bill}
                    onChange={(patch) => {
                      setBill((a) => ({ ...a, ...patch }));
                      setBillErrors((e) => {
                        const next = { ...e };
                        for (const key of Object.keys(patch)) delete next[key as keyof AddressErrors];
                        return next;
                      });
                    }}
                    errors={billErrors}
                    mode={billMode}
                    onModeChange={setBillMode}
                  />
                </div>
              )}

              <fieldset id="delivery-options" tabIndex={-1} className="space-y-3 focus:outline-none">
                <legend className="mb-3 text-base font-semibold text-foreground">Delivery method</legend>
                {available.map((o) => {
                  const chosen = selected?.id === o.id;
                  const cost = optionPrice(o, local.subtotal);
                  const detail =
                    o.kind === "collect"
                      ? [`Collect from ${checkout.collectFrom}`, o.estimate].filter(Boolean).join(" · ")
                      : o.estimate || (o.id === checkout.options[0]?.id ? DISPATCH_NOTE : "");
                  return (
                    <label
                      key={o.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3",
                        chosen ? "border-emerald-600/30 bg-emerald-50/70" : "border-border hover:bg-surface",
                      )}
                    >
                      <input
                        type="radio"
                        name="delivery-method"
                        value={o.id}
                        checked={chosen}
                        onChange={() => {
                          setDeliveryId(o.id);
                          setDeliveryError("");
                        }}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700"
                      />
                      {o.kind === "collect" && <Store className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">{o.name}</span>
                        {detail && <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>}
                        {cost > 0 && o.freeFrom !== null && o.freeFrom > 0 && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">Free when your items come to {formatGBP(o.freeFrom)} or more.</span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-foreground">{cost === 0 ? "Free" : formatGBP(cost)}</span>
                    </label>
                  );
                })}
                {!available.length && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                    We can&apos;t deliver to {ship.postcode.trim().toUpperCase()} with online ordering.{" "}
                    {shop.phoneHref ? (
                      <>
                        Please call <PhoneLink className="font-semibold underline underline-offset-2" /> and we&apos;ll help.
                      </>
                    ) : (
                      "Please contact us and we'll help."
                    )}
                  </p>
                )}
                {available.length > 0 && hiddenOptions > 0 && postcodeKnown && (
                  <p className="text-xs text-muted-foreground">
                    {hiddenOptions === 1 ? "One option isn't" : `${hiddenOptions} options aren't`} available for {ship.postcode.trim().toUpperCase()}.
                  </p>
                )}
                {deliveryError && (
                  <p role="alert" className="text-sm text-red-600">
                    {deliveryError}
                  </p>
                )}
                {!checkout.options.some((o) => o.kind === "collect") && shop.phoneHref && (
                  <p className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                    <span>
                      Collecting from our {shop.city ? `${shop.city} ` : ""}store instead? Ring{" "}
                      <PhoneLink className="font-semibold text-foreground/80 underline underline-offset-2" /> and we&apos;ll have it ready.
                    </span>
                  </p>
                )}
              </fieldset>

              {rules.notes && (
                <div>
                  <label htmlFor="order-note" className={checkoutLabel}>
                    Order note <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    id="order-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 500))}
                    rows={3}
                    maxLength={500}
                    placeholder={collect ? "e.g. Who's collecting, or when you'll come" : "e.g. Leave it with the neighbour at number 12"}
                    className={cn(checkoutInput, "h-auto py-2")}
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={continueToReview}
                  disabled={quoting}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-6 text-base font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-70 sm:w-auto"
                >
                  {quoting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Continue to review
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {step === "review" && (
            <section className="space-y-5 rounded-xl border border-border bg-white p-6">
              <h2 className="text-lg font-semibold text-foreground">Review your order</h2>
              {!quote ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground" role="status">
                  <LoaderCircle className="h-4 w-4 animate-spin text-emerald-700" aria-hidden="true" />
                  Checking prices and stock…
                  <button type="button" onClick={() => void refreshQuote()} disabled={quoting} className={cn(linkButton, "ml-auto min-h-9")}>
                    Check again
                  </button>
                </div>
              ) : reviewLines.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Nothing in your basket can be bought online right now.{" "}
                  <Link href="/cart" className="font-semibold text-emerald-700 underline underline-offset-2">
                    Back to your basket
                  </Link>
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {reviewLines.map((line) => (
                    <li key={line.slug} className="flex items-center gap-4 py-4">
                      <ProductThumb
                        src={line.image}
                        alt={line.name}
                        sizes="56px"
                        className="h-14 w-14 rounded border border-border bg-white"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{line.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty {line.qty} × {formatGBP(line.unitIncVat)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{formatGBP(line.unitIncVat * line.qty)}</p>
                    </li>
                  ))}
                </ul>
              )}
              {applied && reviewLines.length > 0 && (
                <dl className="space-y-1 border-t border-border pt-3 text-sm" data-testid="review-discount">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-muted-foreground">{discountLabel(applied.code)}</dt>
                    <dd className="font-semibold text-emerald-700 tabular-nums">−{formatGBP(quote?.totals.discount ?? 0)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="font-semibold text-foreground">New total</dt>
                    <dd className="font-semibold text-foreground tabular-nums">{formatGBP(totals.total)}</dd>
                  </div>
                </dl>
              )}
              <div className="rounded-md bg-surface p-4 text-sm">
                <p className="font-semibold text-foreground">{collect ? "Your details" : "Ship to"}</p>
                <p className="mt-1 text-foreground/80">{shipTo}</p>
                <p className="mt-1 text-muted-foreground">
                  {contact.email.trim()}
                  {rules.phone !== "hidden" && contact.phone.trim() ? ` · ${contact.phone.trim()}` : ""}
                </p>
                <p className="mt-2 text-foreground/80">
                  <span className="font-semibold text-foreground">Billing:</span> {billingSame ? (collect ? "same as above" : "same as delivery") : billTo}
                </p>
                <p className="mt-2 text-foreground/80">
                  <span className="font-semibold text-foreground">{collect ? "Collection:" : "Delivery:"}</span> {selected?.name ?? "—"} (
                  {totals.delivery === 0 ? "free" : formatGBP(totals.delivery)})
                  {collect && <span className="block text-muted-foreground">Collect from {checkout.collectFrom}</span>}
                </p>
                {rules.notes && note.trim() && (
                  <p className="mt-2 text-foreground/80">
                    <span className="font-semibold text-foreground">Note:</span> {note.trim()}
                  </p>
                )}
              </div>
              {belowMinimum(quote) && (
                <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  The minimum order is {formatGBP(rules.minimumOrder)} (items, inc. VAT).{" "}
                  <Link href="/cart" className="font-semibold underline underline-offset-2">
                    Add a little more to your basket
                  </Link>{" "}
                  to continue.
                </p>
              )}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => go("shipping")}
                  className="text-sm font-semibold text-foreground/80 hover:text-emerald-700"
                >
                  ← Edit details
                </button>
                <button
                  type="button"
                  onClick={continueToPayment}
                  disabled={quoting || (quote !== null && reviewLines.length === 0) || belowMinimum(quote)}
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                >
                  Continue to payment
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {step === "payment" && (
            <section className="space-y-5 rounded-xl border border-border bg-white p-6">
              <h2 className="text-lg font-semibold text-foreground">Payment</h2>
              <PaymentNotice mode={mode} total={totals.total} termsBox={rules.requireTerms} />
              {rules.requireTerms && mode !== "disabled" && (
                <div>
                  <label className="flex items-start gap-2 text-sm leading-5 text-foreground/80">
                    <input
                      id="accept-terms"
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(e.target.checked);
                        setTermsError("");
                      }}
                      aria-invalid={termsError ? true : undefined}
                      aria-describedby={termsError ? "accept-terms-error" : undefined}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-emerald-700"
                    />
                    <span>
                      I agree to the{" "}
                      <Link href="/terms" target="_blank" className="font-semibold underline underline-offset-2">
                        terms of sale
                      </Link>
                      .
                    </span>
                  </label>
                  {termsError && (
                    <p id="accept-terms-error" role="alert" className="mt-1 text-sm text-red-600">
                      {termsError}
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => go("review")}
                  className="text-sm font-semibold text-foreground/80 hover:text-emerald-700"
                >
                  ← Back to review
                </button>
                <button
                  type="button"
                  onClick={pay}
                  disabled={submitting || mode === "disabled" || !quote}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-6 text-base font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  )}
                  {mode === "stripe"
                    ? `Pay ${formatGBP(totals.total)} securely`
                    : mode === "test"
                      ? "Place order — test payment"
                      : "Online payment unavailable"}
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit min-w-0 space-y-4 rounded-xl border border-border bg-white p-6 lg:sticky lg:top-24">
          <h3 className="font-mono text-sm tracking-[0.18em] text-muted-foreground uppercase">Order summary</h3>
          {applied && quote ? (
            // With a discount code the summary is inc. VAT (the discount is an inc-VAT amount), so the rows add up.
            <dl className="space-y-2 text-sm" data-testid="summary-discounted">
              <SummaryRow label={`Items (inc. VAT) · ${itemsLabel(totals.count)}`}>{formatGBP(totals.itemsIncVat)}</SummaryRow>
              <SummaryRow label={totals.delivery > 0 ? "Delivery (inc. VAT)" : "Delivery"}>
                {totals.delivery > 0 ? formatGBP(totals.delivery) : "Free"}
              </SummaryRow>
              <SummaryRow label={discountLabel(applied.code)} tone="text-emerald-700">
                −{formatGBP(quote.totals.discount)}
              </SummaryRow>
            </dl>
          ) : (
            <dl className="space-y-2 text-sm">
              <SummaryRow label={`Subtotal (ex VAT) · ${itemsLabel(totals.count)}`}>{formatGBP(totals.itemsExVat)}</SummaryRow>
              <SummaryRow label={totals.delivery > 0 ? "Delivery (inc. VAT)" : "Delivery"}>
                {totals.delivery > 0 ? formatGBP(totals.delivery) : "Free"}
              </SummaryRow>
              <SummaryRow label={totals.delivery > 0 ? `VAT on items (${totals.vatPercent}%)` : `VAT (${totals.vatPercent}%)`}>
                {formatGBP(totals.vat)}
              </SummaryRow>
              {appliedCode && (
                <SummaryRow label={discountLabel(appliedCode)} tone="text-muted-foreground">
                  Checked at review
                </SummaryRow>
              )}
            </dl>
          )}
          <div className="border-t border-border pt-3">
            <dl>
              <SummaryRow label="Total" bold>
                {formatGBP(totals.total)}
              </SummaryRow>
            </dl>
            {applied && quote && (
              <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
                Includes VAT ({totals.vatPercent}%) of {formatGBP(quote.totals.vat)}
              </p>
            )}
            {!quote && <p className="mt-1 text-xs text-muted-foreground">Prices are checked again before you pay.</p>}
          </div>
          <div className="border-t border-border pt-3">
            {appliedCode ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm" data-testid="discount-applied">
                <Tag className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-emerald-950">
                  <span className="font-mono font-semibold">{appliedCode}</span>
                  {applied ? ` · ${describeDiscount(applied)}` : ""} applied
                </p>
                {step === "payment" ? (
                  <span className="text-xs text-emerald-900">Go back to review to change it</span>
                ) : (
                  <button
                    type="button"
                    onClick={removeCode}
                    disabled={quoting}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-sm px-1 text-xs font-semibold text-emerald-800 underline underline-offset-2 hover:no-underline disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove<span className="sr-only"> discount code {appliedCode}</span>
                  </button>
                )}
              </div>
            ) : step === "payment" ? (
              <p className="text-xs text-muted-foreground">Have a discount code? Go back to review to enter it.</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void applyCode();
                }}
              >
                <label htmlFor="guest-discount-code" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Discount code
                </label>
                <div className="flex gap-2">
                  <input
                    id="guest-discount-code"
                    type="text"
                    value={discount}
                    onChange={(e) => {
                      setDiscount(e.target.value.toUpperCase());
                      setDiscountError("");
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={40}
                    placeholder="e.g. THANKS-7K3QF9X"
                    aria-invalid={discountError ? true : undefined}
                    aria-describedby={discountError ? "guest-discount-error" : undefined}
                    className="h-10 min-w-0 flex-1 rounded-md border border-border px-3 font-mono text-sm uppercase focus:border-emerald-700 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!discount.trim() || applying}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 px-3 text-sm font-semibold text-foreground/80 hover:bg-surface disabled:opacity-50"
                  >
                    {applying && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    Apply
                  </button>
                </div>
                {discountError && (
                  <p id="guest-discount-error" role="alert" className="mt-1.5 text-xs text-red-600">
                    {discountError}
                  </p>
                )}
              </form>
            )}
          </div>
          <div className="space-y-2 pt-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              {mode === "test" ? (
                <>
                  <FlaskConical className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" /> Test mode · no money is taken
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                  {mode === "stripe" ? "Secure card payment by Stripe" : "Online payment unavailable"}
                </>
              )}
            </p>
            <p className="flex items-center gap-1.5">
              {collect ? (
                <>
                  <Store className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" /> Collect from {checkout.collectFrom}
                </>
              ) : (
                <>
                  <Truck className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" /> {selected?.estimate || DISPATCH_NOTE}
                </>
              )}
            </p>
          </div>
        </aside>
      </div>
    </CheckoutFrame>
  );
}

function PaymentNotice({ mode, total, termsBox }: { mode: CheckoutPaymentMode; total: number; termsBox: boolean }) {
  const shop = useShopInfo();
  // With the "I agree" box shown below, the notice doesn't repeat the terms.
  const terms = termsBox ? null : (
    <Link href="/terms" className="font-semibold underline underline-offset-2">
      terms of sale
    </Link>
  );
  if (mode === "stripe") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        <p className="flex items-center gap-1.5 font-semibold">
          <Lock className="h-4 w-4" aria-hidden="true" /> Secure payment by Stripe
        </p>
        <p className="mt-1">
          Next you&apos;ll go to Stripe&apos;s secure page to pay {formatGBP(total)} by card, Apple Pay or Google Pay. We
          never see your card details.{terms && <> By paying you agree to our {terms}.</>}
        </p>
      </div>
    );
  }
  if (mode === "test") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="flex items-center gap-1.5 font-semibold">
          <FlaskConical className="h-4 w-4" aria-hidden="true" /> Local test payment
        </p>
        <p className="mt-1">
          Stripe isn&apos;t connected on this computer, so the next page takes a pretend payment: no card is asked for
          and nothing is charged. The order, emails and stock are handled exactly as for a real payment.
          {terms && <> By placing it you agree to our {terms}.</>}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-semibold">Payments aren&apos;t set up yet</p>
      <p className="mt-1">
        We can&apos;t take payment online at the moment.{" "}
        {shop.phoneHref ? (
          <>
            Please call <PhoneLink className="font-semibold underline underline-offset-2" /> to place your order.
          </>
        ) : shop.email ? (
          <>
            Please email{" "}
            <a className="font-semibold underline underline-offset-2" href={`mailto:${shop.email}`}>
              {shop.email}
            </a>{" "}
            to place your order.
          </>
        ) : (
          "Please try again later."
        )}
      </p>
    </div>
  );
}

function StepList({ current, onBack }: { current: Step; onBack: (step: Step) => void }) {
  const currentIndex = steps.findIndex((s) => s.id === current);
  return (
    <ol className="mb-8 flex items-center gap-2 sm:gap-3">
      {steps.map(({ id, label, Icon }, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const content = (
          <>
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full sm:h-7 sm:w-7",
                active && "border-2 border-emerald-700 text-emerald-700",
                done && "border border-emerald-700 bg-emerald-700 text-white",
                !active && !done && "border border-border text-zinc-400",
              )}
            >
              {done ? (
                <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              ) : (
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              )}
            </span>
            <span className={cn(active ? "font-semibold text-foreground" : done ? "text-foreground/80" : "text-zinc-400")}>
              {label}
            </span>
          </>
        );
        return (
          <li key={id} className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm" aria-current={active ? "step" : undefined}>
            {done ? (
              <button type="button" onClick={() => onBack(id)} className="flex items-center gap-1.5 hover:underline sm:gap-2">
                {content}
              </button>
            ) : (
              content
            )}
            {i < steps.length - 1 && <span className="ml-1 hidden h-px w-6 bg-border sm:inline-block sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}

function SummaryRow({ label, bold, tone, children }: { label: string; bold?: boolean; tone?: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={bold ? "text-sm font-semibold text-foreground" : "text-muted-foreground"}>{label}</dt>
      <dd className={bold ? "text-base font-semibold text-foreground" : (tone ?? "text-foreground")}>{children}</dd>
    </div>
  );
}

function TextField({
  id,
  label,
  required,
  optional,
  type = "text",
  autoComplete,
  placeholder,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={checkoutLabel}>
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-emerald-700">
            *
          </span>
        )}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={checkoutInput}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
