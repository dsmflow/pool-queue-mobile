-- Fix RLS policies for the matches table

-- First, let's add policies for INSERT operations

-- Allow all authenticated users to insert matches
CREATE POLICY "Allow authenticated users to insert matches" 
ON matches 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Next, add policies for SELECT operations

-- Allow admins to view all matches
CREATE POLICY "Allow admins to view all matches" 
ON matches 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM players 
    WHERE players.id = auth.uid() 
    AND players.is_admin = TRUE
  )
);

-- Allow users to view matches they're participating in
CREATE POLICY "Allow users to view their own matches" 
ON matches 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM players
    CROSS JOIN jsonb_array_elements(matches.teams) AS team
    CROSS JOIN jsonb_array_elements_text(team->'players') AS player_id
    WHERE players.id = auth.uid()
    AND player_id = players.id::text
  )
);

-- Allow users to view active matches (for joining games)
CREATE POLICY "Allow users to view active matches" 
ON matches 
FOR SELECT 
TO authenticated 
USING (status = 'active');

-- Add DELETE policies

-- Allow admins to delete matches
CREATE POLICY "Allow admins to delete matches" 
ON matches 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM players 
    WHERE players.id = auth.uid() 
    AND players.is_admin = TRUE
  )
);

-- If you need to troubleshoot, you can temporarily disable RLS
-- Uncomment the following line to disable RLS for testing
-- ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
