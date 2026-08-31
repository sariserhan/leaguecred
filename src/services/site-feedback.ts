import { sqlClient } from "@/db";
import { toIsoTimestamp } from "@/lib/timestamps";

export type SiteFeedbackEntry = {
  id: string;
  email: string | null;
  userName: string | null;
  message: string;
  createdAt: string;
};

export type SiteFeedbackByKind = {
  bug: SiteFeedbackEntry[];
  contact: SiteFeedbackEntry[];
  support: SiteFeedbackEntry[];
};

async function feedbackByKind(kind: "bug" | "contact" | "support"): Promise<SiteFeedbackEntry[]> {
  const rows = await sqlClient<Array<{
    id: string; email: string | null; user_name: string | null; message: string; created_at: Date | string;
  }>>`
    select f.id, f.email, u.name as user_name, f.message, f.created_at
    from site_feedback f
    left join "user" u on u.id = f.user_id
    where f.kind = ${kind}
    order by f.created_at desc
    limit 25`;
  return rows.map((row) => ({
    id: row.id, email: row.email, userName: row.user_name,
    message: row.message, createdAt: toIsoTimestamp(row.created_at),
  }));
}

/** The most recent bug reports, contact messages, and support requests from
 * the footer, newest first - read-only, for an admin to triage by hand. */
export async function getSiteFeedback(): Promise<SiteFeedbackByKind> {
  const [bug, contact, support] = await Promise.all([
    feedbackByKind("bug"),
    feedbackByKind("contact"),
    feedbackByKind("support"),
  ]);
  return { bug, contact, support };
}
