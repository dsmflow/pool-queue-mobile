create table public.matches (
  id uuid not null default extensions.uuid_generate_v4 (),
  table_id uuid null,
  start_time timestamp with time zone null default now(),
  end_time timestamp with time zone null,
  status text not null default 'active'::text,
  teams jsonb not null,
  score jsonb null default '{}'::jsonb,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint matches_pkey primary key (id),
  constraint matches_table_id_fkey foreign KEY (table_id) references tables (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists matches_table_id_idx on public.matches using btree (table_id) TABLESPACE pg_default;