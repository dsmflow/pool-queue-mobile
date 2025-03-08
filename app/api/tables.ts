import { supabase } from './supabase';
import { Table, Match, QueueEntry, Player } from '../types/database.types';
import { EnhancedMatch, TeamData, TableWithDetails, PlayerWithDetails } from '../types/custom.types';
import { sanitizeMatch, validateTeams, validateMatchScore } from '../utils/validationUtils';

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
      // Use validation utilities to safely process the match data
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
        
        if (!playersError && players) {
          // Use sanitizeMatch utility to properly format the match with player details
          matchWithPlayerDetails = sanitizeMatch(match, players);
        } else {
          // Still use sanitizeMatch even without player details
          matchWithPlayerDetails = sanitizeMatch(match);
        }
      } else {
        // No players found, still use sanitizeMatch for consistent formatting
        matchWithPlayerDetails = sanitizeMatch(match);
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
      // Use validation utilities to get all player IDs
      const validatedTeams = validateTeams(matchData.teams);
      
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
        
        if (!playersError && players) {
          // Use sanitizeMatch to properly create an EnhancedMatch with player details
          currentData.match = sanitizeMatch(matchData, players);
        } else {
          // No player details, but still use sanitizeMatch
          currentData.match = sanitizeMatch(matchData);
        }
      } else {
        // No player IDs, but still use sanitizeMatch for consistent formatting
        currentData.match = sanitizeMatch(matchData);
      }
    } catch (error) {
      console.error('Error fetching player details:', error);
      // Even in case of error, use sanitizeMatch to ensure consistent structure
      currentData.match = sanitizeMatch(matchData);
    }
    
    updateData();
  };
  
  // Create unique channel names with timestamp to avoid conflicts
  const timestamp = Date.now();
  const tableChannelName = `table-details:${tableId}-${timestamp}`;
  const matchChannelName = `table-match:${tableId}-${timestamp}`;
  const queueChannelName = `table-queue:${tableId}-${timestamp}`;

  console.log(`[tables] Creating subscription channels for table ${tableId} with timestamp ${timestamp}`);
  
  // Helper function to safely subscribe to a channel
  const safelySubscribe = (channelName, table, filter, handler) => {
    try {
      console.log(`[tables] Setting up ${channelName} subscription`);
      return supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: filter
          },
          handler
        )
        .subscribe();
    } catch (err) {
      console.error(`[tables] Error setting up ${channelName} subscription:`, err);
      // Return a dummy channel with unsubscribe method to prevent crashes
      return { 
        unsubscribe: () => {
          console.log(`[tables] Dummy unsubscribe called for ${channelName} due to setup failure`);
        }
      };
    }
  };

  // Subscribe to table changes
  const tableChannel = safelySubscribe(
    tableChannelName,
    'tables',
    `id=eq.${tableId}`,
    (payload) => {
      console.log(`[tables] Table update received for ${tableId}:`, payload.eventType);
      currentData.table = payload.new as Table;
      updateData();
    }
  );
  
  // Subscribe to match changes
  const matchChannel = safelySubscribe(
    matchChannelName,
    'matches',
    `table_id=eq.${tableId} AND status=eq.active`,
    async (payload) => {
      console.log(`[tables] Match update received for table ${tableId}:`, payload.eventType);
      if (payload.eventType === 'DELETE' || (payload.new && payload.new.status !== 'active')) {
        console.log(`[tables] Match deleted or no longer active for table ${tableId}`);
        currentData.match = null;
        updateData();
      } else {
        console.log(`[tables] Fetching player details for match on table ${tableId}`);
        // Fetch player details for the match
        await fetchMatchWithPlayerDetails(payload.new as Match);
      }
    }
  );
  
  // Helper function to fetch and update queue with error handling
  const fetchQueue = async () => {
    try {
      console.log(`[tables] Fetching queue for table ${tableId}`);
      const { data, error } = await supabase
        .from('queue_entries')
        .select('*, player:players(*)')
        .eq('table_id', tableId)
        .order('position', { ascending: true });
      
      if (error) {
        console.error(`[tables] Error fetching queue for table ${tableId}:`, error);
        return;
      }
      
      console.log(`[tables] Retrieved ${data?.length || 0} queue entries for table ${tableId}`);
      currentData.queue = data as PlayerWithDetails[] || [];
      updateData();
    } catch (err) {
      console.error(`[tables] Unexpected error fetching queue for table ${tableId}:`, err);
    }
  };
  
  // Subscribe to queue changes
  const queueChannel = safelySubscribe(
    queueChannelName,
    'queue_entries',
    `table_id=eq.${tableId}`,
    (payload) => {
      console.log(`[tables] Queue update received for table ${tableId}:`, payload.eventType);
      fetchQueue();
    }
  );
  
  // Initial data fetch with error handling
  console.log(`[tables] Performing initial data fetch for table ${tableId}`);
  fetchTableWithDetails(tableId)
    .then((data) => {
      console.log(`[tables] Initial data fetch complete for table ${tableId}`);
      currentData = {
        table: data.table,
        match: data.match,
        queue: data.queue
      };
      updateData();
    })
    .catch(err => {
      console.error(`[tables] Error in initial data fetch for table ${tableId}:`, err);
      // Still call updateData with whatever data we have to avoid blocking the UI
      updateData();
    });
  
  // Return unsubscribe function with error handling
  return () => {
    try {
      console.log(`[tables] Unsubscribing from table channels for table: ${tableId}`);
      tableChannel.unsubscribe();
      matchChannel.unsubscribe();
      queueChannel.unsubscribe();
      console.log(`[tables] Successfully unsubscribed from all channels for table: ${tableId}`);
    } catch (err) {
      console.error(`[tables] Error unsubscribing from channels for table ${tableId}:`, err);
      // Even if there's an error, we should still try to clean up the other channels
      try { tableChannel.unsubscribe(); } catch (e) {}
      try { matchChannel.unsubscribe(); } catch (e) {}
      try { queueChannel.unsubscribe(); } catch (e) {}
    }
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

  // Return unsubscribe function with proper error handling
  return () => {
    try {
      console.log(`[tables] Unsubscribing from active match channel for table: ${tableId}`);
      matchChannel.unsubscribe();
      console.log(`[tables] Successfully unsubscribed from active match channel for table: ${tableId}`);
    } catch (err) {
      console.error(`[tables] Error unsubscribing from active match channel for table ${tableId}:`, err);
      // Fall back to removeChannel as a last resort
      try {
        supabase.removeChannel(matchChannel);
      } catch (fallbackErr) {
        console.error(`[tables] Fallback removeChannel also failed for table ${tableId}:`, fallbackErr);
      }
    }
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
    // Check if the player is already in the queue
    const { data: existingEntry, error: checkError } = await supabase
      .from('queue_entries')
      .select('id')
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .maybeSingle();
      
    if (checkError) throw checkError;
    
    if (existingEntry) {
      throw new Error('This player is already in the queue for this table.');
    }
    
    // Check if table exists and has an active match
    const { data: tableData, error: tableError } = await supabase
      .from('tables')
      .select('is_available')
      .eq('id', tableId)
      .single();
      
    if (tableError) throw tableError;
    
    if (tableData.is_available) {
      throw new Error('This table is available for immediate play. No need to queue.');
    }
    
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

// Fetch active queue positions for a user
export const fetchActiveQueuePositions = async (userId: string) => {
  try {
    // Get all queue entries for this user
    const { data: queueEntries, error: queueError } = await supabase
      .from('queue_entries')
      .select('id, position, table_id, tables(id, name)')
      .eq('player_id', userId);
    
    if (queueError) throw queueError;
    
    // For each table, get the total queue length
    const positions = await Promise.all(
      (queueEntries || []).map(async (entry) => {
        const { data: queueCount, error: countError } = await supabase
          .from('queue_entries')
          .select('id', { count: 'exact' })
          .eq('table_id', entry.table_id);
          
        if (countError) throw countError;
        
        return {
          tableId: entry.table_id,
          tableName: entry.tables?.name || 'Unknown Table',
          position: entry.position,
          totalInQueue: queueCount?.length || 0
        };
      })
    );
    
    return positions;
  } catch (error) {
    console.error('Error fetching queue positions:', error);
    throw error;
  }
};