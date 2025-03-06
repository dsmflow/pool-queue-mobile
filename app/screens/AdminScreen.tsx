import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthContext';
import { endMatch, archiveMatch } from '../api/matches';
import { format } from 'date-fns';

interface ActiveMatch {
  id: string;
  table_id: string;
  teams: any[];
  score: {
    current_score: number[];
    games_to_win: number;
  };
  start_time: string;
  status: string;
}

export const AdminScreen: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
  const [processingMatch, setProcessingMatch] = useState<string | null>(null);
  const [isResettingTables, setIsResettingTables] = useState(false);
  const [isResettingQueues, setIsResettingQueues] = useState(false);
  const [isEndingAllMatches, setIsEndingAllMatches] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this screen.');
      navigation.goBack();
      return;
    }

    fetchActiveMatches();
  }, [isAdmin]);

  const fetchActiveMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'active')
        .order('start_time', { ascending: false });

      if (error) throw error;

      setActiveMatches(data || []);
    } catch (error) {
      console.error('Error fetching active matches:', error);
      Alert.alert('Error', 'Failed to load active matches');
    } finally {
      setLoading(false);
    }
  };

  const handleEndMatch = async (match: ActiveMatch) => {
    Alert.alert(
      'End Match',
      'Are you sure you want to end this match? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Match',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingMatch(match.id);
              
              // Determine the winner based on the current score
              const score = match.score.current_score;
              const winnerIndex = score[0] > score[1] ? 0 : 1;
              
              // End the match
              await endMatch(match.id, match.table_id);
              
              // Archive the match
              await archiveMatch(match.id);
              
              // Refresh the list
              await fetchActiveMatches();
              
              Alert.alert('Success', 'Match has been ended successfully');
            } catch (error) {
              console.error('Error ending match:', error);
              Alert.alert('Error', 'Failed to end match');
            } finally {
              setProcessingMatch(null);
            }
          }
        }
      ]
    );
  };
  
  // Reset all tables to available
  const handleResetTables = async () => {
    Alert.alert(
      'Reset All Tables',
      'Are you sure you want to reset all tables to available? This will not affect active matches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Tables',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResettingTables(true);
              
              // First get all tables
              const { data: allTables, error: fetchError } = await supabase
                .from('tables')
                .select('id');
              
              if (fetchError) throw fetchError;
              
              // Create a set of active table IDs for quick lookup
              const activeTableIds = new Set(activeMatches.map(match => match.table_id));
              
              // Filter out tables that have active matches
              const tablesToUpdate = allTables
                .filter(table => !activeTableIds.has(table.id))
                .map(table => table.id);
              
              if (tablesToUpdate.length === 0) {
                Alert.alert('Info', 'No tables need updating or all tables are in active matches');
                return;
              }
              
              // Update only the tables that don't have active matches
              const { error: updateError } = await supabase
                .from('tables')
                .update({ is_available: true })
                .in('id', tablesToUpdate);
              
              if (updateError) throw updateError;
              
              Alert.alert('Success', `${tablesToUpdate.length} tables have been reset to available status`);
            } catch (error) {
              console.error('Error resetting tables:', error);
              Alert.alert('Error', 'Failed to reset tables: ' + (error as any).message);
            } finally {
              setIsResettingTables(false);
            }
          }
        }
      ]
    );
  };
  
  // Clear all queues
  const handleClearQueues = async () => {
    Alert.alert(
      'Clear All Queues',
      'Are you sure you want to clear all player queues? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Queues',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResettingQueues(true);
              
              // Delete all queue entries
              const { error } = await supabase
                .from('queue_entries')
                .delete()
                .gte('id', '0'); // This is a trick to delete all rows
              
              if (error) throw error;
              
              Alert.alert('Success', 'All queues have been cleared');
            } catch (error) {
              console.error('Error clearing queues:', error);
              Alert.alert('Error', 'Failed to clear queues');
            } finally {
              setIsResettingQueues(false);
            }
          }
        }
      ]
    );
  };
  
  // End and archive all active matches
  const handleEndAllMatches = async () => {
    if (activeMatches.length === 0) {
      Alert.alert('No Matches', 'There are no active matches to end.');
      return;
    }
    
    Alert.alert(
      'End All Matches',
      `Are you sure you want to end all ${activeMatches.length} active matches? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End All Matches',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsEndingAllMatches(true);
              
              // Process each match sequentially to avoid race conditions
              for (const match of activeMatches) {
                try {
                  // End the match first
                  await endMatch(match.id, match.table_id);
                  
                  // Then archive it
                  await archiveMatch(match.id);
                  
                  console.log(`Successfully ended and archived match ${match.id}`);
                } catch (error) {
                  console.error(`Error processing match ${match.id}:`, error);
                  // Continue with other matches even if one fails
                }
              }
              
              // Refresh the list
              await fetchActiveMatches();
              
              Alert.alert('Success', 'All matches have been ended and archived');
            } catch (error) {
              console.error('Error ending all matches:', error);
              Alert.alert('Error', 'There was an error ending some matches');
            } finally {
              setIsEndingAllMatches(false);
            }
          }
        }
      ]
    );
  };

  const renderMatchItem = ({ item }: { item: ActiveMatch }) => {
    const teams = item.teams || [];
    const team1 = teams[0] || { name: 'Team 1', players: [] };
    const team2 = teams[1] || { name: 'Team 2', players: [] };
    const score = item.score?.current_score || [0, 0];
    const startTime = item.start_time
      ? format(new Date(item.start_time), 'MMM d, h:mm a')
      : 'Unknown';
    const isProcessing = processingMatch === item.id;

    return (
      <View style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchDate}>{startTime}</Text>
          <Text style={styles.matchStatus}>In Progress</Text>
        </View>
        
        <View style={styles.matchTeams}>
          <View style={styles.teamContainer}>
            <Text style={styles.teamName}>{team1.name}</Text>
            <Text style={styles.teamScore}>{score[0]}</Text>
          </View>
          
          <Text style={styles.vsText}>VS</Text>
          
          <View style={styles.teamContainer}>
            <Text style={styles.teamName}>{team2.name}</Text>
            <Text style={styles.teamScore}>{score[1]}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.endMatchButton, isProcessing && styles.disabledButton]}
          onPress={() => handleEndMatch(item)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.endMatchButtonText}>End Match</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (!isAdmin) {
    return null; // Don't render anything if not admin
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f6fa" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Panel</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchActiveMatches}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Admin Actions Section */}
          <View style={styles.adminActionsContainer}>
            <Text style={styles.sectionTitle}>Admin Actions</Text>
            
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, isResettingTables && styles.disabledActionButton]}
                onPress={handleResetTables}
                disabled={isResettingTables}
              >
                {isResettingTables ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Reset All Tables</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, isResettingQueues && styles.disabledActionButton]}
                onPress={handleClearQueues}
                disabled={isResettingQueues}
              >
                {isResettingQueues ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Clear All Queues</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.dangerActionButton, isEndingAllMatches && styles.disabledActionButton]}
                onPress={handleEndAllMatches}
                disabled={isEndingAllMatches || activeMatches.length === 0}
              >
                {isEndingAllMatches ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>End All Matches</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Active Matches Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Active Matches</Text>
            
            {loading ? (
              <ActivityIndicator size="large" color="#2196f3" style={styles.loader} />
            ) : activeMatches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No active matches found</Text>
              </View>
            ) : (
              <FlatList
                data={activeMatches}
                renderItem={renderMatchItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                scrollEnabled={false} // Disable scrolling since we're using ScrollView
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Admin actions section
  adminActionsContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  dangerActionButton: {
    backgroundColor: '#e74c3c',
  },
  disabledActionButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Matches section
  sectionContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  listContent: {
    paddingBottom: 16,
  },
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  matchDate: {
    fontSize: 14,
    color: '#666',
  },
  matchStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  teamScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#95a5a6',
    marginHorizontal: 8,
  },
  endMatchButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
  },
  disabledButton: {
    backgroundColor: '#e74c3c80',
  },
  endMatchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loader: {
    marginTop: 32,
  },
});

export default AdminScreen;
