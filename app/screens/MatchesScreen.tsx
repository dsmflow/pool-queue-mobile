import React, { useEffect, useState } from 'react';
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

  const fetchVenueData = async () => {
    try {
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
    } catch (error) {
      console.error('Error fetching venue data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchVenueData();
  }, [venueId]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchVenueData();
  };
  
  const handleTablePress = (tableId: string, isAvailable: boolean) => {
    if (isAvailable) {
      // Navigate to match setup if table is available
      navigation.navigate('MatchSetup', { tableId });
    } else {
      // Navigate to active match if table is in use
      // You would need to fetch the active match ID for this table
      // For now, we'll just show a message
      console.log('Table is in use');
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
          onPress={() => navigation.navigate('MatchHistory')}
        >
          <Text style={styles.historyButtonText}>History</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={tables}
        renderItem={({ item }) => (
          <TableCard
            table={item}
            onPress={() => handleTablePress(item.id, item.is_available)}
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
