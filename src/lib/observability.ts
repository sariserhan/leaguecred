/**
 * One shape for every server-side failure.
 *
 * Vercel captures stdout and stderr as runtime logs, so a structured line is
 * queryable without an agent or a vendor. What it buys over a bare
 * `console.error` is that every failure can be found by one token, and that the
 * route and the digest travel with the message — a digest is all a streamed
 * error boundary leaves the browser holding, and without it in the log there is
 * nothing to match it against.
 */
export const SERVER_ERROR_TAG = "leaguecred.error";

export type ServerErrorEvent = {
  /** Where this came from: a request, a job, a step. */
  scope: string;
  message: string;
  /** React's identifier for an error it swallowed during a streamed render. */
  digest?: string;
  route?: string;
  method?: string;
  detail?: Record<string, unknown>;
};

/**
 * The error a server hands back is not always the one that was thrown — React
 * replaces it during a streamed render — so the digest matters as much as the
 * message, and neither is guaranteed to be on an Error at all.
 */
export function describeError(error: unknown): { message: string; digest?: string } {
  if (error instanceof Error) {
    const digest = "digest" in error ? error.digest : undefined;
    return {
      message: error.message || error.name,
      ...(digest ? { digest: String(digest) } : {}),
    };
  }

  if (typeof error === "string") return { message: error };
  return { message: JSON.stringify(error) ?? String(error) };
}

export function formatServerError(event: ServerErrorEvent): string {
  return `${SERVER_ERROR_TAG} ${JSON.stringify(event)}`;
}
