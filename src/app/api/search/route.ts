import { NextRequest, NextResponse } from "next/server";

import { sqlClient } from "@/db";

export type GlobalSearchResult = { id: string; type: "League" | "Club" | "Specialist"; label: string; detail: string; href: string };

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] satisfies GlobalSearchResult[] });
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
