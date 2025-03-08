// app/api/queueService.ts
import { supabase } from './supabase';
import { Match, Player } from '../types/database.types';
import { TableWithDetails, PlayerWithDetails } from '../types/custom.types';
import { fetchTableWithDetails } from './tables';
import { validateTeams } from '../utils/validationUtils';

/**
 * Process the queue after a match has ended and create the next match if appropriate
 * @param tableId The ID of the table where the match ended
 * @param completedMatch The completed match data
 * @param winnerTeamIndex The index of the winning team (0 or 1)
 * @returns Information about the next player(s) in queue and match creation status
 */
export const processQueueAfterMatch = async (
  tableId: string,
  completedMatch: Match,
  winnerTeamIndex: number
): Promise<{
  nextPlayer: PlayerWithDetails | null;
  tableAvailable: boolean;
  queueUpdated: boolean;
  winnerStays: boolean;
  newMatchCreated: boolean;
}> => {
  try {
    console.log(`[queueService] Processing queue for table ${tableId} after match ${completedMatch.id}`);
    
    // Get the table details including its current queue
    const tableDetails = await fetchTableWithDetails(tableId);
    const queue = tableDetails.queue || [];
    
    // Check if there are players in the queue
    if (queue.length === 0) {
      console.log(`[queueService] No players in queue for table ${tableId}`);
      return {
        nextPlayer: null,
        tableAvailable: true,
        queueUpdated: false,
        winnerStays: false,
        newMatchCreated: false
      };
    }
    
    // Get the winner and loser team data
    const validatedTeams = validateTeams(completedMatch.teams);
    const winnerTeam = validatedTeams[winnerTeamIndex];
    const loserTeam = validatedTeams[winnerTeamIndex === 0 ? 1 : 0];
    
    // Extract players from teams
    const winnerPlayerId = winnerTeam.players[0]; // Assuming 1v1 matches
    const loserPlayerId = loserTeam.players[0];  // Assuming 1v1 matches
    
    let winnerStays = false;
    let newMatchCreated = false;
    
    // 1. If there's a winner who wants to stay at the table
    if (winnerPlayerId) {
      console.log(`[queueService] Winner ${winnerPlayerId} stays at the table`);
      winnerStays = true;
      
      // 2. If there's a loser who wants to rejoin the queue
      if (loserPlayerId) {
        // Check if loser is already in queue (avoid duplicates)
        const loserInQueue = queue.some(entry => entry.player_id === loserPlayerId);
        
        if (!loserInQueue) {
          // Add loser to the end of the queue
          const nextPosition = queue.length > 0 
            ? Math.max(...queue.map(q => q.position)) + 1 
            : 1;
            
          console.log(`[queueService] Adding loser ${loserPlayerId} to end of queue at position ${nextPosition}`);
          
          await supabase
            .from('queue_entries')
            .insert({
              table_id: tableId,
              player_id: loserPlayerId,
              position: nextPosition,
              skipped: false
            });
        }
      }
    }
    
    // Get the next player from the queue
    const nextPlayer = queue.length > 0 ? queue[0] : null;
    
    // Special case for 2-player rotation: if loser is the only person in queue, it means we have only 2 players total
    const twoPlayerRotation = queue.length === 1 && loserPlayerId && queue[0].player_id === loserPlayerId;
    
    if (twoPlayerRotation) {
      console.log(`[queueService] Detected 2-player rotation between ${winnerPlayerId} and ${loserPlayerId}`);
      
      try {
        // Create teams for the 2-player rotation match (swap team positions based on who won)
        const newTeams = [
          {
            name: winnerTeam.name || "Team 1",
            type: winnerTeam.type || null,
            players: [winnerPlayerId]
          },
          {
            name: loserTeam.name || "Team 2", 
            type: loserTeam.type || null,
            players: [loserPlayerId]
          }
        ];
        
        console.log(`[queueService] Creating new match with winner ${winnerPlayerId} and loser ${loserPlayerId} in reversed positions`);
        
        // Import the startMatch function to create the new match
        const { startMatch } = require('./matches');
        
        // Create the new match with same race count
        const raceTo = completedMatch.score?.games_to_win || 1;
        const newMatch = await startMatch(tableId, newTeams, raceTo);
        
        if (newMatch) {
          console.log(`[queueService] New 2-player rotation match created successfully with ID: ${newMatch.id}`);
          newMatchCreated = true;
          
          // Remove the loser from the queue (they're now in team 2)
          await removePlayerFromQueue(tableId, loserPlayerId);
        }
      } catch (matchError) {
        console.error('[queueService] Error creating 2-player rotation match:', matchError);
      }
    } 
    // Normal case with players waiting in queue
    else if (nextPlayer) {
      // Flag this player as "notified" in the queue
      await supabase
        .from('queue_entries')
        .update({ notified: true })
        .eq('id', nextPlayer.id);
        
      console.log(`[queueService] Next player ${nextPlayer.player.name} (ID: ${nextPlayer.player_id}) is up`);
      
      // If winner stays and there's a next player from the queue, create a new match with them
      if (winnerStays && nextPlayer && nextPlayer.player_id) {
        try {
          // Create teams for the new match
          const newTeams = [
            {
              name: winnerTeam.name || "Team 1",
              type: winnerTeam.type || null,
              players: [winnerPlayerId]
            },
            {
              name: nextPlayer.player?.name ? `${nextPlayer.player.name}'s Team` : "Team 2",
              type: null,
              players: [nextPlayer.player_id]
            }
          ];
          
          console.log(`[queueService] Creating new match with winner ${winnerPlayerId} and next player ${nextPlayer.player_id}`);
          
          // Import the startMatch function to create the new match
          const { startMatch } = require('./matches');
          
          // Create the new match
          const raceTo = completedMatch.score?.games_to_win || 1; // Use same race count as previous match
          const newMatch = await startMatch(tableId, newTeams, raceTo);
          
          if (newMatch) {
            console.log(`[queueService] New match created successfully with ID: ${newMatch.id}`);
            newMatchCreated = true;
            
            // Remove the player from the queue
            await removePlayerFromQueue(tableId, nextPlayer.player_id);
          }
        } catch (matchError) {
          console.error('[queueService] Error creating next match:', matchError);
          // If match creation fails, we'll still notify the player
        }
      }
    }
    
    return {
      nextPlayer,
      tableAvailable: !winnerStays,
      queueUpdated: true,
      winnerStays,
      newMatchCreated
    };
  } catch (error) {
    console.error('[queueService] Error processing queue:', error);
    // Return a safe default in case of error
    return {
      nextPlayer: null,
      tableAvailable: true,
      queueUpdated: false,
      winnerStays: false,
      newMatchCreated: false
    };
  }
};

/**
 * Notify a player that it's their turn to play
 * @param playerId The ID of the player to notify
 * @param tableId The ID of the table that's available
 * @returns Success status of the notification
 */
export const notifyPlayerTurn = async (
  playerId: string,
  tableId: string
): Promise<boolean> => {
  try {
    // In a full implementation, this would integrate with push notifications
    // For now, we'll just mark the player as notified in the database
    
    // Get the table name for the notification message
    const { data: table } = await supabase
      .from('tables')
      .select('name')
      .eq('id', tableId)
      .single();
      
    const tableName = table?.name || 'a table';
    
    // Create a notification record in the database
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: playerId,
        type: 'turn_notification',
        message: `It's your turn to play on ${tableName}`,
        read: false,
        metadata: {
          table_id: tableId,
          action: 'start_match'
        }
      });
      
    if (error) {
      console.error('[queueService] Error creating notification:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[queueService] Error notifying player:', error);
    return false;
  }
};

/**
 * Remove a player from the queue (usually after they start a match)
 * @param tableId The table ID
 * @param playerId The player ID to remove
 * @returns Success status
 */
export const removePlayerFromQueue = async (
  tableId: string,
  playerId: string
): Promise<boolean> => {
  try {
    // Find the queue entry for this player
    const { data: queueEntry, error: findError } = await supabase
      .from('queue_entries')
      .select('id')
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .maybeSingle();
      
    if (findError || !queueEntry) {
      console.log(`[queueService] Player ${playerId} not found in queue for table ${tableId}`);
      return false;
    }
    
    // Remove the player from the queue
    const { error: removeError } = await supabase
      .from('queue_entries')
      .delete()
      .eq('id', queueEntry.id);
      
    if (removeError) {
      console.error('[queueService] Error removing player from queue:', removeError);
      return false;
    }
    
    // Reorder remaining queue positions
    await reorderQueuePositions(tableId);
    
    return true;
  } catch (error) {
    console.error('[queueService] Error removing player from queue:', error);
    return false;
  }
};

/**
 * Reorder queue positions after a player is removed
 * @param tableId The table ID to reorder queue for
 */
export const reorderQueuePositions = async (tableId: string): Promise<void> => {
  try {
    // Get current queue entries ordered by position
    const { data: queue, error } = await supabase
      .from('queue_entries')
      .select('id, position')
      .eq('table_id', tableId)
      .order('position');
      
    if (error) {
      console.error('[queueService] Error fetching queue for reordering:', error);
      return;
    }
    
    // Update each entry with its new position
    for (let i = 0; i < queue.length; i++) {
      const entry = queue[i];
      if (entry.position !== i + 1) {
        await supabase
          .from('queue_entries')
          .update({ position: i + 1 })
          .eq('id', entry.id);
      }
    }
  } catch (error) {
    console.error('[queueService] Error reordering queue positions:', error);
  }
};