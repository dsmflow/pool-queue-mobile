-- Add is_admin column to players table
ALTER TABLE players ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Create an index for faster queries
CREATE INDEX idx_players_is_admin ON players(is_admin);

-- Update specific users to be admins (replace with actual user IDs)
UPDATE players 
SET is_admin = TRUE 
WHERE id IN ('00000000-0000-0000-0000-000000000001');

-- Add RLS policy to restrict admin actions
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to update any match
CREATE POLICY admin_update_matches ON matches 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM players 
    WHERE players.id = auth.uid() 
    AND players.is_admin = TRUE
  )
);

-- Policy to allow regular users to update only their own matches
CREATE POLICY user_update_own_matches ON matches 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM players
    CROSS JOIN jsonb_array_elements(matches.teams) AS team
    CROSS JOIN jsonb_array_elements_text(team->'players') AS player_id
    WHERE players.id = auth.uid()
    AND player_id = players.id::text
  )
);
