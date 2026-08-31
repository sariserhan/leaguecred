-- Replace technical provider round labels with readable league week names.
with numbered as (
  select mw.id,
    l.name || ' — Week ' || row_number() over (
      partition by mw.league_id, mw.season_id
      order by mw.start_at, mw.id
    ) as display_name
  from matchweeks mw
  join leagues l on l.id = mw.league_id
)
update matchweeks mw
set display_name = numbered.display_name,
    updated_at = now()
from numbered
where mw.id = numbered.id;
