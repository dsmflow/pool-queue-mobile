create table public.queue_entries (
  id uuid not null default extensions.uuid_generate_v4 (),
  table_id uuid null,
  player_id uuid null,
  position integer not null,
  skipped boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint queue_entries_pkey primary key (id),
  constraint queue_entries_table_id_player_id_key unique (table_id, player_id),
  constraint queue_entries_player_id_fkey foreign KEY (player_id) references players (id) on delete CASCADE,
  constraint queue_entries_table_id_fkey foreign KEY (table_id) references tables (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists queue_entries_table_id_idx on public.queue_entries using btree (table_id) TABLESPACE pg_default;

create index IF not exists queue_entries_player_id_idx on public.queue_entries using btree (player_id) TABLESPACE pg_default;

create trigger reorder_queue_after_delete
after DELETE on queue_entries for EACH row
execute FUNCTION reorder_queue_positions ();

create trigger trigger_reorder_queue_positions
after DELETE on queue_entries for EACH row
execute FUNCTION reorder_queue_positions ();