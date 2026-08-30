create or replace function leaguecred_protect_participation() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'matchweek participation is immutable'; end if;
  if new.user_id <> old.user_id or new.league_id <> old.league_id or new.matchweek_id <> old.matchweek_id
    or new.mode <> old.mode or new.created_at <> old.created_at then
    raise exception 'matchweek participation identity and mode are immutable';
  end if;
  if old.expert_picks_revealed_at is not null and new.expert_picks_revealed_at is distinct from old.expert_picks_revealed_at then
    raise exception 'expert pick reveal cannot be reversed or changed';
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger matchweek_participation_immutable before update or delete on matchweek_participation for each row execute function leaguecred_protect_participation();
--> statement-breakpoint
create or replace function leaguecred_validate_pick_insert() returns trigger language plpgsql as $$
declare selected_matchweek matchweeks%rowtype; selected_fixture fixtures%rowtype; participation matchweek_participation%rowtype;
begin
  select * into selected_matchweek from matchweeks where id = new.matchweek_id for share;
  if not found then raise exception 'matchweek does not exist'; end if;
  if selected_matchweek.league_id <> new.league_id or selected_matchweek.season_id <> new.season_id then raise exception 'pick does not match matchweek'; end if;
  if selected_matchweek.status <> 'upcoming' or clock_timestamp() >= selected_matchweek.lock_at then raise exception 'matchweek is locked'; end if;
  select * into selected_fixture from fixtures where id = new.fixture_id for share;
  if not found or selected_fixture.matchweek_id <> new.matchweek_id or selected_fixture.league_id <> new.league_id or selected_fixture.season_id <> new.season_id then raise exception 'fixture is not eligible'; end if;
  if new.selected_team_id <> selected_fixture.home_team_id and new.selected_team_id <> selected_fixture.away_team_id then raise exception 'selected team is not part of fixture'; end if;
  select * into participation from matchweek_participation where user_id = new.user_id and league_id = new.league_id and matchweek_id = new.matchweek_id for update;
  if not found or participation.mode <> 'independent' or participation.expert_picks_revealed_at is not null then raise exception 'independent participation is required before expert reveal'; end if;
  new.submitted_at := clock_timestamp(); new.locked_at := new.submitted_at; new.created_at := new.submitted_at; new.updated_at := new.submitted_at;
  return new;
end;
$$;
--> statement-breakpoint
create trigger picks_validate_before_insert before insert on picks for each row execute function leaguecred_validate_pick_insert();
--> statement-breakpoint
create or replace function leaguecred_reveal_after_pick() returns trigger language plpgsql as $$
begin
  update matchweek_participation set expert_picks_revealed_at = new.locked_at where user_id = new.user_id and league_id = new.league_id and matchweek_id = new.matchweek_id;
  return new;
end;
$$;
--> statement-breakpoint
create trigger picks_reveal_after_insert after insert on picks for each row execute function leaguecred_reveal_after_pick();
--> statement-breakpoint
create or replace function leaguecred_protect_pick() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'weekly locks cannot be deleted'; end if;
  if new.user_id <> old.user_id or new.league_id <> old.league_id or new.season_id <> old.season_id or new.matchweek_id <> old.matchweek_id
    or new.fixture_id <> old.fixture_id or new.selected_team_id <> old.selected_team_id or new.submitted_at <> old.submitted_at
    or new.locked_at <> old.locked_at or new.created_at <> old.created_at then raise exception 'weekly lock identity and selection are immutable'; end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger picks_immutable before update or delete on picks for each row execute function leaguecred_protect_pick();
--> statement-breakpoint
create or replace function leaguecred_validate_followed_pick() returns trigger language plpgsql as $$
declare source picks%rowtype; participation matchweek_participation%rowtype; selected_matchweek matchweeks%rowtype;
begin
  select * into source from picks where id = new.source_pick_id for share;
  if not found or source.league_id <> new.league_id or source.season_id <> new.season_id or source.matchweek_id <> new.matchweek_id then raise exception 'source pick does not match followed matchweek'; end if;
  if source.user_id = new.follower_user_id then raise exception 'users cannot follow their own pick'; end if;
  select * into selected_matchweek from matchweeks where id = new.matchweek_id for share;
  if selected_matchweek.status <> 'upcoming' or clock_timestamp() >= selected_matchweek.lock_at then raise exception 'matchweek is locked'; end if;
  select * into participation from matchweek_participation where user_id = new.follower_user_id and league_id = new.league_id and matchweek_id = new.matchweek_id for update;
  if not found or participation.mode <> 'follow' or participation.expert_picks_revealed_at is null then raise exception 'follow participation and expert reveal are required'; end if;
  new.followed_at := clock_timestamp(); new.created_at := new.followed_at;
  return new;
end;
$$;
--> statement-breakpoint
create trigger followed_picks_validate_before_insert before insert on followed_picks for each row execute function leaguecred_validate_followed_pick();
--> statement-breakpoint
create or replace function leaguecred_immutable_ledger() returns trigger language plpgsql as $$ begin raise exception 'settlement events are append-only'; end; $$;
--> statement-breakpoint
create trigger settlement_events_append_only before update or delete on settlement_events for each row execute function leaguecred_immutable_ledger();
