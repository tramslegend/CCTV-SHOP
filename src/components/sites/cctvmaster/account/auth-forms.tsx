"use client";

import { ArrowLeft, Check, Circle, Eye, EyeOff, LoaderCircle, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { PhoneInput } from "../phone-input";
import { useShopInfo } from "../shop-info";
import { showToast } from "../shop-state";
import { AuthDivider } from "./auth-shell";
import { authInput, authLabel, fieldError, formAlert, primaryButton, secondaryButton } from "./styles";
import { EMAIL_RE, PASSWORD_RULES, PHONE_INVALID, authErrorMessage, firstName, normalisePhone, passwordProblem } from "./validation";

// ---------- shared inputs ----------

export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} className={cn(authInput, "pr-11", className)} {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-zinc-400 hover:text-foreground/80 focus-visible:text-emerald-700 focus-visible:outline-none"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className={fieldError}>
      {message}
    </p>
  ) : null;
}

function PasswordRules({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 text-[11px]">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.key} className={cn("flex items-center gap-1", met ? "text-emerald-700" : "text-muted-foreground")}>
            {met ? <Check className="h-3 w-3" aria-hidden="true" /> : <Circle className="h-2.5 w-2.5" aria-hidden="true" />}
            {rule.label}
            <span className="sr-only">{met ? " – done" : " – needed"}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Shown on /login and /signup when this browser is already signed in. */
function SignedInNotice({ next, email }: { next: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-7 space-y-4">
      <p className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        You&apos;re signed in as <span className="font-semibold">{email}</span>.
      </p>
      <Link href={next} className={primaryButton}>
        Continue to your account
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await authClient.signOut();
          setBusy(false);
          router.refresh();
        }}
        className={secondaryButton}
      >
        Sign out
      </button>
    </div>
  );
}

// ---------- /login ----------

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isPending && session && !busy) return <SignedInNotice next={next} email={session.user.email} />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const address = email.trim();
    if (!EMAIL_RE.test(address)) return setError("Please enter a valid email address");
    if (!password) return setError("Password is required");
    setBusy(true);
    const { data, error: failed } = await authClient.signIn.email({ email: address, password, rememberMe: true });
    if (failed || !data) {
      setBusy(false);
      setError(authErrorMessage(failed, "We couldn’t sign you in. Please try again."));
      return;
    }
    showToast({ title: `Welcome back, ${firstName(data.user)}` });
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mt-7">
      <form method="post" onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <p role="alert" className={formAlert}>
            {error}
          </p>
        )}
        <div className="space-y-1.5">
          <label htmlFor="cctvm-signin-email" className={authLabel}>
            Email
          </label>
          <input
            id="cctvm-signin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.co.uk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInput}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="cctvm-signin-password" className={authLabel}>
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:underline focus-visible:outline-none"
            >
              Forgot?
            </Link>
          </div>
          <PasswordInput
            id="cctvm-signin-password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

// ---------- /signup ----------

type SignupField = "name" | "email" | "phone" | "company" | "password";
const signupIds: Record<SignupField, string> = {
  name: "cctvm-signup-name",
  email: "cctvm-signup-email",
  phone: "cctvm-signup-phone",
  company: "cctvm-signup-company",
  password: "cctvm-signup-password",
};

function validateSignup(values: Record<SignupField, string>) {
  const errors: Partial<Record<SignupField, string>> = {};
  if (values.name.trim().length < 2) errors.name = "Please enter your name";
  if (!EMAIL_RE.test(values.email.trim())) errors.email = "Please enter a valid email";
  if (values.phone.trim() && !normalisePhone(values.phone)) errors.phone = PHONE_INVALID;
  if (values.company.trim().length > 120) errors.company = "Please shorten the company name";
  if (!values.password) errors.password = "Password is required";
  else {
    const failed = passwordProblem(values.password);
    if (failed) errors.password = failed;
  }
  return errors;
}

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const shop = useShopInfo();
  const { data: session, isPending } = authClient.useSession();
  const [values, setValues] = useState<Record<SignupField, string>>({ name: "", email: "", phone: "", company: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<SignupField, string>>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isPending && session && !busy) return <SignedInNotice next={next} email={session.user.email} />;

  const set = (field: SignupField, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const describe = (field: SignupField, extra?: string) => ({
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": [extra, errors[field] ? `${signupIds[field]}-error` : undefined].filter(Boolean).join(" ") || undefined,
  });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const found = validateSignup(values);
    setErrors(found);
    const firstInvalid = (Object.keys(signupIds) as SignupField[]).find((f) => found[f]);
    if (firstInvalid) {
      document.getElementById(signupIds[firstInvalid])?.focus();
      return;
    }
    setBusy(true);
    const name = values.name.trim().replace(/\s+/g, " ");
    // phone and company are extra user fields (see user.additionalFields in src/lib/auth.ts).
    const body: Parameters<typeof authClient.signUp.email>[0] & { phone?: string; company?: string } = {
      name,
      email: values.email.trim().toLowerCase(),
      password: values.password,
      phone: values.phone.trim() ? (normalisePhone(values.phone) ?? undefined) : undefined,
      company: values.company.trim() || undefined,
      // Where the "confirm your email" link lands.
      callbackURL: "/dashboard/orders?verified=1",
    };
    const { error } = await authClient.signUp.email(body);
    if (error) {
      setBusy(false);
      setFormError(authErrorMessage(error, "We couldn’t create your account. Please try again."));
      return;
    }
    showToast({ title: `Welcome to ${shop.name}, ${firstName({ name })}`, description: "Your account is ready." });
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mt-7">
      <form method="post" onSubmit={submit} className="space-y-4" noValidate>
        {formError && (
          <p role="alert" className={formAlert}>
            {formError}
          </p>
        )}
        <div className="space-y-1.5">
          <label htmlFor={signupIds.name} className={authLabel}>
            Full name
          </label>
          <input
            id={signupIds.name}
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Your name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            className={authInput}
            {...describe("name")}
          />
          <FieldError id={`${signupIds.name}-error`} message={errors.name} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={signupIds.email} className={authLabel}>
            Email
          </label>
          <input
            id={signupIds.email}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.co.uk"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            className={authInput}
            {...describe("email")}
          />
          <FieldError id={`${signupIds.email}-error`} message={errors.email} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={signupIds.phone} className={authLabel}>
            Phone <span className="tracking-normal normal-case">(optional)</span>
          </label>
          <PhoneInput
            id={signupIds.phone}
            name="phone"
            autoComplete="tel"
            value={values.phone}
            onChange={(v) => set("phone", v)}
            {...describe("phone")}
          />
          <FieldError id={`${signupIds.phone}-error`} message={errors.phone} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={signupIds.company} className={authLabel}>
            Company <span className="tracking-normal normal-case">(optional)</span>
          </label>
          <input
            id={signupIds.company}
            name="company"
            type="text"
            autoComplete="organization"
            placeholder="Printed on your invoices"
            value={values.company}
            onChange={(e) => set("company", e.target.value)}
            className={authInput}
            {...describe("company")}
          />
          <FieldError id={`${signupIds.company}-error`} message={errors.company} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={signupIds.password} className={authLabel}>
            Password
          </label>
          <PasswordInput
            id={signupIds.password}
            name="password"
            autoComplete="new-password"
            required
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            {...describe("password", "cctvm-signup-password-rules")}
          />
          <PasswordRules id="cctvm-signup-password-rules" password={values.password} />
          <FieldError id={`${signupIds.password}-error`} message={errors.password} />
        </div>
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Create account
        </button>
        <p className="text-center text-[11px] text-muted-foreground">
          By signing up, you&apos;re agreeing to our{" "}
          <Link className="font-semibold text-foreground/80 hover:text-emerald-700" href="/terms">
            Terms
          </Link>{" "}
          and{" "}
          <Link className="font-semibold text-foreground/80 hover:text-emerald-700" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </div>
  );
}

// ---------- /forgot-password ----------

export function ForgotPasswordForm({ heading }: { heading: ReactNode }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <MailCheck className="h-7 w-7 text-emerald-700" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            If there&apos;s an account for <span className="font-medium text-foreground">{sentTo}</span>, we&apos;ve sent it a
            reset link. It works for one hour.
          </p>
        </div>
        <p className="text-xs text-zinc-400">
          Didn&apos;t receive it? Check your spam folder or{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:underline focus-visible:outline-none"
          >
            try again
          </button>
          .
        </p>
        <Link href="/login" className={secondaryButton}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_RE.test(address)) return setError("Please enter a valid email address");
    setError("");
    setBusy(true);
    const { error: failed } = await authClient.requestPasswordReset({ email: address, redirectTo: "/reset-password" });
    setBusy(false);
    if (failed) return setError(authErrorMessage(failed, "We couldn’t send the reset link. Please try again."));
    setSentTo(address);
  }

  return (
    <>
      {heading}
      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        {error && (
          <p role="alert" className={formAlert}>
            {error}
          </p>
        )}
        <div className="space-y-1.5">
          <label htmlFor="cctvm-fp-email" className={authLabel}>
            Email
          </label>
          <input
            id="cctvm-fp-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.co.uk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInput}
            aria-invalid={error ? true : undefined}
          />
        </div>
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
          Send reset link
        </button>
      </form>
      <AuthDivider label="Remembered it?" />
      <Link href="/login" className={cn(secondaryButton, "mt-4 px-0")}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to sign in
      </Link>
    </>
  );
}

// ---------- /reset-password ----------

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <Check className="h-7 w-7 text-emerald-700" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Password updated</h1>
          <p className="text-sm text-muted-foreground">You&apos;ve been signed out everywhere. Sign in with your new password.</p>
        </div>
        <Link href="/login" className={primaryButton}>
          Sign in
        </Link>
      </div>
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("The two passwords don’t match");
    setError("");
    setBusy(true);
    const { error: failed } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (failed) return setError(authErrorMessage(failed, "We couldn’t reset your password. Please request a new link."));
    setDone(true);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Use at least 10 characters with a mix of letters, numbers and symbols.</p>
      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        {error && (
          <p role="alert" className={formAlert}>
            {error}
          </p>
        )}
        <div className="space-y-1.5">
          <label htmlFor="cctvm-rp-password" className={authLabel}>
            New password
          </label>
          <PasswordInput
            id="cctvm-rp-password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="cctvm-rp-rules"
          />
          <PasswordRules id="cctvm-rp-rules" password={password} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cctvm-rp-confirm" className={authLabel}>
            Confirm new password
          </label>
          <PasswordInput
            id="cctvm-rp-confirm"
            name="confirm"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Update password
        </button>
      </form>
    </>
  );
}
