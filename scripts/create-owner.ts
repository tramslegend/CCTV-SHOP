// Creates the shop owner's account — the only account that can sign in to the admin. Run once per environment:
//
//   npm run admin:create -- --email boss@example.co.uk --name "Jane Smith" --password "a-long-passphrase"
//
// There is exactly one owner. Running it again for the same email resets that owner's password (with --password).
// To hand the shop to someone else, add --replace: the previous owner becomes an ordinary customer and is signed out.
// Uses MONGODB_URI from the environment (or .env.local).
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { AccountRow, UserRow } from "../src/db/schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  // MONGODB_URI may come from the shell instead.
}

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const value = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : undefined;
};

const email = value("email")?.trim().toLowerCase();
const name = value("name")?.trim();
const password = value("password");
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("--email is required");
if (password !== undefined && password.length < 10) throw new Error("--password must be at least 10 characters");

/** Better Auth's own document format: the id is `_id` only (no `id` field). */
type AuthDoc<T extends { id: string }> = Omit<T, "id"> & { _id: string };

async function main() {
  // The database module reads MONGODB_URI when it loads, so it's imported after .env.local.
  const { db, insert, transaction } = await import("../src/db");
  const users = db.raw.collection<AuthDoc<UserRow>>(db.users.collectionName);
  const accounts = db.raw.collection<AuthDoc<AccountRow>>(db.accounts.collectionName);
  try {
    const others = await users.find({ role: "owner", email: { $ne: email! } }).toArray();
    if (others.length && !flag("replace")) {
      throw new Error(
        `This shop already has an owner (${others.map((o) => o.email).join(", ")}). Only one person can control the admin.\n` +
          "To hand it over, run the command again with --replace.",
      );
    }

    const existing = await users.findOne({ email: email! });
    const userId = existing?._id ?? randomUUID();
    await transaction(async (session) => {
      const opts = { session };
      for (const previous of others) {
        await users.updateOne({ _id: previous._id }, { $set: { role: "customer", updatedAt: new Date() } }, opts);
        await db.sessions.deleteMany({ userId: previous._id }, opts);
      }
      if (existing) {
        await users.updateOne({ _id: userId }, { $set: { role: "owner", banned: false, ...(name && { name }), updatedAt: new Date() } }, opts);
      } else {
        if (!password) throw new Error("--password is required for a new account");
        const now = new Date();
        await users.insertOne(
          {
            _id: userId,
            name: name || email!,
            email: email!,
            emailVerified: true,
            image: null,
            role: "owner",
            banned: false,
            banReason: null,
            banExpires: null,
            phone: null,
            company: null,
            createdAt: now,
            updatedAt: now,
          },
          opts,
        );
      }
      if (password) {
        const hash = await hashPassword(password);
        const credential = await accounts.findOne({ userId, providerId: "credential" }, opts);
        if (credential) await accounts.updateOne({ _id: credential._id }, { $set: { password: hash, updatedAt: new Date() } }, opts);
        else {
          const now = new Date();
          await accounts.insertOne(
            {
              _id: randomUUID(),
              accountId: userId,
              providerId: "credential",
              userId,
              accessToken: null,
              refreshToken: null,
              idToken: null,
              accessTokenExpiresAt: null,
              refreshTokenExpiresAt: null,
              scope: null,
              password: hash,
              createdAt: now,
              updatedAt: now,
            },
            opts,
          );
        }
        // A password reset signs the owner out everywhere.
        if (existing) await db.sessions.deleteMany({ userId }, opts);
      }
      await insert(
        "auditLog",
        {
          action: others.length ? "owner.replace" : existing ? "owner.update" : "owner.create",
          entity: "user",
          entityId: userId,
          changes: { email, ...(others.length && { previousOwners: others.map((o) => o.email) }) },
          actorEmail: "cli",
        },
        opts,
      );
    });
    console.log(`${email} is the shop owner${others.length ? ` (replaced ${others.map((o) => o.email).join(", ")})` : ""}.`);
  } finally {
    await db.client.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
