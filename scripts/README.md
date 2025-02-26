# Pool Queue Scripts

This directory contains utility scripts for managing the Pool Queue application.

## End All Matches Script

The `endAllMatches.js` script is used to end all active matches in the system. This can be useful for:

- Resetting the system at the end of the day
- Fixing the system state if matches were left open accidentally
- Preparing for maintenance or updates

### Prerequisites

- Node.js installed
- `.env` file in the project root with Supabase credentials:
  ```
  EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  ```

### How to Use

You can run the script in two ways:

1. **Using the shell script (recommended):**
   ```bash
   ./scripts/endAllMatches.sh
   ```
   This will automatically check for dependencies and install them if needed.

2. **Directly with Node.js:**
   ```bash
   # From the project root directory
   node scripts/endAllMatches.js
   ```
   Note: You'll need to manually install dependencies if they're not already installed:
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

### What the Script Does

1. Fetches all active matches from the database
2. For each match:
   - Updates the match status to 'completed'
   - Sets the end time to the current time
   - Makes the associated table available again
   - Archives the match for historical reporting
3. Logs the results of each operation

### Troubleshooting

If you encounter any issues:

- Make sure your `.env` file contains the correct Supabase credentials (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY)
- Check that you have sufficient permissions in Supabase to update the tables
- Review the console output for specific error messages
