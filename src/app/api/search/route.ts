import { NextRequest, NextResponse } from "next/server";

import { sqlClient } from "@/db";
import { rateLimitActor, withinRateLimit } from "@/services/rate-limit";

export type GlobalSearchResult = { id: string; type: "League" | "Club" | "Specialist"; label: string; detail: string; href: string };

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] satisfies GlobalSearchResult[] });

  // Every other rate-limited path here is a server action behind a session.
  // This one is open to anyone, so the actor is the caller's address: reading
  // the session instead would put an auth lookup in front of every keystroke
  // to protect a query that is cheaper than the lookup.
  if (!(await withinRateLimit("globalSearch", await rateLimitActor()))) {
    return NextResponse.json(
      { results: [] satisfies GlobalSearchResult[], message: "Too many searches. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const needle = `%${query}%`;
  const rows = await sqlClient<GlobalSearchResult[]>`
    select l.id::text, 'League'::text as type, l.name as label, c.name as detail, '/leagues/' || l.slug as href
    from leagues l join countries c on c.id = l.country_id
    where l.enabled = true and (l.name ilike ${needle} or c.name ilike ${needle})
    union all
    select t.id::text, 'Club'::text, t.name, coalesce(c.name, 'Football club'), '/teams/' || t.slug
    from teams t left join countries c on c.id = t.country_id where t.name ilike ${needle}
    union all
    select u.id, 'Specialist'::text, u.name, count(r.id)::text || ' league record' || case when count(r.id) = 1 then '' else 's' end, '/specialists/' || u.id
    from "user" u join user_league_records r on r.user_id = u.id and r.settled_picks > 0
    where u.name ilike ${needle}
    group by u.id, u.name
    limit 18`;
  return NextResponse.json({ results: rows }, { headers: { "Cache-Control": "private, max-age=30" } });
}
