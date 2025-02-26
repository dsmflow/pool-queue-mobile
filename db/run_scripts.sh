#!/bin/bash

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "Error: psql is not installed. Please install PostgreSQL client tools."
    exit 1
fi

# Prompt for database connection details
read -p "Enter Supabase database URL (or leave empty to use Supabase dashboard): " DB_URL

if [ -z "$DB_URL" ]; then
    echo "Please follow these steps to run the scripts using the Supabase dashboard:"
    echo "1. Log in to your Supabase project dashboard"
    echo "2. Go to the SQL Editor"
    echo "3. Copy the contents of the SQL files and run them in the SQL Editor"
    echo ""
    echo "SQL files to run:"
    echo "- setup_match_archives.sql"
    echo "- fix_venue_uuid.sql"
    exit 0
fi

# Run the SQL scripts
echo "Running setup_match_archives.sql..."
psql "$DB_URL" -f setup_match_archives.sql

echo "Running fix_venue_uuid.sql..."
psql "$DB_URL" -f fix_venue_uuid.sql

echo "Database setup complete!"
