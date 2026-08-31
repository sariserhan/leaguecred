-- A lock is now one call per day rather than one per week. A player may hold
-- several at once — one for today, one for tomorrow — but only ever one per
-- league per date, and each closes when its own match kicks off.
--
-- The date is derived in UTC from the fixture, and set by the trigger rather
-- than taken from the caller, so it always names the day the match is played.
alter table picks add column if not exists match_date date;
--> statement-breakpoint
alter table followed_picks add column if not exists match_date date;
--> statement-breakpoint
update picks p set match_date = (f.kickoff_at at time zone 'UTC')::date
  from fixtures f where f.id = p.fixture_id and p.match_date is null;
--> statement-breakpoint
update followed_picks fp set match_date = (f.kickoff_at at time zone 'UTC')::date
  from picks p join fixtures f on f.id = p.fixture_id
  where p.id = fp.source_pick_id and fp.match_date is null;
--> statement-breakpoint
alter table picks alter column match_date set not null;
--> statement-breakpoint
alter table followed_picks alter column match_date set not null;
--> statement-breakpoint
-- One call per league per day, replacing one per league per week.
drop index if exists picks_user_league_matchweek_unique;
--> statement-breakpoint
create unique index if not exists picks_user_league_date_unique
  on picks (user_id, league_id, match_date);
--> statement-breakpoint
drop index if exists followed_picks_follower_league_matchweek_unique;
--> statement-breakpoint
create unique index if not exists followed_picks_follower_league_date_unique
  on followed_picks (follower_user_id, league_id, match_date);
--> statement-breakpoint
create index if not exists picks_user_league_date_idx on picks (user_id, league_id, match_date);
--> statement-breakpoint
-- The deadline moves from the week's first kickoff to the match's own, and the
-- reveal stops standing in for the one-per-week rule: it used to reject a second
-- pick because the first had already revealed the week's expert calls, which is
-- exactly what has to be allowed now. One per day is the unique index's job.
create or replace function leaguecred_validate_pick_insert() returns trigger language plpgsql as $$
declare selected_matchweek matchweeks%rowtype; selected_fixture fixtures%rowtype; participation matchweek_participation%rowtype;
begin
  select * into selected_fixture from fixtures where id = new.fixture_id for share;
  if not found or selected_fixture.league_id <> new.league_id or selected_fixture.season_id <> new.season_id then
    raise exception 'fixture is not eligible';
  end if;
  if selected_fixture.matchweek_id <> new.matchweek_id then raise exception 'pick does not match matchweek'; end if;
  if selected_fixture.status <> 'scheduled' or clock_timestamp() >= selected_fixture.kickoff_at then
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
  new.submitted_at := clock_timestamp(); new.locked_at := new.submitted_at;
  new.created_at := new.submitted_at; new.updated_at := new.submitted_at;
  return new;
end;
$$;
--> statement-breakpoint
create or replace function leaguecred_protect_pick() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'a daily lock cannot be deleted'; end if;
  if new.user_id <> old.user_id or new.league_id <> old.league_id or new.season_id <> old.season_id
    or new.matchweek_id <> old.matchweek_id or new.match_date <> old.match_date
    or new.fixture_id <> old.fixture_id or new.selected_team_id <> old.selected_team_id
    or new.submitted_at <> old.submitted_at or new.locked_at <> old.locked_at or new.created_at <> old.created_at then
    raise exception 'a daily lock identity and selection are immutable';
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create or replace function leaguecred_validate_followed_pick() returns trigger language plpgsql as $$
declare source picks%rowtype; participation matchweek_participation%rowtype; source_fixture fixtures%rowtype;
begin
  select * into source from picks where id = new.source_pick_id for share;
  if not found or source.league_id <> new.league_id or source.season_id <> new.season_id or source.matchweek_id <> new.matchweek_id then
    raise exception 'source pick does not match followed matchweek';
  end if;
  if source.user_id = new.follower_user_id then raise exception 'users cannot follow their own pick'; end if;

  select * into source_fixture from fixtures where id = source.fixture_id for share;
  if not found or clock_timestamp() >= source_fixture.kickoff_at then
    raise exception 'this match has already started';
  end if;

  select * into participation from matchweek_participation
    where user_id = new.follower_user_id and league_id = new.league_id and matchweek_id = new.matchweek_id for update;
  if not found or participation.mode <> 'follow' or participation.expert_picks_revealed_at is null then
    raise exception 'follow participation and expert reveal are required';
  end if;

  new.match_date := source.match_date;
  new.followed_at := clock_timestamp(); new.created_at := new.followed_at;
  return new;
end;
$$;
--> statement-breakpoint
-- The reveal marks the moment a player first committed for the week, and the
-- participation row treats it as write-once. With one lock a week that was the
-- same event; with several, every later lock tried to move it and was refused by
-- the immutability rule. It is set only while still unset.
create or replace function leaguecred_reveal_after_pick() returns trigger language plpgsql as $$
begin
  update matchweek_participation set expert_picks_revealed_at = new.locked_at
    where user_id = new.user_id and league_id = new.league_id and matchweek_id = new.matchweek_id
      and expert_picks_revealed_at is null;
  return new;
end;
$$;
