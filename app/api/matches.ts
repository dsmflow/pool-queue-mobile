import { supabase } from './supabase';
import { Match, Player } from '../types/database.types';
import { TeamData, EnhancedMatch, RatingChange, MatchMetadata } from '../types/custom.types';
import { sanitizeMatch, validateMatchScore, validateTeams, validateMetadata } from '../utils/validationUtils';

// Start a new match
export const startMatch = async (tableId: string, teams: TeamData[], raceTo: number = 1): Promise<Match> => {
  try {
    // Create a match name based on team names
    const matchName = `${teams[0]?.name || 'Team 1'} vs ${teams[1]?.name || 'Team 2'}`;
    
    // Create the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        table_id: tableId,
        teams,
        status: 'active',
        start_time: new Date().toISOString(),
        score: {
          current_score: [0, 0],
          games_to_win: raceTo // Use the provided raceTo value
        },
        metadata: {
          name: matchName,
          type: '8-ball'
        }
      })
      .select()
      .single();
    
    if (matchError) throw matchError;
    
    // Update table availability
    const { error: updateError } = await supabase
      .from('tables')
      .update({ is_available: false })
      .eq('id', tableId);
    
    if (updateError) throw updateError;
    
    return match as Match;
  } catch (error) {
    console.error('Error starting match:', error);
    throw error;
  }
};

// Fetch a match by ID
export const fetchMatch = async (matchId: string): Promise<EnhancedMatch | null> => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle(); // Use maybeSingle instead of single to handle 0 rows gracefully
    
    // If no match is found or there's an error
    if (error) {
      console.error('Database error fetching match:', error);
      throw error;
    }
    
    // If no match was found (not an error, just no data)
    if (!data) {
      console.log(`No match found with ID: ${matchId}`);
      return null;
    }
    
    // Get player details for the teams
    const match = data as Match;
    const validatedTeams = validateTeams(match.teams);
    
    // Get all player IDs from both teams
    const playerIds: string[] = [];
    validatedTeams.forEach(team => {
      if (team.players && Array.isArray(team.players)) {
        playerIds.push(...team.players);
      }
    });
    
    if (playerIds.length > 0) {
      // Fetch player details
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('id', playerIds);
      
      if (playersError) {
        console.error('Error fetching player details:', playersError);
        // Continue without player details rather than failing completely
      }
      
      // Use sanitizeMatch for proper type safety
      return sanitizeMatch(match, players || []);
    }
    
    // If no player details needed, still use sanitizeMatch
    return sanitizeMatch(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    throw error;
  }
};

// Update match score
export const updateMatchScore = async (matchId: string, score: number[]): Promise<void> => {
  try {
    // First get the current match to preserve games_to_win value
    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select('score')
      .eq('id', matchId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Validate and maintain the existing score structure
    const currentScore = validateMatchScore(match.score);
    
    const { error } = await supabase
      .from('matches')
      .update({
        score: {
          current_score: score,
          games_to_win: currentScore.games_to_win // Preserve existing value
        }
      })
      .eq('id', matchId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating match score:', error);
    throw error;
  }
};

// Update team types (stripes/solids)
export const updateTeamTypes = async (matchId: string, teams: TeamData[]): Promise<void> => {
  try {
    // Validate teams to ensure they match expected structure
    const validatedTeams = validateTeams(teams);
    
    const { error } = await supabase
      .from('matches')
      .update({
        teams: validatedTeams
      })
      .eq('id', matchId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating team types:', error);
    throw error;
  }
};

// End a match
export const endMatch = async (
  matchId: string, 
  tableId: string, 
  winnerTeamIndex: number = 0
): Promise<void> => {
  try {
    console.log(`[matches] Ending match ${matchId} on table ${tableId}, winner team index: ${winnerTeamIndex}`);
    
    // Get the match before updating it (we'll need the data for queue processing)
    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
      
    if (fetchError) {
      console.error('[matches] Error fetching match before ending:', fetchError);
      throw fetchError;
    }
    
    // Update match status
    const { error: matchError } = await supabase
      .from('matches')
      .update({
        status: 'completed',
        end_time: new Date().toISOString(),
        metadata: {
          ...match.metadata,
          winner_team_index: winnerTeamIndex
        }
      })
      .eq('id', matchId);
    
    if (matchError) {
      console.error('[matches] Error updating match status:', matchError);
      throw matchError;
    }
    
    // Process the queue for the next players
    console.log(`[matches] Triggering queue processing for table ${tableId}`);
    const { processQueueAfterMatch, notifyPlayerTurn } = require('./queueService');
    const queueResult = await processQueueAfterMatch(tableId, match, winnerTeamIndex);
    
    // Handle table availability based on whether the winner stays
    if (queueResult.tableAvailable) {
      console.log(`[matches] Making table ${tableId} available - winner not staying`);
      const { error: tableError } = await supabase
        .from('tables')
        .update({ is_available: true })
        .eq('id', tableId);
      
      if (tableError) {
        console.error('[matches] Error updating table availability:', tableError);
        throw tableError;
      }
    } else {
      console.log(`[matches] Keeping table ${tableId} unavailable - winner staying`);
    }
    
    // If there's a next player in queue, notify them
    if (queueResult.nextPlayer) {
      console.log(`[matches] Notifying next player ${queueResult.nextPlayer.player_id} for table ${tableId}`);
      await notifyPlayerTurn(queueResult.nextPlayer.player_id, tableId);
    }
    
    // Archive the match (keeping the existing logic)
    try {
      await archiveMatch(matchId);
    } catch (archiveError) {
      console.error('[matches] Error archiving match:', archiveError);
      // Continue even if archiving fails
    }
    
    console.log(`[matches] Successfully ended match ${matchId} on table ${tableId}`);
  } catch (error) {
    console.error('[matches] Error ending match:', error);
    throw error;
  }
};


// Update player ratings based on match results
export const updatePlayerRatings = async (
  players: string[], 
  winnerPlayerId: string | null,
  ratingChange: number = 5
): Promise<{
  updatedRatings: Record<string, RatingChange>;
}> => {
  // If no players or winner, return empty ratings
  if (!players || players.length === 0) {
    console.warn('updatePlayerRatings: No players provided');
    return { updatedRatings: {} };
  }
  
  if (!winnerPlayerId) {
    console.warn('updatePlayerRatings: No winner provided');
    return { updatedRatings: {} };
  }

  try {
    console.log(`Updating ratings for ${players.length} players. Winner: ${winnerPlayerId}`);
    
    // Filter out any invalid player IDs before database query
    const validPlayers = players.filter(id => typeof id === 'string' && id.length > 0);
    
    if (validPlayers.length === 0) {
      console.warn('No valid player IDs found');
      return { updatedRatings: {} };
    }
    
    // Fetch all players' current ratings
    const { data: playerData, error } = await supabase
      .from('players')
      .select('id, rating')
      .in('id', validPlayers);
    
    if (error) {
      console.error('Error fetching player ratings:', error);
      return { updatedRatings: {} }; // Return empty rather than throwing
    }
    
    if (!playerData || playerData.length === 0) {
      console.warn('No player records found for the given IDs');
      return { updatedRatings: {} };
    }
    
    // Create a map of all ratings (initial and calculated)
    const updatedRatings: Record<string, RatingChange> = {};
    const updates: {id: string, rating: number}[] = [];
    
    // Process each player
    for (const player of playerData) {
      // Skip if player data is malformed
      if (!player || !player.id) continue;
      
      const initialRating = player.rating || 1500;
      let finalRating = initialRating;
      
      // Winner gets positive points, loser gets negative
      if (player.id === winnerPlayerId) {
        finalRating = initialRating + ratingChange;
      } else {
        finalRating = Math.max(initialRating - ratingChange, 1000); // Ensure rating doesn't go below 1000
      }
      
      updatedRatings[player.id] = {
        initial: initialRating,
        final: finalRating
      };
      
      // Prepare update
      updates.push({
        id: player.id,
        rating: finalRating
      });
    }
    
    // Update player ratings in the database
    if (updates.length > 0) {
      console.log(`Updating ratings for ${updates.length} players`);
      
      // Process updates one by one to avoid issues with UPSERT constraints
      for (const update of updates) {
        try {
          // First check if the player exists
          const { data: existingPlayer, error: checkError } = await supabase
            .from('players')
            .select('id, name')
            .eq('id', update.id)
            .single();
            
          if (checkError) {
            console.error(`Error checking if player ${update.id} exists:`, checkError);
            continue; // Skip this player and move to the next
          }
          
          if (existingPlayer) {
            // Player exists, just update the rating
            const { error: updateError } = await supabase
              .from('players')
              .update({ rating: update.rating })
              .eq('id', update.id);
              
            if (updateError) {
              console.error(`Error updating rating for player ${update.id}:`, updateError);
            } else {
              console.log(`Successfully updated rating for player ${update.id} to ${update.rating}`);
            }
          } else {
            console.warn(`Cannot update rating for player ${update.id}: Player does not exist`);
          }
        } catch (err) {
          console.error(`Error processing rating update for player ${update.id}:`, err);
        }
      }
    } else {
      console.warn('No rating updates to apply');
    }
    
    return { updatedRatings };
    
  } catch (error) {
    console.error('Error in updatePlayerRatings:', error);
    // Return empty ratings instead of throwing to prevent cascading failures
    return { updatedRatings: {} };
  }
};

// Archive a match for historical reporting
export const archiveMatch = async (matchId: string): Promise<void> => {
  try {
    // First, get the match details
    const match = await fetchMatch(matchId);
    
    // If match is not found, it may already be archived or deleted
    if (!match) {
      console.log(`[matches] Match ${matchId} not found for archiving. It may already be archived.`);
      return;
    }
    
    // Get winner team index from metadata
    const winnerTeamIndex = match.metadata?.winner_team_index || 0;
    
    // Extract all player IDs from teams using validated teams structure
    const validatedTeams = validateTeams(match.teams);
    const allPlayers = validatedTeams.reduce((acc: string[], team) => {
      if (team.players) {
        acc.push(...team.players);
      }
      return acc;
    }, []);
    
    // Ensure we have at least one player ID (required by database NOT NULL constraint)
    if (allPlayers.length === 0) {
      console.warn('[matches] No players found for match, using placeholder player ID');
      allPlayers.push('00000000-0000-0000-0000-000000000000'); // Use a placeholder UUID
    }
    
    // Get validated score for safe access
    const validScore = validateMatchScore(match.score);
    const scores = validScore.current_score;
    
    // Get winner and loser teams
    const winnerTeam = validatedTeams[winnerTeamIndex];
    const loserTeam = validatedTeams[winnerTeamIndex === 0 ? 1 : 0];
    
    // Determine the winner player ID
    let winnerPlayerId = null;
    if (winnerTeam && winnerTeam.players && winnerTeam.players.length > 0) {
      winnerPlayerId = winnerTeam.players[0];
    }
    
    // Update player ratings and add the changes to metadata
    const ratingResults = await updatePlayerRatings(allPlayers, winnerPlayerId);
    
    // Create metadata using validation utility
    const metadata: MatchMetadata = {
      name: match.name || `Match ${matchId.substring(0, 8)}`,
      type: match.type || '8-ball',
      winner_team: winnerTeam?.name || 'Unknown Team',
      loser_team: loserTeam?.name || 'Unknown Team',
      winner_team_index: winnerTeamIndex,
      teams: validatedTeams.map(team => ({
        name: team.name,
        type: team.type,
        players: team.players
      })),
      rating_changes: ratingResults.updatedRatings
    };
    
    // Calculate duration
    const startTime = match.start_time || new Date().toISOString();
    const endTime = match.end_time || new Date().toISOString();
    const durationMinutes = calculateDurationMinutes(startTime, endTime);
    
    // Create the match summary with validated data
    const matchSummary = {
      match_id: matchId,
      table_id: match.table_id,
      players: allPlayers,
      final_score: scores,
      winner_player_id: winnerPlayerId,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      metadata: metadata,
      // Add the explicit fields for better querying
      winner_team: winnerTeam?.name || 'Unknown Team',
      loser_team: loserTeam?.name || 'Unknown Team',
      match_type: match.type || '8-ball'
    };
    
    // Insert into match_archives
    console.log('[matches] Saving match archive with data:', JSON.stringify({
      match_id: matchSummary.match_id,
      table_id: matchSummary.table_id,
      player_count: matchSummary.players.length,
      winner_id: matchSummary.winner_player_id
    }));
    
    const { error: archiveError } = await supabase
      .from('match_archives')
      .insert([matchSummary]);
    
    if (archiveError) {
      console.error('[matches] Error details while archiving match:', {
        error: archiveError,
        matchId,
        players: allPlayers
      });
      throw archiveError;
    }
    
    // Delete the original match
    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);
    
    if (deleteError) throw deleteError;
    
    console.log(`[matches] Successfully archived match ${matchId}`);
  } catch (error) {
    console.error('[matches] Error archiving match:', error);
    throw error;
  }
};

// Helper function to calculate duration in minutes
const calculateDurationMinutes = (startTime: string, endTime: string): number => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  return Math.round(durationMs / (1000 * 60)); // Convert ms to minutes
};

// Fetch active matches for a user
export const fetchActiveMatchesByUser = async (userId: string): Promise<{
  activeMatches: EnhancedMatch[];
  tableIds: string[];
  error?: any;
  staleData?: boolean;
}> => {
  if (!userId) {
    console.warn("[matches] fetchActiveMatchesByUser called with empty userId");
    return { activeMatches: [], tableIds: [] };
  }

  console.log(`[matches] Fetching active matches for user: ${userId}`);
  
  // Track if we're returning potentially stale data
  let staleData = false;

  try {
    // Get all active matches with timeout
    const fetchPromise = supabase
      .from('matches')
      .select('*')
      .eq('status', 'active');
    
    // Create a timeout promise - increased from 10s to 15s for better reliability
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database request timed out')), 15000);
    });
    
    let matches;
    let error;
    
    try {
      // Race the fetch against the timeout
      ({ data: matches, error } = await Promise.race([
        fetchPromise,
        timeoutPromise.then(() => ({ data: null, error: new Error('Fetch timed out') }))
      ]) as any);
    } catch (raceError) {
      console.error('[matches] Error in Promise.race for active matches:', raceError);
      error = raceError;
    }
    
    if (error) {
      console.error('[matches] Error fetching active matches:', error);
      // Instead of throwing, we'll return the error and empty arrays
      return { 
        activeMatches: [], 
        tableIds: [], 
        error,
        staleData: false
      };
    }

    if (!matches || matches.length === 0) {
      console.log('[matches] No active matches found for user');
      return { activeMatches: [], tableIds: [] };
    }
    
    console.log(`[matches] Found ${matches.length} total active matches, filtering for user ${userId}`)

    // Filter for matches where the user is a participant
    const userMatches = matches.filter(match => {
      try {
        // Use validateTeams for safer handling instead of type assertion
        const teams = validateTeams(match.teams);
        
        // Check if user is in any team's players array
        return teams.some(team => {
          if (!team.players || !Array.isArray(team.players)) return false;
          return team.players.includes(userId);
        });
      } catch (err) {
        console.warn(`[matches] Error validating teams for match ${match.id}:`, err);
        return false;
      }
    });

    if (userMatches.length === 0) {
      console.log(`[matches] No matches found for user ${userId}`);
      return { activeMatches: [], tableIds: [] };
    }

    console.log(`[matches] Found ${userMatches.length} matches for user ${userId}`);

    // Get player details for each match (handle potential failures)
    const enhancedMatchPromises = userMatches.map(async (match) => {
      try {
        console.log(`[matches] Fetching details for match ${match.id}`);
        return await fetchMatch(match.id);
      } catch (err) {
        console.warn(`[matches] Error fetching details for match ${match.id}:`, err);
        // We got a failure but still want to show something to the user
        staleData = true;
        
        // Return a basic version of the match with minimal data
        try {
          return sanitizeMatch({
            ...match,
            teams: match.teams || [],
            name: `Match #${match.id.substring(0, 8)}`,
            type: '8-ball',
            table_id: match.table_id
          } as Match);
        } catch (sanitizeErr) {
          console.error(`[matches] Error sanitizing fallback match data for ${match.id}:`, sanitizeErr);
          // If even sanitizing fails, return null and filter it out later
          return null;
        }
      }
    });
    
    console.log(`[matches] Waiting for ${enhancedMatchPromises.length} match detail promises to resolve`);
    
    // Use Promise.allSettled to handle potential failures in individual match fetching
    let matchResults;
    try {
      matchResults = await Promise.allSettled(enhancedMatchPromises);
    } catch (err) {
      console.error('[matches] Unexpected error in Promise.allSettled:', err);
      // Return what we know at this point - the basic match data
      staleData = true;
      const basicMatches = userMatches.map(match => ({
        ...match,
        teams: validateTeams(match.teams),
        name: `Match #${match.id.substring(0, 8)}`,
        type: '8-ball',
        table_id: match.table_id
      })) as EnhancedMatch[];
      
      const basicTableIds = basicMatches.map(match => match.table_id).filter(Boolean) as string[];
      
      return {
        activeMatches: basicMatches,
        tableIds: basicTableIds,
        staleData: true
      };
    }
    
    // Get all fulfilled results
    const validMatches = matchResults
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<EnhancedMatch>).value)
      .filter(match => match !== null) as EnhancedMatch[];
    
    console.log(`[matches] Got ${validMatches.length} valid matches out of ${matchResults.length} results`);
    
    const tableIds = validMatches.map(match => match.table_id).filter(Boolean) as string[];

    // Check if we lost any matches during processing and mark data as stale if so
    if (validMatches.length < userMatches.length) {
      console.warn(`[matches] Some matches failed to load properly - returning potentially stale data`);
      staleData = true;
    }

    return { 
      activeMatches: validMatches,
      tableIds,
      staleData
    };
  } catch (error) {
    console.error('[matches] Error finding user active matches:', error);
    // Instead of returning empty results, pass the error so UI can handle it
    return { 
      activeMatches: [], 
      tableIds: [],
      error,
      staleData: false
    };
  }
};

// Fetch player rating history from match archives
export const fetchPlayerRatingHistory = async (playerId: string): Promise<{
  history: {
    matchId: string;
    date: string;
    opponent: string | null;
    ratingBefore: number;
    ratingAfter: number;
    ratingChange: number;
    won: boolean;
  }[];
}> => {
  if (!playerId) {
    console.warn("fetchPlayerRatingHistory called with empty playerId");
    return { history: [] };
  }
  
  try {
    console.log(`Fetching rating history for player: ${playerId}`);
    
    // Get all match archives - we'll filter client-side for more flexibility
    const { data: matches, error } = await supabase
      .from('match_archives')
      .select('*')
      .order('end_time', { ascending: false });
    
    if (error) {
      console.error('Database error fetching matches:', error);
      throw error;
    }
    
    if (!matches || matches.length === 0) {
      console.log('No matches found in archive');
      return { history: [] };
    }
    
    console.log(`Found ${matches.length} total matches in archive`);
    
    // Process each match to extract rating history - with additional logging
    const history = matches
      .filter(match => {
        // First, check if player is in the match's players array
        const playerInMatch = Array.isArray(match.players) && 
                             match.players.some((id: any) => 
                               typeof id === 'string' && id === playerId
                             );
        
        if (!playerInMatch) {
          return false;
        }
        
        // Then check if rating_changes exists in metadata
        const metadata = match.metadata as any;
        const hasRatingChanges = metadata && 
                                 metadata.rating_changes && 
                                 metadata.rating_changes[playerId];
        
        if (!hasRatingChanges) {
          console.log(`Match ${match.id} has player but no rating changes`);
        }
        
        return hasRatingChanges;
      })
      .map(match => {
        const metadata = match.metadata as any;
        const ratingChange = metadata.rating_changes[playerId];
        const won = match.winner_player_id === playerId;
        
        // Find opponent name
        let opponentName: string | null = null;
        if (metadata.teams && Array.isArray(metadata.teams)) {
          // First find which team the player is on
          let playerTeamIndex = -1;
          for (let i = 0; i < metadata.teams.length; i++) {
            const team = metadata.teams[i];
            if (team.players && Array.isArray(team.players)) {
              if (team.players.includes(playerId)) {
                playerTeamIndex = i;
                break;
              }
            }
          }
          
          // Then get the opposing team name
          if (playerTeamIndex !== -1) {
            const opposingTeamIndex = playerTeamIndex === 0 ? 1 : 0;
            if (metadata.teams.length > opposingTeamIndex) {
              opponentName = metadata.teams[opposingTeamIndex].name;
            }
          }
        }
        
        return {
          matchId: match.match_id || match.id,
          date: match.end_time,
          opponent: opponentName,
          ratingBefore: ratingChange.initial,
          ratingAfter: ratingChange.final,
          ratingChange: ratingChange.final - ratingChange.initial,
          won
        };
      });
    
    console.log(`Filtered to ${history.length} matches with rating changes for player`);
    return { history };
    
  } catch (error) {
    console.error('Error fetching player rating history:', error);
    return { history: [] };  // Return empty array instead of throwing to prevent app crash
  }
};
