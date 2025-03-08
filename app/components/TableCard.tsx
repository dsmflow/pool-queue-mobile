import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { subscribeToTableWithDetails, fetchTableWithDetails, removeFromQueue, toggleSkipStatus } from '../api/tables';
import { Table, Match } from '../types/database.types';
import { PlayerWithDetails, TeamData, EnhancedMatch } from '../types/custom.types';
import { QueueDisplay } from './QueueDisplay';

type TableCardProps = {
  table: Table;
  onPress: (tableId: string, isAvailable: boolean, joinQueue?: boolean) => void;
};

export const TableCard: React.FC<TableCardProps> = ({ 
  table,
  onPress
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [match, setMatch] = useState<EnhancedMatch | null>(null);
  const [queue, setQueue] = useState<PlayerWithDetails[]>([]);

  // Use a ref to store subscription for proper cleanup
  const subscriptionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Initial data fetch
    const loadData = async () => {
      try {
        setLoading(true);
        console.log(`[TableCard] Fetching initial data for table: ${table.id}`);
        const data = await fetchTableWithDetails(table.id);
        setMatch(data.match);
        setQueue(data.queue);
      } catch (error) {
        console.error(`[TableCard] Error loading table data for table ${table.id}:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Clean up any existing subscription before creating a new one
    if (subscriptionRef.current) {
      try {
        console.log(`[TableCard] Cleaning up previous subscription for table: ${table.id}`);
        subscriptionRef.current();
        subscriptionRef.current = null;
      } catch (err) {
        console.error(`[TableCard] Error cleaning up previous subscription for table ${table.id}:`, err);
      }
    }

    // Subscribe to real-time updates
    console.log(`[TableCard] Setting up new subscription for table: ${table.id}`);
    const unsubscribe = subscribeToTableWithDetails(
      table.id,
      (data) => {
        console.log(`[TableCard] Received update for table: ${table.id}`);
        setMatch(data.match);
        setQueue(data.queue);
      }
    );

    // Store the unsubscribe function in the ref
    subscriptionRef.current = unsubscribe;

    // Cleanup subscription on unmount or when table.id changes
    return () => {
      if (subscriptionRef.current) {
        try {
          console.log(`[TableCard] Cleaning up subscription on unmount for table: ${table.id}`);
          subscriptionRef.current();
          subscriptionRef.current = null;
        } catch (err) {
          console.error(`[TableCard] Error during subscription cleanup for table ${table.id}:`, err);
        }
      }
    };
  }, [table.id]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  }

  const renderMatchInfo = () => {
    if (!match) {
      return (
        <View style={styles.availableContainer}>
          <Text style={styles.availableText}>Table Available</Text>
          <TouchableOpacity 
            style={styles.playButton}
            onPress={() => onPress(table.id, true)}
          >
            <Text style={styles.playButtonText}>Play Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const homeTeam = match.teams[0] as TeamData;
    const awayTeam = match.teams[1] as TeamData;

    // Format player names for display
    const formatPlayerNames = (team: TeamData) => {
      if (!team) return "No players";
      
      // First try to use playerDetails if available (from our enhanced match data)
      if (team.playerDetails && Array.isArray(team.playerDetails) && team.playerDetails.length > 0) {
        return team.playerDetails.map((player) => 
          `${player.name} (${player.rating || 1500})`
        ).join(", ");
      }
      
      // Fallback to finding players from queue if playerDetails is not available
      if (team.players && Array.isArray(team.players)) {
        const playerNames: string[] = [];
        
        team.players.forEach((playerId) => {
          const queuePlayer = queue.find((p) => p.id === playerId);
          if (queuePlayer) {
            playerNames.push(`${queuePlayer.player.name || 'Unknown'} (${queuePlayer.player.rating || 1500})`);
          }
        });
        
        return playerNames.join(", ") || "Unknown players";
      }
      
      return "Unknown players";
    };

    return (
      <View>
        <TouchableOpacity 
          style={styles.matchContainer}
          onPress={() => onPress(table.id, false)}
        >
          <View style={styles.matchHeader}>
            <Text style={styles.matchTitle}>Current Match</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>{match.score?.current_score?.[0] || 0}</Text>
              <Text style={styles.scoreText}>-</Text>
              <Text style={styles.scoreText}>{match.score?.current_score?.[1] || 0}</Text>
            </View>
          </View>
          
          <View style={styles.teamsContainer}>
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{homeTeam?.name || 'Team 1'}</Text>
              <Text style={styles.playerNames} numberOfLines={1}>
                {formatPlayerNames(homeTeam)}
              </Text>
            </View>
            
            <Text style={styles.vsText}>vs</Text>
            
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{awayTeam?.name || 'Team 2'}</Text>
              <Text style={styles.playerNames} numberOfLines={1}>
                {formatPlayerNames(awayTeam)}
              </Text>
            </View>
          </View>
          
          <View style={styles.joinQueueContainer}>
            <TouchableOpacity 
              style={styles.joinQueueButton}
              onPress={(e) => {
                e.stopPropagation();
                onPress(table.id, false, true);
              }}
            >
              <Text style={styles.joinQueueButtonText}>Join Queue</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        
        {/* Display the queue for this table */}
        {queue.length > 0 && (
          <QueueDisplay 
            queue={queue}
            onRemovePlayer={(queueEntryId) => removeFromQueue(queueEntryId)}
            onToggleSkip={(queueEntryId, currentSkipStatus) => toggleSkipStatus(queueEntryId, currentSkipStatus)}
            isEditable={true}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.tableName}>{table.name}</Text>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: match ? '#e74c3c' : '#2ecc71' }
        ]} />
      </View>
      
      <View style={styles.cardContent}>
        {renderMatchInfo()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardContent: {
    padding: 16,
  },
  availableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availableText: {
    fontSize: 16,
    color: '#2ecc71',
    fontWeight: 'bold',
  },
  playButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  playButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  matchContainer: {
    
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginHorizontal: 4,
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  playerNames: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  vsText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginHorizontal: 8,
  },
  joinQueueContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  joinQueueButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinQueueButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});