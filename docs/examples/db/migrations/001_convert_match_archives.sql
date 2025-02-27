-- Create a backup of the existing table
create table if not exists public.match_archives_backup as
select * from public.match_archives;

-- Drop existing table
drop table if exists public.match_archives;

-- Create new table structure
create table public.match_archives (
  id uuid not null default extensions.uuid_generate_v4(),
  match_id uuid not null,
  table_id uuid not null,
  players jsonb not null,
  final_score jsonb null,
  winner_player_id uuid null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  archived_at timestamp with time zone null default now(),
  metadata jsonb null default '{}'::jsonb,
  duration_minutes integer null default 0,
  constraint match_archives_pkey primary key (id),
  constraint match_archives_winner_player_id_fkey foreign key (winner_player_id) references players (id) on delete set null
);

-- Migrate data from backup to new format
insert into public.match_archives (
  id,
  match_id,
  table_id,
  players,
  final_score,
  winner_player_id,
  start_time,
  end_time,
  archived_at,
  metadata,
  duration_minutes
)
select
  id,
  match_id,
  table_id,
  (
    select jsonb_agg(player_id)
    from jsonb_array_elements(teams) team,
         jsonb_array_elements_text(team->>'players') player_id
  ) as players,
  final_score,
  (
    case
      when winner_team is not null then
        (
          select player_id::uuid
          from jsonb_array_elements(teams) team,
               jsonb_array_elements_text(team->>'players') player_id
          where team->>'name' = winner_team
          limit 1
        )
      else null
    end
  ) as winner_player_id,
  start_time,
  end_time,
  archived_at,
  metadata,
  duration_minutes
from public.match_archives_backup;

-- Add indexes for common queries
create index if not exists match_archives_winner_player_id_idx on public.match_archives using btree (winner_player_id) TABLESPACE pg_default;
create index if not exists match_archives_players_gin_idx on public.match_archives using gin (players) TABLESPACE pg_default;

-- Keep the backup table for safety, can be dropped later if everything works
-- drop table public.match_archives_backup;
