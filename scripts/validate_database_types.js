/**
 * Database Type Validation Script
 * 
 * This script validates that all data in the database conforms to the expected format.
 * Run this before applying schema constraints to identify any data that needs to be fixed.
 * 
 * Usage: node validate_database_types.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase setup
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Validates match score format
 */
function validateScore(score) {
  if (!score) return false;
  
  // Check if it has the expected structure
  if (typeof score !== 'object') return false;
  if (!Array.isArray(score.current_score)) return false;
  if (score.current_score.length !== 2) return false;
  if (typeof score.games_to_win !== 'number') return false;
  
  return true;
}

/**
 * Validates team structure
 */
function validateTeams(teams) {
  if (!teams) return false;
  if (!Array.isArray(teams)) return false;
  if (teams.length < 1) return false;
  
  // Check each team
  for (const team of teams) {
    if (typeof team !== 'object') return false;
    if (typeof team.name !== 'string') return false;
    if (!Array.isArray(team.players)) return false;
  }
  
  return true;
}

/**
 * Main validation function
 */
async function validateDatabase() {
  console.log('Starting database validation...');
  
  // --- Validate matches table ---
  console.log('\nValidating matches...');
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('*');
    
  if (matchError) {
    console.error('Error fetching matches:', matchError);
    return;
  }
  
  let validScoreCount = 0;
  let invalidScoreCount = 0;
  let validTeamsCount = 0;
  let invalidTeamsCount = 0;
  
  for (const match of matches) {
    // Validate score
    if (validateScore(match.score)) {
      validScoreCount++;
    } else {
      invalidScoreCount++;
      console.log(`Invalid score in match ${match.id}:`, match.score);
    }
    
    // Validate teams
    if (validateTeams(match.teams)) {
      validTeamsCount++;
    } else {
      invalidTeamsCount++;
      console.log(`Invalid teams in match ${match.id}:`, match.teams);
    }
  }
  
  console.log(`Score validation: ${validScoreCount} valid, ${invalidScoreCount} invalid`);
  console.log(`Teams validation: ${validTeamsCount} valid, ${invalidTeamsCount} invalid`);
  
  // --- Validate match_archives table ---
  console.log('\nValidating match_archives...');
  const { data: archives, error: archiveError } = await supabase
    .from('match_archives')
    .select('*');
    
  if (archiveError) {
    console.error('Error fetching archives:', archiveError);
    return;
  }
  
  let validMetadataCount = 0;
  let invalidMetadataCount = 0;
  
  for (const archive of archives) {
    // Validate metadata
    if (archive.metadata && typeof archive.metadata === 'object') {
      validMetadataCount++;
    } else {
      invalidMetadataCount++;
      console.log(`Invalid metadata in archive ${archive.id}:`, archive.metadata);
    }
    
    // Check if specific fields are missing
    if (archive.metadata) {
      if (!archive.metadata.rating_changes) {
        console.log(`Missing rating_changes in archive ${archive.id}`);
      }
      if (!archive.metadata.winner_team) {
        console.log(`Missing winner_team in archive ${archive.id}`);
      }
    }
  }
  
  console.log(`Metadata validation: ${validMetadataCount} valid, ${invalidMetadataCount} invalid`);
  
  // --- Generate fixes ---
  if (invalidScoreCount > 0 || invalidTeamsCount > 0 || invalidMetadataCount > 0) {
    console.log('\nGenerating fix suggestions...');
    
    if (invalidScoreCount > 0) {
      console.log(`
-- Fix invalid scores:
UPDATE matches
SET score = jsonb_build_object(
  'current_score', jsonb_build_array(0, 0),
  'games_to_win', 3
)
WHERE id IN (
  -- List problematic match IDs here
);`);
    }
    
    if (invalidTeamsCount > 0) {
      console.log(`
-- Fix invalid teams:
UPDATE matches
SET teams = jsonb_build_array(
  jsonb_build_object('name', 'Team 1', 'players', '[]'::jsonb, 'type', 'undecided'),
  jsonb_build_object('name', 'Team 2', 'players', '[]'::jsonb, 'type', 'undecided')
)
WHERE id IN (
  -- List problematic match IDs here
);`);
    }
    
    if (invalidMetadataCount > 0) {
      console.log(`
-- Fix invalid metadata:
UPDATE match_archives
SET metadata = '{}'::jsonb
WHERE id IN (
  -- List problematic archive IDs here
);`);
    }
  }
  
  console.log('\nValidation complete!');
}

// Run the validation
validateDatabase()
  .catch(console.error)
  .finally(() => process.exit());