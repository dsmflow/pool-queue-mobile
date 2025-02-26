create table public.tables (
  id uuid not null default extensions.uuid_generate_v4 (),
  venue_id uuid null,
  name text not null,
  type text not null,
  is_available boolean null default true,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint tables_pkey primary key (id),
  constraint tables_venue_id_fkey foreign KEY (venue_id) references venues (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists tables_venue_id_idx on public.tables using btree (venue_id) TABLESPACE pg_default;