/**
 * Pure builders so the wording, the links, and the shell can be tested without
 * a mail provider. Nothing here touches the network.
 *
 * Email clients are not browsers: no oklch, no CSS variables, no external
 * stylesheet in most of them, and Outlook renders through Word, which ignores
 * max-width on a div. So the palette below is the hex equivalent of the tokens
 * in globals.css, every rule is inlined, and the layout is a centred table.
 */

import { emailSenders } from "@/lib/email-senders";
import { escapeHtml } from "@/lib/escape-html";

const token = {
  background: "#ffffff",
  foreground: "#050d1c",
  primary: "#b2df00",
  primaryForeground: "#050d1c",
  secondary: "#f1f4f7",
  mutedForeground: "#575e69",
  border: "#c5cbd2",
} as const;

/** Every message is this wide, so the set looks like one family in an inbox. */
export const EMAIL_WIDTH = 560;

const headingFont = "'Barlow Condensed','Arial Narrow',Arial,Helvetica,sans-serif";
const bodyFont = "Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export type EmailMessage = {
  subject: string;
  text: string;
  html: string;
  /** Which identity this kind of message goes out as. */
  from: string;
};

type LayoutInput = {
  /** Shown in the inbox list next to the subject. */
  preheader: string;
  heading: string;
  body: string;
  actionUrl: string;
  actionLabel: string;
  footnote: string;
};

function layout(input: LayoutInput) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet">
<style>
  @media only screen and (max-width:600px){
    .shell{width:100%!important}
    .gutter{padding-left:24px!important;padding-right:24px!important}
    .display{font-size:34px!important}
    .cta{display:block!important;text-align:center!important}
  }
</style>
</head>
<body style="margin:0;padding:0;width:100%;background:${token.secondary};color:${token.foreground};font-family:${bodyFont};-webkit-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">${input.preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${token.secondary}">
    <tr>
      <td align="center" style="padding:32px 12px">
        <table role="presentation" class="shell" cellpadding="0" cellspacing="0" border="0" width="${EMAIL_WIDTH}" style="width:${EMAIL_WIDTH}px;max-width:${EMAIL_WIDTH}px;background:${token.background};border:1px solid ${token.border}">
          <tr>
            <td class="gutter" style="padding:32px 40px 0">
              <p style="margin:0;font-family:${headingFont};font-size:26px;line-height:1;font-weight:800;letter-spacing:-0.02em;text-transform:uppercase;color:${token.foreground}">League<span style="color:${token.primary}">Cred</span></p>
            </td>
          </tr>
          <tr>
            <td class="gutter" style="padding:24px 40px 0">
              <h1 class="display" style="margin:0;font-family:${headingFont};font-size:42px;line-height:0.95;font-weight:800;letter-spacing:-0.03em;text-transform:uppercase;color:${token.foreground}">${input.heading}</h1>
            </td>
          </tr>
          <tr>
            <td class="gutter" style="padding:20px 40px 0">
              <p style="margin:0;font-size:16px;line-height:1.6;color:${token.mutedForeground}">${input.body}</p>
            </td>
          </tr>
          <tr>
            <td class="gutter" style="padding:28px 40px 0">
              <a class="cta" href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:${token.primary};color:${token.primaryForeground};text-decoration:none;padding:14px 28px;font-size:15px;font-weight:700;border-radius:5px">${input.actionLabel}</a>
            </td>
          </tr>
          <tr>
            <td class="gutter" style="padding:28px 40px 0">
              <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${token.mutedForeground}">If the button does not work, paste this link into your browser:</p>
              <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all"><a href="${escapeHtml(input.actionUrl)}" style="color:${token.foreground}">${escapeHtml(input.actionUrl)}</a></p>
            </td>
          </tr>
          <tr>
            <td class="gutter" style="padding:28px 40px 32px">
              <div style="border-top:1px solid ${token.border};padding-top:20px">
                <p style="margin:0;font-size:13px;line-height:1.6;color:${token.mutedForeground}">${input.footnote}</p>
              </div>
            </td>
          </tr>
        </table>
        <table role="presentation" class="shell" cellpadding="0" cellspacing="0" border="0" width="${EMAIL_WIDTH}" style="width:${EMAIL_WIDTH}px;max-width:${EMAIL_WIDTH}px">
          <tr>
            <td class="gutter" style="padding:16px 40px 0;text-align:center">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${token.mutedForeground}">LeagueCred — one near-certain call from the league you know.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function passwordResetEmail(input: { name: string; url: string }): EmailMessage {
  const greeting = input.name ? `${input.name}, ` : "";
  const htmlGreeting = input.name ? `${escapeHtml(input.name)}, ` : "";
  const body =
    "Use the button below to choose a new password. The link expires in one hour and can only be " +
    "used once. Your Weekly Lock record is not affected.";

  return {
    subject: "Reset your LeagueCred password",
    from: emailSenders.transactional,
    text:
      `${greeting}use this link to choose a new LeagueCred password:\n\n${input.url}\n\n` +
      "The link expires in one hour and can only be used once. " +
      "If you did not ask for a reset you can ignore this message; your password stays as it is.",
    html: layout({
      preheader: "Choose a new password. The link expires in one hour.",
      heading: "Choose a new password",
      body: `${htmlGreeting}${body}`,
      actionUrl: input.url,
      actionLabel: "Reset password",
      footnote:
        "If you did not ask for a reset you can ignore this message and your password stays as it is.",
    }),
  };
}

export function verificationEmail(input: { name: string; url: string }): EmailMessage {
  const greeting = input.name ? `${input.name}, ` : "";
  const htmlGreeting = input.name ? `${escapeHtml(input.name)}, ` : "";
  const body =
    "Confirm this address so your account stays recoverable. A verified address is the only way " +
    "back in, and a Weekly Lock record cannot be rebuilt.";

  return {
    subject: "Confirm your LeagueCred address",
    from: emailSenders.welcome,
    text:
      `${greeting}confirm your LeagueCred address with this link:\n\n${input.url}\n\n` +
      "A verified address is the only way back into your account, and a Weekly Lock record cannot be rebuilt.",
    html: layout({
      preheader: "Confirm your address so your record stays recoverable.",
      heading: "Confirm your address",
      body: `${htmlGreeting}${body}`,
      actionUrl: input.url,
      actionLabel: "Confirm address",
      footnote:
        "If you did not create a LeagueCred account you can ignore this message and nothing else happens.",
    }),
  };
}

export function specialistLockedEmail(input: {
  name: string;
  specialistName: string;
  leagueName: string;
  matchweekName: string;
  lockAt: string;
  url: string;
}): EmailMessage {
  const greeting = input.name ? `${input.name}, ` : "";
  const htmlGreeting = input.name ? `${escapeHtml(input.name)}, ` : "";
  const where = `${input.leagueName} · ${input.matchweekName}`;
  const htmlWhere = `${escapeHtml(input.leagueName)} · ${escapeHtml(input.matchweekName)}`;
  const specialist = escapeHtml(input.specialistName);
  const closes = escapeHtml(input.lockAt);

  return {
    subject: `${input.specialistName} just locked their ${input.leagueName} call`,
    from: emailSenders.notification,
    text:
      `${greeting}${input.specialistName} just made their independent Weekly Lock for ${where}. ` +
      `Reveal specialist calls before locks close ${input.lockAt} to see it.\n\n${input.url}\n\n` +
      "Revealing specialist calls forfeits your own independent record for this matchweek.",
    html: layout({
      preheader: "A specialist you follow just locked in. See their call before it closes.",
      heading: "A specialist just locked in",
      body:
        `${htmlGreeting}${specialist} just made their independent Weekly Lock for ${htmlWhere}. ` +
        `Reveal specialist calls before locks close ${closes} to see it.`,
      actionUrl: input.url,
      actionLabel: "See specialist calls",
      footnote: "Revealing specialist calls forfeits your own independent record for this matchweek.",
    }),
  };
}

export function lockReminderEmail(input: {
  name: string;
  leagueName: string;
  matchweekName: string;
  lockAt: string;
  url: string;
}): EmailMessage {
  const greeting = input.name ? `${input.name}, ` : "";
  const htmlGreeting = input.name ? `${escapeHtml(input.name)}, ` : "";
  const where = `${input.leagueName} · ${input.matchweekName}`;
  const htmlWhere = `${escapeHtml(input.leagueName)} · ${escapeHtml(input.matchweekName)}`;
  const closes = escapeHtml(input.lockAt);

  return {
    subject: `Your ${input.leagueName} Weekly Lock closes ${input.lockAt}`,
    from: emailSenders.notification,
    text:
      `${greeting}you have not made your independent Weekly Lock for ${where}. ` +
      `Locks close ${input.lockAt}.\n\n${input.url}\n\n` +
      "One call, locked for good. Miss the deadline and the matchweek simply passes.",
    html: layout({
      preheader: `Locks close ${input.lockAt}. One independent call.`,
      heading: "Your lock closes soon",
      body:
        `${htmlGreeting}you have not made your independent Weekly Lock for ${htmlWhere}. ` +
        `Locks close ${closes}.`,
      actionUrl: input.url,
      actionLabel: "Make your pick",
      footnote:
        "One call, locked for good. Miss the deadline and the matchweek simply passes; nothing is deducted.",
    }),
  };
}
