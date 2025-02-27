create table public.venues (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  address text null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint venues_pkey primary key (id)
) TABLESPACE pg_default;