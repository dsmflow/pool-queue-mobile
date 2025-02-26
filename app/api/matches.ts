import { supabase } from './supabase';
import { Match } from '../types/database.types';
import { TeamData, EnhancedMatch } from '../types/custom.types';

// Start a new match
export const startMatch = async (tableId: string, teams: TeamData[]): Promise<Match> => {
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
          games_to_win: 2
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
export const fetchMatch = async (matchId: string): Promise<EnhancedMatch> => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    
    if (error) throw error;
    
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
      
      if (playersError) throw playersError;
      
      if (players) {
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
    
    // Extract all player IDs from teams
    const allPlayers = match.teams.reduce((acc: string[], team) => {
      if (team.players && Array.isArray(team.players)) {
        acc.push(...team.players);
      }
      return acc;
    }, []);
    
    // Create a summary of the match for archiving
    const matchSummary = {
      match_id: matchId,
      table_id: match.table_id,
      players: allPlayers,
      final_score: match.score?.current_score || [0, 0],
      winner_player_id: winnerIndex >= 0 ? allPlayers[winnerIndex] : null,
      start_time: match.start_time,
      end_time: new Date().toISOString(),
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
    
  } catch (error) {
    console.error('Error archiving match:', error);
    throw error;
  }
};
