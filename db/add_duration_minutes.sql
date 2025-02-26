-- Add duration_minutes column to match_archives table
ALTER TABLE public.match_archives 
ADD COLUMN duration_minutes INTEGER DEFAULT 0;

-- Add comment to the column
COMMENT ON COLUMN public.match_archives.duration_minutes IS 'Duration of the match in minutes';

-- Update existing records to calculate duration_minutes
UPDATE public.match_archives
SET duration_minutes = EXTRACT(EPOCH FROM (end_time - start_time)) / 60
WHERE duration_minutes = 0;
