/**
 * Sender identities on the leaguecred.com domain, chosen per message so the
 * address itself tells the recipient what kind of mail arrived.
 *
 * All of them are answered by support@, set as Reply-To, so a reply from
 * someone who ignores "no-reply" still reaches a person instead of vanishing.
 *
 * Every address here has to exist on a domain verified in Resend. Until that is
 * done, set RESEND_FROM_EMAIL to override all of them with a sender the
 * account is allowed to use.
 */
export const emailSenders = {
  /** Security and account mail that must not invite a reply. */
  transactional: "LeagueCred <no-reply@leaguecred.com>",
  /** The first message a new account receives. */
  welcome: "LeagueCred <welcome@leaguecred.com>",
  /** Recurring product mail the user can expect on a schedule. */
  notification: "LeagueCred <notification@leaguecred.com>",
} as const;

export const supportReplyTo = "support@leaguecred.com";
