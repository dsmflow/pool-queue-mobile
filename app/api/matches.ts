import { supabase } from './supabase';
import { Match } from '../types/database.types';
import { TeamData, EnhancedMatch } from '../types/custom.types';

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
    const allPlayers = match.teams ? match.teams.reduce((acc: string[], team) => {
      if (team && team.players && Array.isArray(team.players)) {
        acc.push(...team.players);
      }
      return acc;
    }, []) : [];
    
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
    
    // Create a summary of the match for archiving (with safe access)
    // Align with the database schema which doesn't have a direct winner_team column
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
      metadata: {
        name: match.name || `Match ${matchId.substring(0, 8)}`,
        type: match.type || '8-ball',
        winner_team: winnerTeamName, // Store winner_team in metadata instead
        teams: match.teams && Array.isArray(match.teams) ? match.teams.map(team => ({
          name: team?.name || 'Unknown Team',
          type: team?.type || 'singles',
          players: team?.players && Array.isArray(team.players) ? team.players : []
        })) : []
      }
    };
    
    // Insert into match_archives
    const { error: archiveError } = await supabase
      .from('match_archives')
      .insert([matchSummary]);
    
    if (archiveError) throw archiveError;
    
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
