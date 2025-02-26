import { supabase } from './supabase';
import { Table, Match, QueueEntry, Player } from '../types/database.types';
import { EnhancedMatch, TeamData, TableWithDetails, PlayerWithDetails } from '../types/custom.types';

// Fetch all tables for a venue
export const fetchVenueTables = async (venueId: string) => {
  try {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('venue_id', venueId)
      .order('name');
    
    if (error) throw error;
    
    return data as Table[];
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw error;
  }
};

// Fetch a single table with its current match and queue
export const fetchTableWithDetails = async (tableId: string): Promise<TableWithDetails> => {
  try {
    // Get table info
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .single();
    
    if (tableError) throw tableError;
    
    // Get current active match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('table_id', tableId)
      .eq('status', 'active')
      .maybeSingle();
    
    if (matchError) throw matchError;
    
    // Get queue
    const { data: queue, error: queueError } = await supabase
      .from('queue_entries')
      .select('*, player:players(*)')
      .eq('table_id', tableId)
      .order('position', { ascending: true });
    
    if (queueError) throw queueError;
    
    // If we have a match, get player details for both teams
    let matchWithPlayerDetails: EnhancedMatch | null = null;
    if (match) {
      // Get all player IDs from both teams
      const playerIds: string[] = [];
      const matchTeams = Array.isArray(match.teams) 
        ? (match.teams as unknown as TeamData[]) 
        : [];
      
      if (matchTeams.length > 0) {
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
        
        if (!playersError && players) {
          // Create a map of player IDs to player objects
          const playerMap = players.reduce((map, player) => {
            map[player.id] = player;
            return map;
          }, {} as Record<string, Player>);
          
          // Add player details to match teams
          matchWithPlayerDetails = {
            ...match,
            teams: matchTeams.map(team => ({
              ...team,
              playerDetails: team.players.map(playerId => playerMap[playerId] || null).filter(Boolean)
            })),
            score: typeof match.score === 'object' && match.score !== null
              ? {
                  current_score: Array.isArray((match.score as any).current_score) 
                    ? (match.score as any).current_score 
                    : [0, 0],
                  games_to_win: typeof (match.score as any).games_to_win === 'number' 
                    ? (match.score as any).games_to_win 
                    : 3
                }
              : { current_score: [0, 0], games_to_win: 3 }
          };
        }
      } else {
        // No players found, still need to properly format the match
        matchWithPlayerDetails = {
          ...match,
          teams: Array.isArray(match.teams) 
            ? (match.teams as unknown as TeamData[])
            : [],
          score: typeof match.score === 'object' && match.score !== null
            ? {
                current_score: Array.isArray((match.score as any).current_score) 
                  ? (match.score as any).current_score 
                  : [0, 0],
                games_to_win: typeof (match.score as any).games_to_win === 'number' 
                  ? (match.score as any).games_to_win 
                  : 3
              }
            : { current_score: [0, 0], games_to_win: 3 }
        };
      }
    }
    
    return {
      table: table as Table,
      match: matchWithPlayerDetails,
      queue: (queue || []) as PlayerWithDetails[]
    };
  } catch (error) {
    console.error('Error fetching table details:', error);
    throw error;
  }
};

// Subscribe to table changes
export const subscribeToTableWithDetails = (
  tableId: string,
  onUpdate: (data: TableWithDetails) => void
) => {
  let currentData: TableWithDetails = {
    table: null as unknown as Table,
    match: null,
    queue: []
  };
  
  // Helper to call the update callback
  const updateData = () => {
    onUpdate({ ...currentData });
  };
  
  // Helper to fetch match with player details
  const fetchMatchWithPlayerDetails = async (matchData: Match) => {
    if (!matchData) {
      currentData.match = null;
      return;
    }
    
    try {
      // Get all player IDs from both teams
      const playerIds: string[] = [];
      const matchTeams = Array.isArray(matchData.teams) 
        ? (matchData.teams as unknown as TeamData[]) 
        : [];
      
      if (matchTeams.length > 0) {
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
        
        if (!playersError && players) {
          // Create a map of player IDs to player objects
          const playerMap = players.reduce((map, player) => {
            map[player.id] = player;
            return map;
          }, {} as Record<string, Player>);
          
          // Add player details to match teams
          currentData.match = {
            ...matchData,
            teams: matchTeams.map(team => ({
              ...team,
              playerDetails: team.players.map(playerId => playerMap[playerId] || null).filter(Boolean)
            })),
            score: typeof matchData.score === 'object' && matchData.score !== null
              ? {
                  current_score: Array.isArray((matchData.score as any).current_score) 
                    ? (matchData.score as any).current_score 
                    : [0, 0],
                  games_to_win: typeof (matchData.score as any).games_to_win === 'number' 
                    ? (matchData.score as any).games_to_win 
                    : 3
                }
              : { current_score: [0, 0], games_to_win: 3 }
          };
        } else {
          // No players found, still need to properly format the match
          currentData.match = {
            ...matchData,
            teams: Array.isArray(matchData.teams) 
              ? (matchData.teams as unknown as TeamData[])
              : [],
            score: typeof matchData.score === 'object' && matchData.score !== null
              ? {
                  current_score: Array.isArray((matchData.score as any).current_score) 
                    ? (matchData.score as any).current_score 
                    : [0, 0],
                  games_to_win: typeof (matchData.score as any).games_to_win === 'number' 
                    ? (matchData.score as any).games_to_win 
                    : 3
                }
              : { current_score: [0, 0], games_to_win: 3 }
          };
        }
      } else {
        // No players found, still need to properly format the match
        currentData.match = {
          ...matchData,
          teams: Array.isArray(matchData.teams) 
            ? (matchData.teams as unknown as TeamData[])
            : [],
          score: typeof matchData.score === 'object' && matchData.score !== null
            ? {
                current_score: Array.isArray((matchData.score as any).current_score) 
                  ? (matchData.score as any).current_score 
                  : [0, 0],
                games_to_win: typeof (matchData.score as any).games_to_win === 'number' 
                  ? (matchData.score as any).games_to_win 
                  : 3
              }
            : { current_score: [0, 0], games_to_win: 3 }
        };
      }
    } catch (error) {
      console.error('Error fetching player details:', error);
      currentData.match = {
        ...matchData,
        teams: Array.isArray(matchData.teams) 
          ? (matchData.teams as unknown as TeamData[])
          : [],
        score: typeof matchData.score === 'object' && matchData.score !== null
          ? {
              current_score: Array.isArray((matchData.score as any).current_score) 
                ? (matchData.score as any).current_score 
                : [0, 0],
              games_to_win: typeof (matchData.score as any).games_to_win === 'number' 
                ? (matchData.score as any).games_to_win 
                : 3
            }
          : { current_score: [0, 0], games_to_win: 3 }
      };
    }
    
    updateData();
  };
  
  // Subscribe to table changes
  const tableChannel = supabase
    .channel(`table-details:${tableId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tables',
        filter: `id=eq.${tableId}`
      },
      (payload) => {
        currentData.table = payload.new as Table;
        updateData();
      }
    )
    .subscribe();
  
  // Subscribe to match changes
  const matchChannel = supabase
    .channel(`table-match:${tableId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `table_id=eq.${tableId} AND status=eq.active`
      },
      async (payload) => {
        if (payload.eventType === 'DELETE' || (payload.new && payload.new.status !== 'active')) {
          currentData.match = null;
          updateData();
        } else {
          // Fetch player details for the match
          await fetchMatchWithPlayerDetails(payload.new as Match);
        }
      }
    )
    .subscribe();
  
  // Helper function to fetch and update queue
  const fetchQueue = async () => {
    const { data } = await supabase
      .from('queue_entries')
      .select('*, player:players(*)')
      .eq('table_id', tableId)
      .order('position', { ascending: true });
    
    currentData.queue = data as PlayerWithDetails[] || [];
    updateData();
  };
  
  // Subscribe to queue changes
  const queueChannel = supabase
    .channel(`table-queue:${tableId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'queue_entries',
        filter: `table_id=eq.${tableId}`
      },
      () => {
        fetchQueue();
      }
    )
    .subscribe();
  
  // Initial data fetch
  fetchTableWithDetails(tableId).then((data) => {
    currentData = {
      table: data.table,
      match: data.match,
      queue: data.queue
    };
    updateData();
  });
  
  // Return unsubscribe function
  return () => {
    tableChannel.unsubscribe();
    matchChannel.unsubscribe();
    queueChannel.unsubscribe();
  };
};

// Subscribe to active match updates for a specific table
export const subscribeToActiveMatch = (
  tableId: string,
  onUpdate: (match: any | null) => void
) => {
  // Subscribe to match changes
  const matchChannel = supabase
    .channel(`active-match:${tableId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `table_id=eq.${tableId} AND status=eq.active`
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          onUpdate(null);
        } else {
          onUpdate(payload.new);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(matchChannel);
  };
};

// Complete a match with winner and update player ratings
export const completeMatchWithRatings = async (
  matchId: string,
  winnerIndex: number,
  ratingChange: number = 15
) => {
  try {
    // Get match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    
    if (matchError) throw matchError;
    
    // Update match status
    const { error: updateMatchError } = await supabase
      .from('matches')
      .update({
        status: 'completed',
        end_time: new Date().toISOString(),
        score: {
          ...(match.score as Record<string, any> || {}),
          winner: winnerIndex
        }
      })
      .eq('id', matchId);
    
    if (updateMatchError) throw updateMatchError;
    
    // Update player ratings if a valid winner
    if (winnerIndex >= 0 && match.teams) {
      const teams = match.teams as any[];
      
      if (teams.length >= 2) {
        const winnerTeam = teams[winnerIndex];
        const loserTeam = teams[1 - winnerIndex]; // Assumes 2 teams (0 and 1)
        
        // Update winner ratings
        if (winnerTeam.players && winnerTeam.players.length > 0) {
          for (const playerId of winnerTeam.players) {
            const { data: player } = await supabase
              .from('players')
              .select('rating')
              .eq('id', playerId)
              .single();
              
            if (player) {
              await supabase
                .from('players')
                .update({ rating: player.rating + ratingChange })
                .eq('id', playerId);
            }
          }
        }
        
        // Update loser ratings
        if (loserTeam.players && loserTeam.players.length > 0) {
          for (const playerId of loserTeam.players) {
            const { data: player } = await supabase
              .from('players')
              .select('rating')
              .eq('id', playerId)
              .single();
              
            if (player) {
              await supabase
                .from('players')
                .update({ rating: player.rating - ratingChange })
                .eq('id', playerId);
            }
          }
        }
      }
    }
    
    // Update table availability
    const { error: updateTableError } = await supabase
      .from('tables')
      .update({ is_available: true })
      .eq('id', match.table_id);
    
    if (updateTableError) throw updateTableError;
    
    return true;
  } catch (error) {
    console.error('Error completing match:', error);
    throw error;
  }
};

// Add a player to the queue
export const addToQueue = async (tableId: string, playerId: string) => {
  try {
    // Get the current highest position
    const { data: queueEntries, error: queueError } = await supabase
      .from('queue_entries')
      .select('position')
      .eq('table_id', tableId)
      .order('position', { ascending: false })
      .limit(1);
    
    if (queueError) throw queueError;
    
    const nextPosition = queueEntries.length > 0 ? queueEntries[0].position + 1 : 1;
    
    // Add player to queue
    const { error } = await supabase
      .from('queue_entries')
      .insert({
        table_id: tableId,
        player_id: playerId,
        position: nextPosition,
        skipped: false
      });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error adding to queue:', error);
    throw error;
  }
};

// Remove a player from the queue
export const removeFromQueue = async (queueEntryId: string) => {
  try {
    const { error } = await supabase
      .from('queue_entries')
      .delete()
      .eq('id', queueEntryId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error removing from queue:', error);
    throw error;
  }
};

// Toggle skip status for a queue entry
export const toggleSkipStatus = async (queueEntryId: string, currentStatus: boolean) => {
  try {
    const { data, error } = await supabase
      .from('queue_entries')
      .update({ skipped: !currentStatus })
      .eq('id', queueEntryId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error toggling skip status:', error);
    throw error;
  }
};

// Fetch all players
export const fetchPlayers = async () => {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data as Player[];
};

// Create a new player
export const createPlayer = async (
  name: string,
  email?: string,
  rating: number = 1500
) => {
  try {
    const { data, error } = await supabase
      .from('players')
      .insert({
        name,
        email,
        rating
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
};