// Script to end all active matches
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to fetch all active matches
async function fetchActiveMatches() {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'active')
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching active matches:', error);
    throw error;
  }
}

// Function to end a match
async function endMatch(matchId, tableId) {
  try {
    // Update match status
    const { error: matchError } = await supabase
      .from('matches')
      .update({
        status: 'completed',
        end_time: new Date().toISOString()
      })
      .eq('id', matchId);
    
    if (matchError) throw matchError;
    
    // Update table availability
    const { error: tableError } = await supabase
      .from('tables')
      .update({ is_available: true })
      .eq('id', tableId);
    
    if (tableError) throw tableError;
    
    console.log(`Match ${matchId} ended successfully`);
  } catch (error) {
    console.error(`Error ending match ${matchId}:`, error);
    throw error;
  }
}

// Function to archive a match
async function archiveMatch(matchId) {
  try {
    // First, get the match details
    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Determine the winner based on scores
    let winnerIndex = -1;
    if (match.score && Array.isArray(match.score.current_score)) {
      const scores = match.score.current_score;
      if (scores[0] > scores[1]) {
        winnerIndex = 0;
      } else if (scores[1] > scores[0]) {
        winnerIndex = 1;
      }
    }
    
    // Create a summary of the match for archiving
    const matchSummary = {
      match_id: matchId,
      table_id: match.table_id,
      teams: match.teams,
      final_score: match.score?.current_score || [0, 0],
      winner_team: winnerIndex >= 0 ? match.teams[winnerIndex].name : 'Draw',
      start_time: match.start_time,
      end_time: match.end_time || new Date().toISOString(),
      archived_at: new Date().toISOString()
    };
    
    // Store in match_archives table
    const { error } = await supabase
      .from('match_archives')
      .insert(matchSummary);
    
    if (error) {
      console.error('Error archiving match:', error);
      // We don't throw here to prevent disrupting the main flow if archiving fails
    } else {
      console.log(`Match ${matchId} archived successfully`);
    }
  } catch (error) {
    console.error(`Error archiving match ${matchId}:`, error);
    // We don't throw here to prevent disrupting the main flow if archiving fails
  }
}

// Main function to end all matches
async function endAllMatches() {
  try {
    console.log('Fetching active matches...');
    const activeMatches = await fetchActiveMatches();
    
    if (activeMatches.length === 0) {
      console.log('No active matches found.');
      return;
    }
    
    console.log(`Found ${activeMatches.length} active matches. Ending all matches...`);
    
    // End and archive each match
    for (const match of activeMatches) {
      try {
        await endMatch(match.id, match.table_id);
        await archiveMatch(match.id);
        console.log(`Successfully processed match ${match.id}`);
      } catch (error) {
        console.error(`Failed to process match ${match.id}:`, error);
        // Continue with other matches even if one fails
      }
    }
    
    console.log('All matches have been processed.');
  } catch (error) {
    console.error('Error ending all matches:', error);
  }
}

// Run the script
endAllMatches().then(() => {
  console.log('Script execution completed.');
}).catch(error => {
  console.error('Script execution failed:', error);
}).finally(() => {
  // Exit the process when done
  process.exit(0);
});
