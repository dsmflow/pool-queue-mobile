import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, MainTabRouteProp } from '../types/navigation.types';
import { supabase } from '../api/supabase';
import { TableCard } from '../components/TableCard';
import { Json } from '../types/database.types';

type MatchesScreenProps = {
  route: MainTabRouteProp<'Matches'>;
};

type Table = {
  id: string;
  name: string;
  type: string;
  is_available: boolean;
  venue_id: string;
  created_at: string;
  metadata: Json;
};

export const MatchesScreen: React.FC<MatchesScreenProps> = ({ route }) => {
  const { venueId } = route.params;
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const [venue, setVenue] = useState<{ name: string } | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const refreshTimestampRef = useRef<number>(Date.now());

  const fetchVenueData = async () => {
    // Update refresh timestamp to ensure we're loading fresh data
    refreshTimestampRef.current = Date.now();
    const currentRefreshId = refreshTimestampRef.current;
    
    console.log(`[MatchesScreen] Fetching venue data for venue: ${venueId}, refreshId: ${currentRefreshId}`);
    try {
      // Fetch venue details
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('name')
        .eq('id', venueId)
        .single();
      
      // Make sure we're not processing stale data if there were multiple refreshes
      if (currentRefreshId !== refreshTimestampRef.current) {
        console.log(`[MatchesScreen] Refresh superseded, discarding results`);
        return;
      }
      
      if (venueError) throw venueError;
      console.log(`[MatchesScreen] Venue data fetched: ${venueData?.name}`);
      setVenue(venueData);
      
      // Fetch tables for this venue
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('venue_id', venueId)
        .order('name');
      
      // Check again for stale data
      if (currentRefreshId !== refreshTimestampRef.current) {
        console.log(`[MatchesScreen] Refresh superseded, discarding table results`);
        return;
      }
      
      if (tablesError) throw tablesError;
      console.log(`[MatchesScreen] Fetched ${tablesData?.length || 0} tables for venue ${venueId}`);
      setTables(tablesData as Table[]);
    } catch (error) {
      console.error(`[MatchesScreen] Error fetching venue data for venue ${venueId}:`, error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchVenueData();
    
    // Set up a refresh interval to periodically update data
    const refreshInterval = setInterval(() => {
      console.log(`[MatchesScreen] Auto-refreshing venue data`);
      fetchVenueData();
    }, 30000); // Refresh every 30 seconds
    
    // Clean up interval on unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [venueId]);
  
  // Check for refresh parameter in route.params and refresh data if needed
  useEffect(() => {
    // If the route has a refresh parameter, refresh the data
    if (route.params?.refresh) {
      console.log(`[MatchesScreen] Refresh parameter detected, refreshing data (timestamp: ${route.params?.timestamp || 'none'})`);
      setRefreshing(true);
      fetchVenueData();
    }
  }, [route.params?.refresh, route.params?.timestamp]);

  const handleRefresh = () => {
    console.log(`[MatchesScreen] Manual refresh requested`);
    setRefreshing(true);
    fetchVenueData();
  };
  
  const handleTablePress = (tableId: string, isAvailable: boolean, joinQueue: boolean = false) => {
    console.log(`[MatchesScreen] Table pressed - tableId: ${tableId}, isAvailable: ${isAvailable}, joinQueue: ${joinQueue}`);
    
    if (isAvailable) {
      // Navigate to match setup if table is available
      console.log(`[MatchesScreen] Table available, navigating to match setup`);
      navigation.navigate('MatchSetup', { 
        tableId,
        timestamp: Date.now() // Force fresh navigation
      });
    } else if (joinQueue) {
      // Navigate to queue screen if user wants to join the queue
      console.log(`[MatchesScreen] Join queue requested, navigating to queue screen`);
      navigation.navigate('Queue', { 
        tableId,
        timestamp: Date.now() // Force fresh navigation
      });
    } else {
      // Navigate to active match if table is in use
      console.log(`[MatchesScreen] Navigating to match details screen`);
      
      // Need to find the active match for this table
      // For now, navigate to Queue screen which will show match details
      navigation.navigate('Queue', { 
        tableId,
        timestamp: Date.now() // Force fresh navigation
      });
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
            onPress={handleTablePress}
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
