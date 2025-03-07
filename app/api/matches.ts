import { supabase } from './supabase';
import { Match } from '../types/database.types';
import { TeamData, EnhancedMatch, RatingChange, MatchMetadata } from '../types/custom.types';

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
    const matchTeams = match.teams as TeamData[];
    
    // Get all player IDs from both teams
    const playerIds: string[] = [];
    if (matchTeams && Array.isArray(matchTeams)) {
      matchTeams.forEach(team => {
        if (team.players && Array.isArray(team.players)) {
          playerIds.push(...team.players);
        }
      });
    }
    
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
      
      if (players && players.length > 0) {
        // Create a map of player IDs to player objects
        const playerMap = players.reduce((map, player) => {
          map[player.id] = player;
          return map;
        }, {} as Record<string, any>);
        
        // Add player details to match teams
        return {
          ...match,
          teams: matchTeams.map(team => ({
            ...team,
            playerDetails: team.players.map(playerId => playerMap[playerId] || null).filter(Boolean)
          })),
          name: (match.metadata as any)?.name || `Match #${match.id.substring(0, 8)}`,
          type: (match.metadata as any)?.type || '8-ball'
        };
      }
    }
    
    return {
      ...match,
      teams: matchTeams || [],
      name: (match.metadata as any)?.name || `Match #${match.id.substring(0, 8)}`,
      type: (match.metadata as any)?.type || '8-ball'
    } as unknown as EnhancedMatch;
  } catch (error) {
    console.error('Error fetching match:', error);
    throw error;
  }
};

// Update match score
export const updateMatchScore = async (matchId: string, score: number[]): Promise<void> => {
  try {
    const { error } = await supabase
      .from('matches')
      .update({
        score: {
          current_score: score,
          games_to_win: 2 // Default value, could be made configurable
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
    const { error } = await supabase
      .from('matches')
      .update({
        teams
      })
      .eq('id', matchId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating team types:', error);
    throw error;
  }
};

// End a match
export const endMatch = async (matchId: string, tableId: string): Promise<void> => {
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
  } catch (error) {
    console.error('Error ending match:', error);
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
      console.log(`Match ${matchId} not found for archiving. It may already be archived.`);
      return;
    }
    
    // Extract all player IDs from teams (safely handling undefined)
    let allPlayers = match.teams ? match.teams.reduce((acc: string[], team) => {
      if (team && team.players && Array.isArray(team.players)) {
        acc.push(...team.players);
      }
      return acc;
    }, []) : [];
    
    // Ensure we have at least one player ID (required by database NOT NULL constraint)
    if (allPlayers.length === 0) {
      console.warn('No players found for match, using placeholder player ID');
      allPlayers = ['00000000-0000-0000-0000-000000000000']; // Use a placeholder UUID
    }
    
    // Determine the winner based on scores (with safe access)
    let winnerPlayerId = null;
    let winnerTeamName = null;
    
    if (match.score && Array.isArray(match.score.current_score)) {
      const scores = match.score.current_score;
      
      if (scores.length >= 2 && match.teams && match.teams.length > 0) {
        if (scores[0] > scores[1] && match.teams[0]?.players?.length > 0) {
          // First team won, use the first player from that team
          winnerPlayerId = match.teams[0].players[0];
          winnerTeamName = match.teams[0].name || 'Team 1';
        } else if (scores[1] > scores[0] && match.teams.length > 1 && match.teams[1]?.players?.length > 0) {
          // Second team won, use the first player from that team
          winnerPlayerId = match.teams[1].players[0];
          winnerTeamName = match.teams[1].name || 'Team 2';
        }
      }
    }
    
    // Update player ratings
    const ratingResults = await updatePlayerRatings(allPlayers, winnerPlayerId);
    
    // Create a summary of the match for archiving (with safe access)
    // Align with the database schema which doesn't have a direct winner_team column
    // Ensure we have valid team data
    const safeTeams = [];
    if (match.teams && Array.isArray(match.teams)) {
      for (let i = 0; i < match.teams.length; i++) {
        const team = match.teams[i];
        safeTeams.push({
          name: team?.name || `Team ${i+1}`,  // Ensure a name always exists
          type: team?.type || 'singles',
          players: team?.players && Array.isArray(team.players) ? team.players : []
        });
      }
    }
    
    // If we still have no teams, create defaults
    if (safeTeams.length === 0) {
      safeTeams.push(
        { name: 'Team 1', type: 'singles', players: [] },
        { name: 'Team 2', type: 'singles', players: [] }
      );
    }
    
    const metadata: MatchMetadata = {
      name: match.name || `Match ${matchId.substring(0, 8)}`,
      type: match.type || '8-ball',
      winner_team: winnerTeamName || 'Unknown Team', // Ensure winner_team is never null
      teams: safeTeams,
      rating_changes: ratingResults.updatedRatings // Store rating changes in metadata
    };
    
    const matchSummary = {
      match_id: matchId,
      table_id: match.table_id || null,
      players: allPlayers,
      final_score: match.score?.current_score || [0, 0],
      winner_player_id: winnerPlayerId,
      start_time: match.start_time || new Date().toISOString(),
      end_time: match.end_time || new Date().toISOString(),
      duration_minutes: calculateDurationMinutes(
        match.start_time || new Date().toISOString(), 
        match.end_time || new Date().toISOString()
      ),
      metadata: metadata
    };
    
    // Insert into match_archives
    console.log('Saving match archive with data:', JSON.stringify({
      match_id: matchSummary.match_id,
      table_id: matchSummary.table_id,
      player_count: matchSummary.players.length,
      winner_id: matchSummary.winner_player_id
    }));
    
    const { error: archiveError } = await supabase
      .from('match_archives')
      .insert([matchSummary]);
    
    if (archiveError) {
      console.error('Error details while archiving match:', {
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
    
    // Update table availability status - important when admin clears a match remotely
    if (match.table_id) {
      const { error: tableError } = await supabase
        .from('tables')
        .update({ is_available: true })
        .eq('id', match.table_id);
      
      if (tableError) {
        console.error('Error updating table availability:', tableError);
        // Continue even if this fails to ensure the match gets archived
      }
    }
    
  } catch (error) {
    console.error('Error archiving match:', error);
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
