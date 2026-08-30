/**
 * Better Auth rejects a request whose Origin does not match its baseURL.
 *
 * leaguecred.com redirects to www.leaguecred.com, so the browser origin is the
 * www host while BETTER_AUTH_URL may hold the apex. Trusting both removes a
 * failure that depends on which spelling of the domain someone typed, and adds
 * the Vercel preview host so previews can sign in too.
 */
export function resolveTrustedOrigins(input: {
  baseUrl: string;
  vercelUrl?: string;
  vercelProductionUrl?: string;
}): string[] {
  const origins = new Set<string>();

  const add = (value: string | undefined) => {
    if (!value) return;
    const withScheme = value.startsWith("http") ? value : `https://${value}`;
    try {
      const url = new URL(withScheme);
      origins.add(url.origin);

      const host = url.hostname;
      // Only pair a real apex with its www; never widen a deeper subdomain, and
      // never invent www.localhost.
      if (host.includes(".") && host.split(".").length <= 3) {
        const sibling = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
        origins.add(`${url.protocol}//${sibling}${url.port ? `:${url.port}` : ""}`);
      }
    } catch {
      // An unparseable value contributes nothing rather than breaking startup.
    }
  };

  add(input.baseUrl);
  add(input.vercelUrl);
  add(input.vercelProductionUrl);

  return [...origins];
}
