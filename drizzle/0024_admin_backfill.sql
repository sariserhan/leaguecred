-- An admin can record a lock against a match that has already been played.
--
-- Both of the rules this relaxes exist on purpose: a lock cannot be placed once
-- its match has started, and its timestamps are written by the trigger rather
-- than the caller, so a record cannot be backdated after the fact. That is what
-- makes an independent record mean anything.
--
-- The escape hatch is therefore deliberately narrow. It opens only for a
-- transaction that has set leaguecred.backfill itself, which no application path
-- does, and it relaxes exactly two things: the started-match check, and the
-- timestamps. Every other rule still holds — the fixture must belong to the
-- league, season and matchweek named, the team must be playing in it, the user
-- must already be an independent entrant, and one lock per league per day is
-- still the unique index's business.
create or replace function leaguecred_validate_pick_insert() returns trigger language plpgsql as $$
declare
  selected_matchweek matchweeks%rowtype;
  selected_fixture fixtures%rowtype;
  participation matchweek_participation%rowtype;
  backfilling boolean := coalesce(current_setting('leaguecred.backfill', true), '') = 'on';
begin
  select * into selected_fixture from fixtures where id = new.fixture_id for share;
  if not found or selected_fixture.league_id <> new.league_id or selected_fixture.season_id <> new.season_id then
    raise exception 'fixture is not eligible';
  end if;
  if selected_fixture.matchweek_id <> new.matchweek_id then raise exception 'pick does not match matchweek'; end if;
  if not backfilling and (selected_fixture.status <> 'scheduled' or clock_timestamp() >= selected_fixture.kickoff_at) then
    raise exception 'this match has already started';
  end if;
  if new.selected_team_id <> selected_fixture.home_team_id and new.selected_team_id <> selected_fixture.away_team_id then
    raise exception 'selected team is not part of fixture';
  end if;

  select * into selected_matchweek from matchweeks where id = new.matchweek_id for share;
  if not found then raise exception 'matchweek does not exist'; end if;
  if selected_matchweek.league_id <> new.league_id or selected_matchweek.season_id <> new.season_id then
    raise exception 'pick does not match matchweek';
  end if;

  select * into participation from matchweek_participation
    where user_id = new.user_id and league_id = new.league_id and matchweek_id = new.matchweek_id for update;
  if not found or participation.mode <> 'independent' then
    raise exception 'independent participation is required';
  end if;

  new.match_date := (selected_fixture.kickoff_at at time zone 'UTC')::date;
  if backfilling then
    -- Derived from the fixture rather than taken from the caller, so a
    -- backfilled row still reads as a lock placed before its own kickoff
    -- instead of one placed at an arbitrary time.
    new.submitted_at := selected_fixture.kickoff_at - interval '2 hours';
    new.locked_at := selected_fixture.kickoff_at;
    new.created_at := new.submitted_at;
    new.updated_at := clock_timestamp();
  else
    new.submitted_at := clock_timestamp(); new.locked_at := new.submitted_at;
    new.created_at := new.submitted_at; new.updated_at := new.submitted_at;
  end if;
  return new;
end;
$$;
