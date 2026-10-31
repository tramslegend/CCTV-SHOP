// Pure helpers for the account and checkout forms (safe to import from server components).
export { EMAIL_RE, UK_POSTCODE_RE, formatPostcode, normalisePhone } from "@/lib/orders/validation";
export { PHONE_INVALID } from "@/lib/phone";

export const firstName = (account: { name: string }) => account.name.trim().split(/\s+/)[0] ?? "";

/** Only same-site paths are allowed as a post-login destination. */
export function safeNext(next: string | string[] | undefined | null, fallback = "/dashboard") {
  const value = Array.isArray(next) ? next[0] : next;
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback;
}

/** Shop password rules (the server enforces the length too: see minPasswordLength in src/lib/auth.ts). */
export const PASSWORD_RULES = [
  { key: "length", label: "10+ characters", message: "Password must be at least 10 characters", test: (p: string) => p.length >= 10 },
  { key: "uppercase", label: "Uppercase letter", message: "Password needs an uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lowercase", label: "Lowercase letter", message: "Password needs a lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", label: "Number", message: "Password needs a number", test: (p: string) => /\d/.test(p) },
  { key: "symbol", label: "Symbol (! £ # …)", message: "Password needs a symbol, e.g. ! £ #", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export const passwordProblem = (password: string) => PASSWORD_RULES.find((rule) => !rule.test(password))?.message;

/** Friendly text for Better Auth error codes. */
export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined, fallback: string) {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don’t match an account.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "There’s already an account with that email. Sign in, or reset the password.";
    case "BANNED_USER":
      return "This account has been blocked. Please contact us.";
    case "PASSWORD_TOO_SHORT":
      return "Password must be at least 10 characters.";
    case "INVALID_PASSWORD":
      return "Your current password isn’t right.";
    case "INVALID_TOKEN":
      return "This reset link is invalid or has expired.";
    default:
      if (error?.status === 429) return "Too many attempts. Please wait a minute and try again.";
      return error?.message || fallback;
  }
}
