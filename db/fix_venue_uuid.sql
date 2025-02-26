-- Check if there are any venues with non-UUID IDs
-- We select all venues for manual inspection
SELECT id FROM public.venues;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a new venue with proper UUID format if needed
INSERT INTO public.venues (id, name, address, metadata)
SELECT 
  uuid_generate_v4()::text, 
  'Default Venue', 
  '123 Main St', 
  '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.venues LIMIT 1);

-- This is the proper approach, but if ID 1 exists, it would need manual fixing:
-- 1. First create a new venue with a valid UUID
-- 2. Update all references to the old venue to use the new venue
-- 3. Then delete the old venue

-- Note: When running this script, if you still get errors, it means
-- we need to manually run the following steps in order (modify ids as needed):

/*
-- Step 1: Create a new venue with a valid UUID
INSERT INTO public.venues (id, name, address, metadata)
SELECT 
  uuid_generate_v4()::text,
  v.name,
  v.address,
  v.metadata
FROM (SELECT name, address, metadata FROM public.venues WHERE id::text = '1') v
RETURNING id;  -- Note the new UUID for use in step 2

-- Step 2: Update all references to old venue
UPDATE public.tables
SET venue_id = 'NEW_UUID_FROM_STEP_1'
WHERE venue_id::text = '1';

-- Step 3: Delete the old venue
DELETE FROM public.venues
WHERE id::text = '1';
*/
