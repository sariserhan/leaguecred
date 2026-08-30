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
 * Without RESEND_API_KEY the behaviour depends on the environment: production
 * logs an error and sends nothing, while everywhere else the message is written
 * to the log with its link, so the whole flow works locally with no provider.
 */
export async function sendEmail(
  to: string,
  message: SendableMessage,
  options: { idempotencyKey?: string } = {},
): Promise<SendResult> {
  if (!serverEnv.resendApiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        `RESEND_API_KEY is not set, so "${message.subject}" was not delivered to ${to}.`,
      );
      return { delivered: false, reason: "missing-api-key" };
    }

    console.info(
      `\n[email] ${message.subject}\n[email] to: ${to}\n[email] no RESEND_API_KEY, so nothing was sent.\n` +
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
