// Authentication (Better Auth): email + password accounts stored in MongoDB, roles via the admin plugin.
// Server-only. The browser uses src/lib/auth-client.ts.
import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { client, db } from "@/db";
import { sendPasswordResetEmail, sendVerifyEmail } from "@/lib/orders/emails";
import { ac, authRoles } from "./auth-roles";

const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * 32-character ids like Better Auth's own. With our own generator the MongoDB adapter stores ids as plain strings
 * (not ObjectIds), so accounts keep the same ids they had in the previous database.
 */
const authId = () => Array.from(randomBytes(32), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  // Collections "users", "sessions", "accounts", "verifications"; writes that belong together run in a transaction.
  database: mongodbAdapter(db.raw, { client, usePlural: true, transaction: true }),
  advanced: { database: { generateId: authId } },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    // Public sign-up creates shop customers only; the single owner account is created with `npm run admin:create`.
    autoSignIn: true,
    // Password reset: the link (valid 1 hour) goes out via sendEmail; resetting signs the account out everywhere.
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user, url);
    },
    // A reset link proves the person reads that inbox, so the email counts as confirmed.
    onPasswordReset: async ({ user }) => {
      if (!user.emailVerified) await db.users.updateOne({ _id: user.id }, { $set: { emailVerified: true, updatedAt: new Date() } });
    },
  },
  // Sign-up sends a confirmation link. Signing in doesn't need it, but guest orders placed with the email only show
  // in the account once it's confirmed (see src/lib/orders/customer.ts).
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerifyEmail(user, url);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      company: { type: "string", required: false },
    },
  },
  plugins: [
    admin({ ac, roles: authRoles, defaultRole: "customer", adminRoles: ["owner"] }),
    // Lets server actions set the session cookie.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
