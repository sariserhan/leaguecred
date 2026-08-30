import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail, verificationEmail } from "@/lib/email-templates";
import { requireBetterAuthSecret, serverEnv } from "@/lib/env";

export const auth = betterAuth({
  appName: "LeagueCred",
  baseURL: serverEnv.betterAuthUrl,
  secret: requireBetterAuthSecret(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    // Sign-in is deliberately not gated on verification. A Weekly Lock record
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
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});
