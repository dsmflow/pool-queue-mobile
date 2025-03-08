import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  SafeAreaView, 
  TouchableOpacity, 
  Alert, 
  Modal 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { TableCard } from '../components/TableCard';
import { fetchTableWithDetails, addToQueue, fetchPlayers, subscribeToTableWithDetails } from '../api/tables';
import { PlayerSelector } from '../components/PlayerSelector';
import { ActiveMatchBanner } from '../components/ActiveMatchBanner';
import { TurnNotificationBanner } from '../components/TurnNotificationBanner';
import { useNotifications } from '../context/NotificationContext';
import { Player } from '../types/database.types';
import { TableWithDetails } from '../types/custom.types';
import { sanitizeMatch } from '../utils/validationUtils';

type QueueScreenProps = {
  route: { params: { tableId: string; timestamp?: number } };
};

export const QueueScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const tableId = route.params?.tableId;
  const timestamp = route.params?.timestamp || Date.now();
  const { hasQueueTurnNotification } = useNotifications();

  const [tableDetails, setTableDetails] = useState<TableWithDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showPlayerSelector, setShowPlayerSelector] = useState<boolean>(false);
  const [joinQueueError, setJoinQueueError] = useState<string | null>(null);
  const [joiningQueue, setJoiningQueue] = useState<boolean>(false);
  const subscriptionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!tableId) {
      Alert.alert('Error', 'No table selected.');
      navigation.goBack();
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        console.log(`[QueueScreen] Loading data for table: ${tableId}`);
        
        // Load table details
        const details = await fetchTableWithDetails(tableId);
        setTableDetails(details);
        console.log(`[QueueScreen] Table details loaded. Match active: ${!!details.match}, Queue length: ${details.queue?.length || 0}`);

        // Load players for the selector
        const playersData = await fetchPlayers();
        setPlayers(playersData);
        console.log(`[QueueScreen] Loaded ${playersData.length} players for selector`);
      } catch (error) {
        console.error(`[QueueScreen] Error loading queue data for table ${tableId}:`, error);
        Alert.alert('Error', 'Failed to load queue data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Clean up any existing subscription
    if (subscriptionRef.current) {
      try {
        console.log(`[QueueScreen] Cleaning up previous subscription for table: ${tableId}`);
        subscriptionRef.current();
        subscriptionRef.current = null;
      } catch (err) {
        console.error(`[QueueScreen] Error cleaning up previous subscription:`, err);
      }
    }

    // Load initial data
    loadData();
    
    // Subscribe to real-time updates with timestamp to ensure unique channel
    console.log(`[QueueScreen] Setting up real-time subscription for table: ${tableId} with timestamp: ${timestamp}`);
    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = subscribeToTableWithDetails(
        tableId,
        (data) => {
          console.log(`[QueueScreen] Received real-time update for table ${tableId}`);
          // Check if data might be stale before setting state
          if (data.staleData) {
            console.warn(`[QueueScreen] Received potentially stale data for table ${tableId}`);
          }
          setTableDetails(data);
        }
      );
      
      // Store the unsubscribe function
      subscriptionRef.current = unsubscribe;
    } catch (error) {
      console.error(`[QueueScreen] Error setting up subscription for table ${tableId}:`, error);
      // Even if subscription fails, we'll still show data loaded initially
      Alert.alert(
        'Notice', 
        'Real-time updates might not be available. Please refresh if data seems outdated.',
        [{ text: 'OK' }]
      );
    }
    
    // Clean up subscription when component unmounts or changes
    return () => {
      if (subscriptionRef.current) {
        try {
          console.log(`[QueueScreen] Cleaning up subscription on unmount for table: ${tableId}`);
          subscriptionRef.current();
          subscriptionRef.current = null;
        } catch (err) {
          console.error(`[QueueScreen] Error during subscription cleanup:`, err);
        }
      }
    };
  }, [tableId, timestamp, navigation]);

  const handleJoinQueue = async (playerId: string) => {
    try {
      setJoinQueueError(null);
      setJoiningQueue(true);
      console.log(`[QueueScreen] Attempting to join queue for player: ${playerId}, table: ${tableId}`);
      
      // Check if there's an active match
      if (tableDetails?.match) {
        console.log(`[QueueScreen] Table has active match, adding to queue`);
        
        try {
          // Handle the table busy case - add to queue
          await addToQueue(tableId, playerId);
          
          // Wait a short time for the subscription to potentially receive the update
          console.log(`[QueueScreen] Successfully added to queue, waiting for subscription update`);
          
          // Give UI time to refresh
          setTimeout(() => {
            Alert.alert(
              'Success',
              'You have been added to the queue. You\'ll play when the current match ends.',
              [{ 
                text: 'OK', 
                onPress: () => {
                  // Clean up subscription before navigating back
                  if (subscriptionRef.current) {
                    try {
                      console.log(`[QueueScreen] Cleaning up subscription before navigation`);
                      subscriptionRef.current();
                      subscriptionRef.current = null;
                    } catch (err) {
                      console.error(`[QueueScreen] Error cleaning up subscription:`, err);
                    }
                  }
                  // Navigate to Home tab within MainTabs
                  navigation.navigate('MainTabs', {
                    screen: 'Home',
                    params: {
                      refresh: true,
                      timestamp: Date.now() // Force fresh component mount
                    }
                  });
                }
              }]
            );
          }, 500);
        } catch (queueError) {
          console.error('[QueueScreen] Error adding to queue:', queueError);
          Alert.alert('Error', 'Failed to join the queue. Please try again.');
        }
      } else {
        console.log(`[QueueScreen] Table is available, navigating to match setup`);
        // If no active match, player can start playing immediately
        
        // Clean up subscription before navigating
        if (subscriptionRef.current) {
          try {
            console.log(`[QueueScreen] Cleaning up subscription before navigating to MatchSetup`);
            subscriptionRef.current();
            subscriptionRef.current = null;
          } catch (err) {
            console.error(`[QueueScreen] Error cleaning up subscription:`, err);
          }
        }
        
        // Navigate to match setup with timestamp to ensure fresh component mount
        navigation.navigate('MatchSetup', { 
          tableId, 
          playerId,
          timestamp: Date.now() // Force fresh navigation
        });
      }
      
      setShowPlayerSelector(false);
    } catch (error) {
      console.error('[QueueScreen] Error joining queue:', error);
      setJoinQueueError('Failed to join the queue. Please try again.');
    } finally {
      setJoiningQueue(false);
    }
  };

  const handleTablePress = (tableId: string, isAvailable: boolean, joinQueue: boolean = false) => {
    console.log(`[QueueScreen] Table pressed - tableId: ${tableId}, isAvailable: ${isAvailable}, joinQueue: ${joinQueue}`);
    
    // If explicitly joining queue or table is not available
    if (joinQueue || !isAvailable) {
      console.log(`[QueueScreen] Opening player selector for queue/match`);
      // Show player selector
      setShowPlayerSelector(true);
    }
    
    // If user clicked on the match details area (not the join queue button)
    if (!isAvailable && !joinQueue && tableDetails?.match) {
      console.log(`[QueueScreen] Navigating to match details for match: ${tableDetails.match.id}`);
      
      // Clean up subscription before navigating to prevent memory leaks
      if (subscriptionRef.current) {
        try {
          console.log(`[QueueScreen] Cleaning up subscription before navigating to Match`);
          subscriptionRef.current();
          subscriptionRef.current = null;
        } catch (err) {
          console.error(`[QueueScreen] Error cleaning up subscription:`, err);
        }
      }
      
      // Navigate to active match details with timestamp to force fresh component mount
      const currentTimestamp = Date.now();
      console.log(`[QueueScreen] Navigating to Match with timestamp: ${currentTimestamp}`);
      
      navigation.navigate('Match', { 
        matchId: tableDetails.match.id, 
        tableId: tableDetails.table.id,
        timestamp: currentTimestamp
      });
    }
  };
  
  // Add refresh capability to reload data and recreate subscriptions
  const refreshQueueData = async () => {
    try {
      setLoading(true);
      console.log(`[QueueScreen] Refreshing data for table: ${tableId}`);
      
      // Clean up existing subscription
      if (subscriptionRef.current) {
        try {
          console.log(`[QueueScreen] Cleaning up existing subscription during refresh`);
          subscriptionRef.current();
          subscriptionRef.current = null;
        } catch (err) {
          console.error(`[QueueScreen] Error cleaning up subscription during refresh:`, err);
        }
      }
      
      // Fetch fresh data
      const details = await fetchTableWithDetails(tableId);
      setTableDetails(details);
      
      // Re-establish subscription with a new timestamp
      const refreshTimestamp = Date.now();
      console.log(`[QueueScreen] Re-establishing subscription with timestamp: ${refreshTimestamp}`);
      
      try {
        const unsubscribe = subscribeToTableWithDetails(
          tableId,
          (data) => {
            console.log(`[QueueScreen] Received real-time update after refresh`);
            setTableDetails(data);
          }
        );
        
        subscriptionRef.current = unsubscribe;
      } catch (subscriptionError) {
        console.error(`[QueueScreen] Error re-establishing subscription:`, subscriptionError);
        Alert.alert('Notice', 'Could not set up real-time updates. Please try again.');
      }
    } catch (error) {
      console.error(`[QueueScreen] Error refreshing data:`, error);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ActiveMatchBanner />
      {hasQueueTurnNotification && <TurnNotificationBanner />}
      <View style={styles.header}>
        <Text style={styles.title}>
          {tableDetails?.table?.name || 'Table'} Queue
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={refreshQueueData}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={() => setShowPlayerSelector(true)}
          >
            <Text style={styles.joinButtonText}>Join Queue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {joinQueueError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{joinQueueError}</Text>
        </View>
      )}

      {tableDetails?.match ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Table is currently in use</Text>
          <Text style={styles.statusMessage}>
            There is an active match on this table. You can join the queue and play when the current match ends.
          </Text>
          <TouchableOpacity 
            style={styles.viewMatchButton}
            onPress={() => handleTablePress(tableId, false, false)}
          >
            <Text style={styles.viewMatchButtonText}>View Match Details</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.statusCard}>
          <Text style={[styles.statusTitle, styles.availableText]}>Table is available</Text>
          <Text style={styles.statusMessage}>
            This table is available for play now. Select a player to start a match.
          </Text>
          <TouchableOpacity 
            style={styles.startMatchButton}
            onPress={() => setShowPlayerSelector(true)}
          >
            <Text style={styles.startMatchButtonText}>Start Match</Text>
          </TouchableOpacity>
        </View>
      )}

      {tableDetails && (
        <TableCard
          table={tableDetails.table}
          onPress={handleTablePress}
        />
      )}

      <View style={styles.queueContainer}>
        <Text style={styles.queueHeader}>Current Queue</Text>
        {tableDetails?.queue && tableDetails.queue.length > 0 ? (
          <FlatList
            data={tableDetails.queue}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View style={styles.queueItem}>
                <Text style={styles.queuePosition}>{index + 1}</Text>
                <Text style={styles.queuePlayerName}>{item.player?.name || 'Unknown Player'}</Text>
              </View>
            )}
          />
        ) : (
          <Text style={styles.emptyQueueText}>No players in queue</Text>
        )}
      </View>

      <PlayerSelector
        visible={showPlayerSelector}
        players={players}
        onSelect={handleJoinQueue}
        onClose={() => setShowPlayerSelector(false)}
        loading={joiningQueue}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  joinButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffdddd',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  errorText: {
    color: '#c0392b',
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  availableText: {
    color: '#2ecc71',
  },
  statusMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
    marginBottom: 16,
  },
  viewMatchButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  viewMatchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  startMatchButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  startMatchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  queueContainer: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  queueHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  queuePosition: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3498db',
    color: 'white',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: 'bold',
    marginRight: 16,
    lineHeight: 30,
  },
  queuePlayerName: {
    fontSize: 16,
    color: '#2c3e50',
  },
  emptyQueueText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default QueueScreen;