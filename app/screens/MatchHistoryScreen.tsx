import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  Alert
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { supabase } from '../api/supabase';
import { format } from 'date-fns';
import { ArchivedMatch } from '../types/custom.types';

type MatchHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MatchHistory'>;

type Props = {
  navigation: MatchHistoryScreenNavigationProp;
};

export const MatchHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [matches, setMatches] = useState<ArchivedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchMatchHistory();
  }, []);
  
  const fetchMatchHistory = async () => {
    try {
      setLoading(true);
      
      // Check if the match_archives table exists
      const { data: tableExists, error: tableCheckError } = await supabase
        .from('match_archives')
        .select('id')
        .limit(1);
      
      if (tableCheckError) {
        // Table might not exist yet
        console.error('Error checking match_archives table:', tableCheckError);
        Alert.alert(
          'Setup Required',
          'The match history feature requires setup. Please create a match_archives table in your Supabase database.'
        );
        setLoading(false);
        return;
      }
      
      // Fetch match history
      const { data, error } = await supabase
        .from('match_archives')
        .select('*')
        .order('archived_at', { ascending: false });
      
      if (error) throw error;
      
      setMatches(data as ArchivedMatch[]);
    } catch (error) {
      console.error('Error fetching match history:', error);
      Alert.alert('Error', 'Failed to load match history');
    } finally {
      setLoading(false);
    }
  };
  
  const renderMatchItem = ({ item }: { item: ArchivedMatch }) => {
    const formattedDate = format(new Date(item.start_time), 'MMM d, yyyy');
    const formattedTime = format(new Date(item.start_time), 'h:mm a');
    
    return (
      <View style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchDate}>{formattedDate}</Text>
          <Text style={styles.matchTime}>{formattedTime}</Text>
        </View>
        
        <View style={styles.teamsContainer}>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>
              {item.teams[0]?.name || 'Team 1'}
            </Text>
            <Text style={styles.teamScore}>{item.final_score[0]}</Text>
          </View>
          
          <Text style={styles.vsText}>VS</Text>
          
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>
              {item.teams[1]?.name || 'Team 2'}
            </Text>
            <Text style={styles.teamScore}>{item.final_score[1]}</Text>
          </View>
        </View>
        
        <View style={styles.matchFooter}>
          <Text style={styles.winnerText}>
            Winner: <Text style={styles.winnerName}>{item.winner_team}</Text>
          </Text>
          <Text style={styles.durationText}>
            Duration: {item.duration_minutes} min
          </Text>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Stats</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No stats found</Text>
          <Text style={styles.emptySubtext}>
            Complete a match to see it in your history
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
      
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchMatchHistory}
      >
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    fontWeight: '600',
    color: '#34495e',
  },
  matchTime: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  teamInfo: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
    textAlign: 'center',
  },
  teamScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#95a5a6',
    marginHorizontal: 8,
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 12,
  },
  winnerText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  winnerName: {
    fontWeight: 'bold',
    color: '#27ae60',
  },
  durationText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  refreshButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
