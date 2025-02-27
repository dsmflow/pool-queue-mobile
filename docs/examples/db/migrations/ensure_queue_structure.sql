-- Ensure the queue_entries table has the right structure
CREATE TABLE IF NOT EXISTS public.queue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    skipped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (table_id, player_id)
);

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS queue_entries_table_id_idx ON public.queue_entries(table_id);
CREATE INDEX IF NOT EXISTS queue_entries_player_id_idx ON public.queue_entries(player_id);

-- Ensure this table has RLS (Row Level Security) policies for fine-grained access control
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all authenticated users to read queue entries
DROP POLICY IF EXISTS "Queue entries are viewable by everyone" ON public.queue_entries;
CREATE POLICY "Queue entries are viewable by everyone" 
ON public.queue_entries FOR SELECT 
USING (true);

-- Create a policy that allows all authenticated users to insert/update/delete their own queue entries
DROP POLICY IF EXISTS "Users can manage their own queue entries" ON public.queue_entries;
CREATE POLICY "Users can manage their own queue entries" 
ON public.queue_entries FOR ALL
USING (true);

-- Add a trigger to automatically reorder queue positions when an entry is removed
CREATE OR REPLACE FUNCTION public.reorder_queue_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- Update positions for remaining entries in the same queue
    UPDATE public.queue_entries
    SET position = position - 1
    WHERE table_id = OLD.table_id
      AND position > OLD.position;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'reorder_queue_after_delete'
    ) THEN
        CREATE TRIGGER reorder_queue_after_delete
        AFTER DELETE ON public.queue_entries
        FOR EACH ROW
        EXECUTE FUNCTION public.reorder_queue_positions();
    END IF;
END $$;
