import { Resend } from "resend";

import { emailSenders, supportReplyTo } from "@/lib/email-senders";
import { serverEnv } from "@/lib/env";

export type SendableMessage = {
  subject: string;
  html: string;
  text?: string;
  /** Defaults to the transactional identity when a caller does not choose one. */
  from?: string;
};

export type SendResult = { delivered: boolean; reason?: string };

let client: Resend | null = null;

function resendClient(apiKey: string) {
  client ??= new Resend(apiKey);
  return client;
}

/**
 * The one place the application sends mail.
 *
 * It never throws. Better Auth calls this while creating an account, so a mail
 * provider outage must not turn into a failed sign-up. Callers that would
 * rather fail loudly check `delivered` and raise their own error, which is what
 * the lock-reminder job does so a failed send is not recorded as sent.
 *
 * A real send only ever happens when actually running on Vercel. `vercel env
 * pull` routinely puts the real RESEND_API_KEY into .env.local for database
 * access, and gating on the key alone would turn every local `next dev` into a
 * live sender against production the moment that happens. So a local run
 * always takes the console-log fallback, key or no key; a deployed run without
 * a key logs an error instead of silently dropping the message.
 */
export async function sendEmail(
  to: string,
  message: SendableMessage,
  options: { idempotencyKey?: string } = {},
): Promise<SendResult> {
  const isDeployed = Boolean(process.env.VERCEL);

  if (!isDeployed || !serverEnv.resendApiKey) {
    if (isDeployed) {
      console.error(
        `RESEND_API_KEY is not set, so "${message.subject}" was not delivered to ${to}.`,
      );
      return { delivered: false, reason: "missing-api-key" };
    }

    console.info(
      `\n[email] ${message.subject}\n[email] to: ${to}\n[email] not running on Vercel, so nothing was sent.\n` +
        `${message.text ?? message.html}\n`,
    );
    return { delivered: false, reason: "development-log" };
  }

  try {
    // RESEND_FROM_EMAIL overrides every identity, for use while the domain is
    // still unverified and the account may only send as Resend's own sender.
    const from = serverEnv.resendFromEmail ?? message.from ?? emailSenders.transactional;

    const { error } = await resendClient(serverEnv.resendApiKey).emails.send(
      {
        from,
        replyTo: supportReplyTo,
        to: [to],
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
      },
      options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
    );

    if (error) {
      // Never log the provider body verbatim; it echoes the recipient address.
      console.error(`Resend rejected "${message.subject}": ${error.message}`);
      return { delivered: false, reason: error.name || "provider-error" };
    }

    return { delivered: true };
  } catch (error) {
    console.error("Resend request failed.", error);
    return { delivered: false, reason: "request-failed" };
  }
}
