-- Comprehensive fix for Row Level Security issues

-- 1. First, drop any existing policies on the matches table to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to insert matches" ON matches;
DROP POLICY IF EXISTS "Allow admins to view all matches" ON matches;
DROP POLICY IF EXISTS "Allow users to view their own matches" ON matches;
DROP POLICY IF EXISTS "Allow users to view active matches" ON matches;
DROP POLICY IF EXISTS "Allow admins to delete matches" ON matches;
DROP POLICY IF EXISTS "admin_update_matches" ON matches;
DROP POLICY IF EXISTS "user_update_own_matches" ON matches;

-- 2. Create a temporary function to check if a user is in a match
CREATE OR REPLACE FUNCTION public.user_is_in_match(match_row matches)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM jsonb_array_elements(match_row.teams) AS team
    CROSS JOIN jsonb_array_elements_text(team->'players') AS player_id
    WHERE player_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a temporary function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM players 
    WHERE players.id = auth.uid() 
    AND players.is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create comprehensive RLS policies

-- INSERT: Allow all authenticated users to insert matches
CREATE POLICY "matches_insert_policy" 
ON matches 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- SELECT: Allow users to view matches they're in or that are active, or if they're an admin
CREATE POLICY "matches_select_policy" 
ON matches 
FOR SELECT 
TO authenticated 
USING (
  user_is_in_match(matches.*) OR 
  status = 'active' OR 
  user_is_admin()
);

-- UPDATE: Allow users to update their own matches or if they're an admin
CREATE POLICY "matches_update_policy" 
ON matches 
FOR UPDATE 
TO authenticated 
USING (
  user_is_in_match(matches.*) OR 
  user_is_admin()
);

-- DELETE: Only allow admins to delete matches
CREATE POLICY "matches_delete_policy" 
ON matches 
FOR DELETE 
TO authenticated 
USING (user_is_admin());

-- 5. If you need to troubleshoot, you can temporarily disable RLS
-- Uncomment the following line to disable RLS for testing
-- ALTER TABLE matches DISABLE ROW LEVEL SECURITY;

-- 6. Make sure RLS is enabled
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
