"use client";

import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, authRoles } from "./auth-roles";

// Browser-side auth: signIn.email, signUp.email, signOut, useSession, and admin.* for back-office user management.
export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles: authRoles })],
});
