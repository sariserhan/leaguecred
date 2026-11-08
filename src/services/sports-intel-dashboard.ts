import postgres from "postgres";

import { serverEnv } from "@/lib/env";

/**
 * The private Sports Intel dashboard, a separate research project's page.
 *
 * Its daily run saves the rendered page into its own database, and this reads
 * the newest copy through a login that can see that one table and nothing
 * else. LeagueCred's own data never goes the other way.
 */
export type SportsIntelSnapshot =
  | { state: "ready"; html: string; builtAt: Date }
  | { state: "empty" }
  | { state: "unconfigured" };

let client: ReturnType<typeof postgres> | null = null;

export async function readSportsIntelDashboard(url = serverEnv.sportsIntelDashboardUrl): Promise<SportsIntelSnapshot> {
  if (!url) return { state: "unconfigured" };
  client ??= postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false });

  const [row] = await client<Array<{ html: string; built_at: Date }>>`
    select html, built_at from dashboard_snapshots order by built_at desc limit 1`;
  return row ? { state: "ready", html: row.html, builtAt: row.built_at } : { state: "empty" };
}

/**
 * The page carries licensed odds, so it is never cached, indexed or framed, and
 * its own inline script and styles are the only thing it may run.
 */
const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; " +
    // Logos, from the same hosts the site's own images use (next.config.ts).
    "img-src https://r2.thesportsdb.com https://www.thesportsdb.com https://media.api-sports.io https://crests.football-data.org https://upload.wikimedia.org https://a.espncdn.com; " +
    // The page's Run now button posts back to this site, and nowhere else.
    "form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

const NOTICES: Record<Exclude<SportsIntelSnapshot["state"], "ready">, string> = {
  unconfigured: "SPORTS_INTEL_DASHBOARD_URL is not set, so there is nothing to show.",
  empty: "No snapshot yet. The next Sports Intel daily run saves one.",
};

export function snapshotResponse(snapshot: SportsIntelSnapshot) {
  if (snapshot.state === "ready") return new Response(snapshot.html, { headers: HEADERS });

  const page = `<!doctype html><meta charset="utf-8"><title>Sports Intel</title><p style="font:15px system-ui;margin:40px">${NOTICES[snapshot.state]}</p>`;
  return new Response(page, { status: 503, headers: HEADERS });
}

const REPOSITORY = "sariserhan/sports-intel";
const WORKFLOW = "daily-collect.yml";

export type RunState = "started" | "busy" | "failed" | "too-soon" | "unconfigured";

/**
 * Starts Sports Intel's daily collection, unless a run is already going or queued.
 * The token is fine-grained to that one repository's Actions, so this is all it can do.
 */
export async function triggerSportsIntelRun(token = serverEnv.sportsIntelGithubToken, request: typeof fetch = fetch): Promise<RunState> {
  if (!token) return "unconfigured";
  const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" };
  const base = `https://api.github.com/repos/${REPOSITORY}/actions/workflows/${WORKFLOW}`;
  try {
    const recent = await request(`${base}/runs?per_page=5`, { headers, cache: "no-store" });
    if (!recent.ok) return "failed";
    const { workflow_runs: runs } = (await recent.json()) as { workflow_runs: Array<{ status: string }> };
    if (runs.some((run) => run.status !== "completed")) return "busy";
    const dispatched = await request(`${base}/dispatches`, { method: "POST", headers, body: JSON.stringify({ ref: "main" }) });
    return dispatched.status === 204 ? "started" : "failed";
  } catch (error) {
    console.error("Could not start the Sports Intel run.", error);
    return "failed";
  }
}

/** A form post from this site carries this site's origin; anything else was sent from elsewhere. */
export function isSameOrigin(headers: Headers) {
  const origin = headers.get("origin");
  const host = headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
