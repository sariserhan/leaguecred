import { betterAuth } from "better-auth/minimal";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { resolveTrustedOrigins } from "@/lib/auth-origins";
import { isDisposableEmailDomain } from "@/lib/disposable-email-domains";
import { HANDLE_TAKEN_MESSAGE, validateHandle } from "@/lib/handle";
import { freeHandleFor, handleTaken } from "@/services/handles";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail, verificationEmail } from "@/lib/email-templates";
import { requireBetterAuthSecret, serverEnv } from "@/lib/env";

export const auth = betterAuth({
  appName: "LeagueCred",
  baseURL: serverEnv.betterAuthUrl,
  // The apex redirects to www, so the browser origin will not always match
  // baseURL exactly. Preview deployments have their own host again.
  trustedOrigins: resolveTrustedOrigins({
    baseUrl: serverEnv.betterAuthUrl,
    vercelUrl: process.env.VERCEL_URL,
    vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  }),
  secret: requireBetterAuthSecret(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    // Sign-in is deliberately not gated on verification. A Daily Lock record
    // is permanent and cannot be rebuilt, so locking people out of an account
    // they can still prove they own would do more damage than an unverified
    // address does. Verification exists to keep the account recoverable.
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(user.email, passwordResetEmail({ name: user.name, url }));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(user.email, verificationEmail({ name: user.name, url }));
    },
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
        // Chosen at sign-up. Left to the create hook below to validate and, for
        // a sign-up that carried none, to derive - nobody should end up
        // without a handle, since it is what their record is linked by.
        input: true,
      },
    },
  },
  // Sign-up and sign-in already carry Better Auth's default rate limit (3
  // requests per 10 seconds), so the remaining easy multi-account vector is a
  // throwaway address rather than request volume.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (isDisposableEmailDomain(user.email)) {
            throw new APIError("BAD_REQUEST", {
              message: "Use a permanent email address. A Daily Lock record cannot be rebuilt under a new account.",
            });
          }

          // The handle is what a member is identified by, so it is settled
          // here rather than left for later: a chosen one is validated and
          // checked, and an absent one is derived from the display name.
          // Checked as well as indexed so the refusal is a sentence rather
          // than a constraint violation; the index is what holds under a race.
          const requested = (user as { username?: unknown }).username;
          if (typeof requested === "string" && requested.trim().length > 0) {
            const checked = validateHandle(requested);
            if (!checked.ok) throw new APIError("BAD_REQUEST", { message: checked.message });
            if (await handleTaken(checked.handle)) {
              throw new APIError("BAD_REQUEST", { message: HANDLE_TAKEN_MESSAGE });
            }
            return { data: { ...user, username: checked.handle } };
          }

          return { data: { ...user, username: await freeHandleFor(user.name) } };
        },
      },
    },
  },
  plugins: [nextCookies()],
});
