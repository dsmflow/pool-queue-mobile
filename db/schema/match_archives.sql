-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Drop existing policies if they exist
drop policy if exists "Enable read access for all users" on public.match_archives;
drop policy if exists "Enable insert for authenticated users" on public.match_archives;
drop policy if exists "Enable delete for authenticated users who were in the match" on public.match_archives;

-- Drop and recreate the table
drop table if exists public.match_archives;

create table public.match_archives (
  id uuid not null default uuid_generate_v4(),
  match_id uuid not null,
  table_id uuid not null,
  players jsonb not null, -- Array of player UUIDs who participated
  final_score jsonb null,
  winner_player_id uuid null, -- UUID of the winning player
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  archived_at timestamp with time zone null default now(),
  metadata jsonb null default '{}'::jsonb,
  duration_minutes integer null default 0,
  constraint match_archives_pkey primary key (id),
  constraint match_archives_winner_player_id_fkey foreign key (winner_player_id) references players (id) on delete set null
) TABLESPACE pg_default;

-- Add indexes for common queries
create index if not exists match_archives_winner_player_id_idx on public.match_archives using btree (winner_player_id) TABLESPACE pg_default;
create index if not exists match_archives_players_gin_idx on public.match_archives using gin (players) TABLESPACE pg_default;

-- Enable Row Level Security
alter table public.match_archives enable row level security;

-- Create policies
create policy "Enable read access for all users"
  on public.match_archives
  for select
  using (true);

-- For now, we'll allow all authenticated users to insert and delete
-- Later we can add more specific policies if needed
create policy "Enable insert for all users"
  on public.match_archives
  for insert
  with check (true);

create policy "Enable delete for all users"
  on public.match_archives
  for delete
  using (true);