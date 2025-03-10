import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../api/supabase';
import { TableCard } from '../components/TableCard';
import { RootStackParamList, MainTabRouteProp } from '../types/navigation.types';
import { addToQueue, fetchPlayers } from '../api/tables';
import { Player } from '../types/database.types';
import { PlayerSelector } from '../components/PlayerSelector';
import { ActiveMatchBanner } from '../components/ActiveMatchBanner';

type MatchesScreenProps = {
  route: MainTabRouteProp<'Matches'>;
};

type Table = {
  id: string;
  name: string;
  type: string;
  is_available: boolean;
};

export const MatchesScreen: React.FC<MatchesScreenProps> = ({ route }) => {
  const { venueId, refresh, timestamp } = route.params;
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const [venue, setVenue] = useState<{ name: string } | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showPlayerSelector, setShowPlayerSelector] = useState<boolean>(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  const fetchVenueData = async () => {
    try {
      // Ensure venueId is a valid UUID format
      if (!venueId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(venueId)) {
        console.error('Invalid venue ID format:', venueId);
        // Fetch the default venue instead
        const { data: defaultVenue, error: defaultVenueError } = await supabase
          .from('venues')
          .select('id')
          .limit(1)
          .single();
        
        if (defaultVenueError) throw defaultVenueError;
        
        // Navigate to the valid venue ID
        if (defaultVenue && defaultVenue.id) {
          navigation.setParams({ venueId: defaultVenue.id });
          return; // The component will re-render with the new venueId
        } else {
          throw new Error('No valid venues found in the database');
        }
      }
      
      // Fetch venue details
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('name')
        .eq('id', venueId)
        .single();
      
      if (venueError) throw venueError;
      setVenue(venueData);
      
      // Fetch tables for this venue
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('venue_id', venueId)
        .order('name');
      
      if (tablesError) throw tablesError;
      setTables(tablesData as Table[]);
      
      // Fetch players for queue joining
      const playersData = await fetchPlayers();
      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching venue data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchVenueData();
  }, [venueId, refresh, timestamp]);
  
  // Add a focus listener to refetch data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('VenueScreen focused - refreshing table data');
      fetchVenueData();
    });
    
    return unsubscribe;
  }, [navigation]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchVenueData();
  };
  
  const handleTablePress = async (tableId: string, isAvailable: boolean, joinQueue: boolean = false) => {
    // Always check the current table status from the server
    // This ensures we're working with the latest table availability
    try {
      // Get the current status of the table from the server
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('is_available')
        .eq('id', tableId)
        .single();
        
      if (tableError) {
        console.error('Error fetching current table status:', tableError);
        // Continue with cached data
      } else if (tableData) {
        // Update local state if server status differs
        if (tableData.is_available !== isAvailable) {
          console.log(`Table ${tableId} status mismatch - UI: ${isAvailable}, Server: ${tableData.is_available}`);
          isAvailable = tableData.is_available;
          
          // Update the table in our local state
          setTables(prevTables => 
            prevTables.map(table => 
              table.id === tableId ? { ...table, is_available: tableData.is_available } : table
            )
          );
        }
      }
      
      // Now use the verified availability status
      if (isAvailable) {
        // Navigate to match setup if table is available
        navigation.navigate('MatchSetup', { tableId });
      } else if (joinQueue) {
        // Navigate to the dedicated queue screen for this table
        navigation.navigate('Queue', { tableId });
      } else {
        // Check for active match on this table
        const { data, error } = await supabase
          .from('matches')
          .select('id')
          .eq('table_id', tableId)
          .eq('status', 'active')
          .single();
        
        if (error && error.code !== 'PGRST116') { // Not PGRST116 (record not found)
          throw error;
        }
        
        if (data && data.id) {
          // Navigate to the active match
          navigation.navigate('Match', { matchId: data.id, tableId });
        } else {
          // No active match but table shows as unavailable - data inconsistency
          Alert.alert(
            'Table Status Issue',
            'This table appears to be unavailable, but no active match was found. The table status will be refreshed.',
            [{ 
              text: 'OK',
              onPress: () => {
                // Force refresh data
                fetchVenueData();
              }
            }]
          );
        }
      }
    } catch (error) {
      console.error('Error handling table press:', error);
      Alert.alert('Error', 'Could not process this action. Please try again.');
    }
  };
  
  const handleJoinQueue = async (playerId: string) => {
    if (!selectedTableId) return;
    
    try {
      await addToQueue(selectedTableId, playerId);
      Alert.alert('Success', 'You have been added to the queue.');
      setShowPlayerSelector(false);
      setSelectedTableId(null);
      fetchVenueData(); // Refresh the data to show updated queue
    } catch (error) {
      console.error('Error joining queue:', error);
      Alert.alert('Error', 'Failed to join the queue. Please try again.');
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
      <View style={styles.header}>
        <Text style={styles.venueName}>{venue?.name || 'Venue'}</Text>
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => navigation.navigate('Stats')}
        >
          <Text style={styles.historyButtonText}>History</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={tables}
        renderItem={({ item }) => (
          <TableCard
            table={item}
            onPress={() => handleTablePress(item.id, item.is_available, !item.is_available)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.tableList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#0000ff']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tables found for this venue</Text>
          </View>
        }
      />
      
      <PlayerSelector
        visible={showPlayerSelector}
        players={players}
        onSelect={handleJoinQueue}
        onClose={() => setShowPlayerSelector(false)}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  venueName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  historyButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  historyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  tableList: {
    padding: 16,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});

export default MatchesScreen;