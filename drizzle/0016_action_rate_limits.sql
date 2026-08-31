-- A fixed window per actor and action. One row per pair, updated in place, so
-- the table cannot grow with traffic the way a log of attempts would — which
-- matters because the thing being defended against is volume.
create table if not exists action_rate_limits (
  actor text not null,
  action text not null,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0,
  primary key (actor, action)
);
