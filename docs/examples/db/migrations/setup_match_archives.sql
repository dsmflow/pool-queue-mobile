-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create match_archives table
CREATE TABLE IF NOT EXISTS public.match_archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL,
  table_id UUID NOT NULL,
  players JSONB NOT NULL, -- Array of player UUIDs who participated
  final_score JSONB,
  winner_player_id UUID, -- UUID of the winning player
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add comment to the table
COMMENT ON TABLE public.match_archives IS 'Stores archived match data for historical records';

-- Add RLS policies
ALTER TABLE public.match_archives ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can restrict this as needed)
CREATE POLICY "Allow all operations on match_archives" 
  ON public.match_archives 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Grant access to authenticated users
GRANT ALL ON public.match_archives TO authenticated;

-- Insert sample data (optional)
-- INSERT INTO public.match_archives (match_id, table_id, players, final_score, winner_player_id, start_time, end_time)
-- VALUES 
--   (uuid_generate_v4(), uuid_generate_v4(), '[{"name":"Player 1","id":"player1"},{"name":"Player 2","id":"player2"}]'::jsonb, 
--    '[2, 1]'::jsonb, 'player1', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');
