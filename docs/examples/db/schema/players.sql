-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

create table public.players (
  id uuid not null default uuid_generate_v4(),
  name text not null,
  email text null,
  rating integer null default 1500,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  is_admin boolean null default false,
  constraint players_pkey primary key (id),
  constraint players_email_key unique (email)
) TABLESPACE pg_default;

create index IF not exists idx_players_is_admin on public.players using btree (is_admin) TABLESPACE pg_default;