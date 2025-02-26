# Database Setup and Fixes

This directory contains SQL scripts to set up and fix database-related issues.

## Issues Fixed

1. **Missing `match_archives` Table**: The application uses a table called `match_archives` for storing historical match data, but this table doesn't exist in the database.

2. **Invalid UUID Format**: The application is trying to use a numeric ID ("1") as a UUID, which is causing format errors.

## How to Apply These Fixes

### Using the Supabase Dashboard

1. Log in to your Supabase project dashboard
2. Go to the SQL Editor
3. Copy the contents of the SQL files and run them in the SQL Editor

### Using the Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db execute --file=./db/setup_match_archives.sql
supabase db execute --file=./db/fix_venue_uuid.sql
```

## Scripts

- `setup_match_archives.sql`: Creates the missing `match_archives` table with the correct structure
- `fix_venue_uuid.sql`: Fixes the UUID format issue by ensuring venues have proper UUID values

## Verification

After running these scripts, the following errors should be resolved:

- `relation "public.match_archives" does not exist`
- `invalid input syntax for type uuid: "1"`
