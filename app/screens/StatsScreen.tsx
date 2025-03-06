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

type StatsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Stats'>;

type Props = {
  navigation: StatsScreenNavigationProp;
};

export const StatsScreen: React.FC<Props> = ({ navigation }) => {
  const [matches, setMatches] = useState<ArchivedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
  }, []);
  
  const fetchStats = async () => {
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
      
      if (data && data.length > 0) {
        // Get all player IDs from all matches
        const allPlayerIds = new Set<string>();
        
        data.forEach(match => {
          // Add players from the players array
          if (match.players && Array.isArray(match.players)) {
            match.players.forEach(playerId => {
              if (playerId) allPlayerIds.add(playerId as string);
            });
          }
          
          // Check metadata for team players if needed
          if (match.metadata && match.metadata.teams) {
            const teams = match.metadata.teams;
            if (Array.isArray(teams)) {
              teams.forEach(team => {
                if (team.players && Array.isArray(team.players)) {
                  team.players.forEach(playerId => {
                    if (playerId) allPlayerIds.add(playerId as string);
                  });
                }
              });
            }
          }
        });
        
        // Get all unique table IDs from matches
        const allTableIds = new Set<string>();
        data.forEach(match => {
          if (match.table_id) {
            allTableIds.add(match.table_id);
          }
        });
        
        if (allPlayerIds.size > 0) {
          // Fetch player details for all player IDs
          const { data: playersData, error: playersError } = await supabase
            .from('players')
            .select('id,name')
            .in('id', Array.from(allPlayerIds));
            
          // Fetch table information for all tables in the matches
          const { data: tablesData, error: tablesError } = await supabase
            .from('tables')
            .select('id, name')
            .in('id', Array.from(allTableIds));
          
          if (playersError) {
            console.error('Error fetching player details:', playersError);
          } 
          
          if (tablesError) {
            console.error('Error fetching table information:', tablesError);
          }
          
          if (playersData) {
            // Create a map of player IDs to player names
            const playerMap = new Map<string, string>();
            playersData.forEach(player => {
              playerMap.set(player.id, player.name);
            });
            
            // Create a map of table IDs to table names
            const tableMap = new Map<string, string>();
            if (tablesData) {
              tablesData.forEach(table => {
                tableMap.set(table.id, table.name);
              });
            }
            
            // Enhance match data with player names
            const enhancedMatches = data.map(match => {
              // Create enhanced team names based on player data
              const enhancedTeams = [];
              
              // Try to get team data from metadata
              if (match.metadata && match.metadata.teams && Array.isArray(match.metadata.teams)) {
                const metadataTeams = match.metadata.teams;
                
                metadataTeams.forEach((team, index) => {
                  if (team.players && Array.isArray(team.players)) {
                    // Get player names for this team
                    const playerNames = team.players
                      .map(id => playerMap.get(id as string) || 'Unknown')
                      .join(' & ');
                    
                    enhancedTeams.push({
                      name: playerNames || `Team ${index + 1}`,
                      original: team.name
                    });
                  } else {
                    enhancedTeams.push({
                      name: team.name || `Team ${index + 1}`,
                      original: team.name
                    });
                  }
                });
              }
              
              // If we couldn't get team data from metadata, try using the players array
              if (enhancedTeams.length === 0 && match.players && Array.isArray(match.players)) {
                // For simplicity, assume first player is team 1, second player is team 2
                if (match.players.length > 0) {
                  const player1 = playerMap.get(match.players[0] as string) || 'Unknown';
                  enhancedTeams.push({ name: player1, original: 'Team 1' });
                }
                
                if (match.players.length > 1) {
                  const player2 = playerMap.get(match.players[1] as string) || 'Unknown';
                  enhancedTeams.push({ name: player2, original: 'Team 2' });
                }
              }
              
              // Make sure we have at least two teams
              while (enhancedTeams.length < 2) {
                enhancedTeams.push({ name: `Team ${enhancedTeams.length + 1}`, original: `Team ${enhancedTeams.length + 1}` });
              }
              
              // Get winner information from metadata or fallback methods
              let winnerTeam = null;
              
              // First check if winner_team is in metadata (new matches)
              if (match.metadata && match.metadata.winner_team) {
                winnerTeam = match.metadata.winner_team;
              }
              
              // Then check if we have it directly on the match object (legacy matches)
              if (!winnerTeam && match.winner_team) {
                winnerTeam = match.winner_team;
              }
              
              // Try to use enhanced team name if possible
              if (winnerTeam && enhancedTeams.some(team => team.original === winnerTeam)) {
                const winnerTeamObject = enhancedTeams.find(team => team.original === winnerTeam);
                if (winnerTeamObject) {
                  winnerTeam = winnerTeamObject.name;
                }
              }
              
              // If we still don't have a winner, use winner_player_id as fallback
              if ((!winnerTeam || winnerTeam === 'Unknown') && match.winner_player_id) {
                const playerName = playerMap.get(match.winner_player_id);
                if (playerName) {
                  winnerTeam = playerName;
                }
              }
              
              // Final fallback
              if (!winnerTeam) {
                winnerTeam = 'Unknown';
              }
              
              // Get table name from the map, or use a default
              const tableName = match.table_id ? tableMap.get(match.table_id) || 'Table' : 'Unknown Table';
              
              return {
                ...match,
                teams: enhancedTeams,
                winner_team: winnerTeam,
                tableName: tableName
              };
            });
            
            setMatches(enhancedMatches as ArchivedMatch[]);
            return;
          }
        }
      }
      
      // If we couldn't enhance data, just use the original data
      setMatches(data as ArchivedMatch[]);
    } catch (error) {
      console.error('Error fetching match history:', error);
      Alert.alert('Error', 'Failed to load match history');
    } finally {
      setLoading(false);
    }
  };
  
  const renderMatchItem = ({ item }: { item: ArchivedMatch }) => {
    // Safe format date with fallback
    let formattedDate = 'Unknown date';
    let formattedTime = 'Unknown time';
    try {
      if (item.start_time) {
        formattedDate = format(new Date(item.start_time), 'MMM d, yyyy');
        formattedTime = format(new Date(item.start_time), 'h:mm a');
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }
    
    // Safely extract scores with fallbacks
    const score1 = item.final_score && Array.isArray(item.final_score) && item.final_score.length > 0 
      ? item.final_score[0] 
      : 0;
    
    const score2 = item.final_score && Array.isArray(item.final_score) && item.final_score.length > 1 
      ? item.final_score[1] 
      : 0;
    
    // Safely extract team names
    const teams = item.teams || [];
    const team1Name = teams.length > 0 && teams[0]?.name ? teams[0].name : 'Team 1';
    const team2Name = teams.length > 1 && teams[1]?.name ? teams[1].name : 'Team 2';
    
    // Safe duration with fallback
    const duration = item.duration_minutes || 0;
    
    return (
      <View style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View style={styles.matchDateContainer}>
            <Text style={styles.matchDate}>{formattedDate}</Text>
            <Text style={styles.matchTime}>{formattedTime}</Text>
          </View>
          <Text style={styles.tableName}>{item.tableName || 'Unknown Table'}</Text>
        </View>
        
        <View style={styles.teamsContainer}>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{team1Name}</Text>
            <Text style={styles.teamScore}>{score1}</Text>
          </View>
          
          <Text style={styles.vsText}>VS</Text>
          
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{team2Name}</Text>
            <Text style={styles.teamScore}>{score2}</Text>
          </View>
        </View>
        
        <View style={styles.matchFooter}>
          <Text style={styles.winnerText}>
            Winner: <Text style={styles.winnerName}>{item.winner_team || 'Unknown'}</Text>
          </Text>
          <Text style={styles.durationText}>
            Duration: {duration} min
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
        onPress={fetchStats}
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
    alignItems: 'center',
  },
  matchDateContainer: {
    flexDirection: 'column',
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
  tableName: {
    fontSize: 13,
    color: '#3498db',
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
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
