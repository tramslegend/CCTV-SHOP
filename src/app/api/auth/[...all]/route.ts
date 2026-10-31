import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth endpoints: sign-in, sign-up, sign-out, session, admin actions.
export const { GET, POST } = toNextJsHandler(auth);
