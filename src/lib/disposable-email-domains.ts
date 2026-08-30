/**
 * A curated list of common disposable/throwaway email domains, not an
 * exhaustive one. Good enough to stop casual multi-account abuse at signup;
 * a determined attacker with their own domain is out of scope for this check.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
  "dispostable.com",
  "mailnesia.com",
  "fakeinbox.com",
  "maildrop.cc",
  "mintemail.com",
  "moakt.com",
]);

export function isDisposableEmailDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").at(-1);
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
}
