/**
 * Pure builders so the wording and the links can be tested without a mail
 * provider. Nothing here touches the network.
 */

export type EmailMessage = {
  subject: string;
  text: string;
  html: string;
};

function layout(heading: string, body: string, actionUrl: string, actionLabel: string) {
  return `<!doctype html>
<html lang="en"><body style="margin:0;background:#ffffff;color:#0f172a;font-family:Inter,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <p style="margin:0 0 32px;font-size:22px;font-weight:800;letter-spacing:-0.02em;text-transform:uppercase">LeagueCred</p>
    <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:800">${heading}</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569">${body}</p>
    <p style="margin:0 0 32px">
      <a href="${actionUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 24px;font-weight:700">${actionLabel}</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b">If the button does not work, paste this link into your browser:</p>
    <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;color:#64748b">${actionUrl}</p>
  </div>
</body></html>`;
}

export function passwordResetEmail(input: { name: string; url: string }): EmailMessage {
  const greeting = input.name ? `${input.name}, ` : "";
  const body =
    "Use the link below to choose a new password. It expires in one hour and can only be used once. " +
    "Your Weekly Lock record is not affected.";

  return {
    subject: "Reset your LeagueCred password",
    text:
      `${greeting}use this link to choose a new LeagueCred password:\n\n${input.url}\n\n` +
      "The link expires in one hour and can only be used once. " +
      "If you did not ask for a reset you can ignore this message; your password stays as it is.",
    html: layout(
      "Choose a new password",
      `${greeting}${body}`,
      input.url,
      "Reset password",
    ),
  };
}

export function verificationEmail(input: { name: string; url: string }): EmailMessage {
  const greeting = input.name ? `${input.name}, ` : "";
  const body =
    "Confirm this address so your record stays recoverable. A verified address is the only way " +
    "back into an account, and a Weekly Lock record cannot be rebuilt.";

  return {
    subject: "Confirm your LeagueCred address",
    text:
      `${greeting}confirm your LeagueCred address with this link:\n\n${input.url}\n\n` +
      "A verified address is the only way back into your account, and a Weekly Lock record cannot be rebuilt.",
    html: layout("Confirm your address", `${greeting}${body}`, input.url, "Confirm address"),
  };
}
