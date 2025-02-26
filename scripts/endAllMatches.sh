#!/bin/bash

# Change to the project root directory
cd "$(dirname "$0")/.."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create a .env file with your Supabase credentials."
  exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js to run this script."
  exit 1
fi

# Install required dependencies if they don't exist
if [ ! -d "node_modules/@supabase/supabase-js" ]; then
  echo "Installing required dependencies..."
  npm install @supabase/supabase-js dotenv
fi

# Run the script
echo "Running script to end all active matches..."
node scripts/endAllMatches.js

# Exit with the script's exit code
exit $?
