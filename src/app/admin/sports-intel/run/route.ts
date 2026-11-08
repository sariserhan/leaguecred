import { sqlClient } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { recordAdminAudit } from "@/services/admin-audit-log";
import { isSameOrigin, triggerSportsIntelRun, type RunState } from "@/services/sports-intel-dashboard";

/** A second press inside this window is refused, so a double click cannot start two runs. */
const MIN_INTERVAL_MINUTES = 10;

const back = (request: Request, state: RunState) => Response.redirect(new URL(`/admin/sports-intel?run=${state}`, request.url), 303);

// Authorization runs first, so a member learns nothing and starts nothing.
export async function POST(request: Request) {
  const viewer = await requireAdmin();
  if (!isSameOrigin(request.headers)) return new Response("Refused: send this from the admin page.", { status: 403 });

  const [recent] = await sqlClient<Array<{ count: number }>>`
    select count(*)::int as count from admin_audit_log
    where action = 'sports_intel_run_started' and created_at > now() - make_interval(mins => ${MIN_INTERVAL_MINUTES})`;
  if ((recent?.count ?? 0) > 0) return back(request, "too-soon");

  const state = await triggerSportsIntelRun();
  if (state === "started") {
    await sqlClient.begin((sql) => recordAdminAudit(sql, { actorUserId: viewer.id, action: "sports_intel_run_started", target: "sariserhan/sports-intel", before: null, after: { workflow: "daily-collect.yml" } }));
  }
  return back(request, state);
}
