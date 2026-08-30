import { serverEnv } from "@/lib/env";
import type { EmailMessage } from "@/lib/email-templates";

type SendResult = { delivered: boolean; reason?: string };

/**
 * Sends through the Resend HTTP API. No SDK: one POST is cheaper than a
 * dependency, and the payload shape is stable.
 *
 * Without RESEND_API_KEY this never throws. Better Auth calls these senders
 * while creating an account, so throwing here would turn a mail-provider
 * outage into a failed sign-up. Outside production the link is logged instead,
 * which keeps the whole recovery flow testable locally with no provider at all.
 */
export async function sendEmail(to: string, message: EmailMessage): Promise<SendResult> {
  if (!serverEnv.resendApiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        `RESEND_API_KEY is not set, so "${message.subject}" was not delivered to ${to}. ` +
          "Account recovery is unavailable until it is configured.",
      );
      return { delivered: false, reason: "missing-api-key" };
    }

    console.info(
      `\n[email] ${message.subject}\n[email] to: ${to}\n[email] no RESEND_API_KEY, so nothing was sent.\n` +
        `${message.text}\n`,
    );
    return { delivered: false, reason: "development-log" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: serverEnv.resendFromEmail,
        to: [to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      // Never log the body verbatim at info level; it can echo the address.
      console.error(`Resend rejected "${message.subject}" with status ${response.status}.`);
      return { delivered: false, reason: `http-${response.status}` };
    }

    return { delivered: true };
  } catch (error) {
    console.error("Resend request failed.", error);
    return { delivered: false, reason: "request-failed" };
  }
}
