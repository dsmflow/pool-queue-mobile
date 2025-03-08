import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform 
} from 'react-native';
import { useNavigation, CompositeNavigationProp, CommonActions, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, MainTabParamList } from '../types/navigation.types';
import { supabase } from '../api/supabase';
import { format } from 'date-fns';
import { Player } from '../types/database.types';
import { ExtendedPlayerProfile, ArchivedMatch } from '../types/custom.types';
import { fetchLastPlayedVenue } from '../api/venues';
import { VenueCard } from '../components/VenueCard';
import { ActiveMatchBanner } from '../components/ActiveMatchBanner';
import { TurnNotificationBanner } from '../components/TurnNotificationBanner';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

type HomeScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<MainTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<any>();
  const { user, isAdmin } = useAuth(); // Get authenticated user and admin status from context
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState<ExtendedPlayerProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [lastVenue, setLastVenue] = useState<any>(null);
  const [winRate, setWinRate] = useState<string>('0%');
  
  // Check for refresh parameter from navigation
  const shouldRefresh = route.params?.refresh === true;
  
  useEffect(() => {
    fetchUserData();
  }, [user]);

  // Add focus listener to refresh player data when screen is focused
  useEffect(() => {
    // Force immediate refresh on mount
    if (user) {
      refreshPlayerRating();
    }
    
    // Set up a listener for when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('HomeScreen focused - refreshing player data');
      if (user) {
        refreshPlayerRating();
      }
    });

    return unsubscribe;
  }, [navigation, user]);
  
  // Handle refresh parameter from navigation
  useEffect(() => {
    if (shouldRefresh) {
      console.log('HomeScreen received refresh parameter - refreshing data');
      fetchUserData();
      
      // Clear the refresh parameter to prevent continuous refreshing
      navigation.setParams({ refresh: undefined });
    }
  }, [shouldRefresh, navigation]);

  useEffect(() => {
    calculateWinRate();
  }, [playerData]);
  
  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get the current user ID from auth context or use a fallback
      const currentUserId = user?.id || '00000000-0000-0000-0000-000000000001';
      
      console.log('Current user ID:', currentUserId);
      
      // Fetch player profile
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', currentUserId)
        .single();
      
      if (playerError) {
        console.error('Error fetching player profile:', playerError);
        
        // If the player profile doesn't exist, create one
        if (playerError.code === 'PGRST116') { // No rows returned error
          console.log('No player profile found, creating one...');
          
          // Create a default player profile
          const { data: newPlayerData, error: createError } = await supabase
            .from('players')
            .insert([
              { 
                id: currentUserId,
                name: user?.email?.split('@')[0] || 'New Player',
                email: user?.email,
                rating: 1500,
                metadata: {}
              }
            ])
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating player profile:', createError);
            throw createError;
          }
          
          console.log('Created new player profile:', newPlayerData);
          setPlayerData(newPlayerData);
        } else {
          throw playerError;
        }
      } else {
        console.log('Found existing player profile:', playerData);
        setPlayerData(playerData);
      }
      
      // Fetch match archives to calculate games played and won
      const { data: matchData, error: matchError } = await supabase
        .from('match_archives')
        .select('*')
        .order('end_time', { ascending: false });
      
      if (matchError) {
        console.error('Error fetching match archives:', matchError);
        throw matchError;
      }
      
      console.log('Match archives data:', JSON.stringify(matchData?.slice(0, 3)));
      
      // Filter matches where the current user was a player
      const userMatches = matchData?.filter(match => 
        match.players && Array.isArray(match.players) && match.players.includes(currentUserId)
      ) || [];
      
      // Get all player IDs from the matches
      const allPlayerIds = new Set<string>();
      userMatches.forEach(match => {
        if (match.players && Array.isArray(match.players)) {
          match.players.forEach(playerId => {
            allPlayerIds.add(playerId as string);
          });
        }
      });
      
      // Get all unique table IDs from matches
      const allTableIds = new Set<string>();
      userMatches.forEach(match => {
        if (match.table_id) {
          allTableIds.add(match.table_id);
        }
      });
      
      // Fetch player names for all players in the matches
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name')
        .in('id', Array.from(allPlayerIds));
      
      if (playersError) {
        console.error('Error fetching player names:', playersError);
      }
      
      // Fetch table information for all tables in the matches
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('id, name')
        .in('id', Array.from(allTableIds));
      
      if (tablesError) {
        console.error('Error fetching table information:', tablesError);
      }
      
      // Create a map of player IDs to player names
      const playerMap = new Map<string, string>();
      if (playersData) {
        playersData.forEach(player => {
          playerMap.set(player.id, player.name);
        });
      }
      
      // Create a map of table IDs to table names
      const tableMap = new Map<string, string>();
      if (tablesData) {
        tablesData.forEach(table => {
          tableMap.set(table.id, table.name);
        });
      }
      
      // Enhance match data with player names
      const enhancedMatches = userMatches.map(match => {
        // Extract player names for each team from metadata
        let team1Players: string[] = [];
        let team2Players: string[] = [];
        let score = [0, 0];
        
        console.log('Processing match:', match.id);
        console.log('Match metadata:', JSON.stringify(match.metadata));
        console.log('Match final_score:', JSON.stringify(match.final_score));
        
        // Try to get the score from final_score
        if (match.final_score && Array.isArray(match.final_score)) {
          score = match.final_score as number[];
        } else if (match.final_score && typeof match.final_score === 'object') {
          // Try to extract score from final_score object
          const finalScore = match.final_score as any;
          if (finalScore.current_score && Array.isArray(finalScore.current_score)) {
            score = finalScore.current_score;
          }
        }
        
        // If score is still not found, try to get it from metadata
        if (score[0] === 0 && score[1] === 0 && match.metadata) {
          const metadata = match.metadata as any;
          
          // Check for score in various possible locations in metadata
          if (metadata.score && Array.isArray(metadata.score)) {
            score = metadata.score;
          } else if (metadata.score && typeof metadata.score === 'object' && metadata.score.current_score) {
            score = metadata.score.current_score;
          } else if (metadata.current_score && Array.isArray(metadata.current_score)) {
            score = metadata.current_score;
          }
          
          // For demo/testing purposes, set some default scores if we still don't have any
          if (score[0] === 0 && score[1] === 0) {
            score = [2, 0]; // Default to 2-0 for testing
          }
        }
        
        // Try to get team names and players from metadata
        if (match.metadata && typeof match.metadata === 'object') {
          // Check if teams are in the metadata directly
          if (match.metadata.teams && Array.isArray(match.metadata.teams)) {
            const teams = match.metadata.teams as any[];
            
            console.log('Teams from metadata:', JSON.stringify(teams));
            
            if (teams.length > 0) {
              if (teams[0].players && Array.isArray(teams[0].players)) {
                team1Players = teams[0].players.map((playerId: string) => 
                  playerMap.get(playerId) || 'Unknown'
                );
              }
              if (teams.length > 1 && teams[1].players && Array.isArray(teams[1].players)) {
                team2Players = teams[1].players.map((playerId: string) => 
                  playerMap.get(playerId) || 'Unknown'
                );
              }
            }
          }
        }
        
        // If we couldn't get team names from metadata, try to determine them from players array
        if (team1Players.length === 0 && team2Players.length === 0) {
          // If we have a players array, try to determine teams
          if (match.players && Array.isArray(match.players)) {
            console.log('Players array:', JSON.stringify(match.players));
            
            // If we have at least one player, put them in team 1
            if (match.players.length > 0) {
              const playerId = match.players[0] as string;
              team1Players = [playerMap.get(playerId) || 'Unknown'];
            }
            
            // If we have at least two players, put the second in team 2
            if (match.players.length > 1) {
              const playerId = match.players[1] as string;
              team2Players = [playerMap.get(playerId) || 'Unknown'];
            }
          }
        }
        
        // If we still don't have team names, use defaults
        if (team1Players.length === 0) team1Players = ['Team 1'];
        if (team2Players.length === 0) team2Players = ['Team 2'];
        
        // Ensure we have a valid score
        if (!Array.isArray(score) || score.length !== 2) {
          score = [0, 0];
        }
        
        console.log(`Team 1: ${team1Players.join(' & ')}, Team 2: ${team2Players.join(' & ')}, Score: ${score[0]}-${score[1]}`);
        
        // Get table name from the map, or use a default
        const tableName = match.table_id ? tableMap.get(match.table_id) || 'Table' : 'Unknown Table';
        
        return {
          ...match,
          enhancedData: {
            team1Name: team1Players.join(' & '),
            team2Name: team2Players.join(' & '),
            score: score,
            tableName: tableName
          }
        };
      });
      
      // Set recent matches (limited to 5)
      setRecentMatches(enhancedMatches.slice(0, 5) || []);
      
      // Calculate games played and won
      const gamesPlayed = userMatches.length || 0;
      const gamesWon = userMatches.filter(match => match.winner_player_id === currentUserId).length || 0;
      
      console.log(`Games played: ${gamesPlayed}, Games won: ${gamesWon}`);
      
      // Update player data with calculated stats
      setPlayerData(prevData => ({
        ...prevData,
        games_played: gamesPlayed,
        games_won: gamesWon
      }));
      
      // Fetch last played venue
      const lastVenue = await fetchLastPlayedVenue(currentUserId);
      setLastVenue(lastVenue);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Add a new function to refresh player rating and ensure it's in sync with match history
  const refreshPlayerRating = async () => {
    if (!user) return;
    
    try {
      console.log('Refreshing player rating for user:', user.id);
      const currentUserId = user.id;
      
      // 1. Fetch player's current data from the database
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', currentUserId)
        .single();
        
      if (playerError) {
        console.error('Error fetching player data:', playerError);
        return;
      }
      
      console.log('Fetched player data from DB:', JSON.stringify(playerData));
      
      // 2. Check match archives for the latest rating
      const { data: matchArchives, error: archiveError } = await supabase
        .from('match_archives')
        .select('metadata')
        .order('end_time', { ascending: false })
        .limit(10);
        
      if (archiveError) {
        console.error('Error fetching match archives:', archiveError);
      }
      
      // Look for the latest rating change for this player
      let latestRating = playerData.rating || 1500;
      let foundRatingUpdate = false;
      
      if (matchArchives && matchArchives.length > 0) {
        console.log(`Checking ${matchArchives.length} match archives for rating updates`);
        
        for (const match of matchArchives) {
          if (match.metadata && 
              match.metadata.rating_changes && 
              match.metadata.rating_changes[currentUserId]) {
            
            const ratingChange = match.metadata.rating_changes[currentUserId];
            console.log(`Found rating change in archive: ${JSON.stringify(ratingChange)}`);
            
            // Use the most recent final rating
            latestRating = ratingChange.final;
            foundRatingUpdate = true;
            break;
          }
        }
      }
      
      // 3. If the latest rating from matches differs from DB, update the database
      if (foundRatingUpdate && latestRating !== playerData.rating) {
        console.log(`Updating player rating in DB from ${playerData.rating} to ${latestRating}`);
        
        // Update the database with the correct rating
        const { error: updateError } = await supabase
          .from('players')
          .update({ rating: latestRating })
          .eq('id', currentUserId);
          
        if (updateError) {
          console.error('Error updating player rating in database:', updateError);
        }
      }
      
      // 4. Update the UI with the player data including correct rating
      setPlayerData(prevData => ({
        ...prevData,  // Keep existing calculated data
        ...playerData, // Get latest DB fields
        rating: latestRating, // Use the latest rating (from matches or DB)
        // Preserve calculated stats
        games_played: prevData?.games_played || 0,
        games_won: prevData?.games_won || 0
      }));
      
      console.log(`Player rating set to: ${latestRating}`);
      
    } catch (error) {
      console.error('Error in refreshPlayerRating:', error);
    }
  };
  
  const calculateWinRate = () => {
    if (!playerData) {
      setWinRate('0%');
      return;
    }
    
    const gamesPlayed = playerData.games_played || 0;
    const gamesWon = playerData.games_won || 0;
    
    if (gamesPlayed === 0) {
      setWinRate('0%');
      return;
    }
    
    const rate = (gamesWon / gamesPlayed) * 100;
    setWinRate(`${Math.round(rate)}%`);
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f6fa" />
      <ActiveMatchBanner />
      <TurnNotificationBanner />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Player Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {playerData?.avatar_url ? (
                <Image 
                  source={{ uri: playerData.avatar_url }} 
                  style={styles.avatar} 
                />
              ) : (
                <View style={[styles.avatar, styles.defaultAvatar]}>
                  <Text style={styles.avatarText}>
                    {playerData?.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.playerName}>{playerData?.name || 'New Player'}</Text>
              <Text style={styles.playerRating}>Rating: {playerData?.rating !== undefined ? playerData.rating.toString() : 'Unrated'}</Text>
                  <TouchableOpacity onPress={refreshPlayerRating}>
                    <Text style={styles.refreshRatingText}>⟳ Refresh</Text>
                  </TouchableOpacity>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{playerData?.games_played || 0}</Text>
                  <Text style={styles.statLabel}>Games</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{playerData?.games_won || 0}</Text>
                  <Text style={styles.statLabel}>Wins</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{winRate}</Text>
                  <Text style={styles.statLabel}>Win Rate</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.profileActions}>
            <TouchableOpacity
              style={styles.profileActionButton}
              onPress={() => navigation.navigate('ProfileScreen')}
            >
              <Text style={styles.profileActionButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.profileActionButton}
              onPress={() => navigation.dispatch(
                CommonActions.navigate('Stats')
              )}
            >
              <Text style={styles.profileActionButtonText}>Stats</Text>
            </TouchableOpacity>
            
            {isAdmin && (
              <TouchableOpacity
                style={[styles.profileActionButton, styles.adminButton]}
                onPress={() => navigation.navigate('AdminScreen')}
              >
                <Text style={styles.profileActionButtonText}>Admin Panel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Venues Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Venues</Text>
          
          {lastVenue && lastVenue.venue ? (
            <VenueCard 
              venue={lastVenue.venue}
              lastPlayed={lastVenue.lastMatch?.start_time}
              onPress={() => {
                if (lastVenue && lastVenue.venue && lastVenue.venue.id) {
                  navigation.navigate('Matches', { 
                    venueId: lastVenue.venue.id 
                  });
                } else {
                  console.error('Invalid venue data');
                }
              }}
            />
          ) : (
            <View style={styles.emptyMatchesContainer}>
              <Text style={styles.emptyMatchesText}>No recent venues found</Text>
              <TouchableOpacity 
                style={styles.findMatchButton}
                onPress={async () => {
                  try {
                    const { data, error } = await supabase
                      .from('venues')
                      .select('id')
                      .limit(1)
                      .single();
                    
                    if (error) throw error;
                    
                    if (data && data.id) {
                      navigation.navigate('Matches', { venueId: data.id });
                    } else {
                      console.error('No venues found');
                      // Show an error or create a venue
                    }
                  } catch (error) {
                    console.error('Error fetching venue:', error);
                  }
                }}
              >
                <Text style={styles.findMatchButtonText}>Find a Venue</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Recent Matches */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Matches</Text>
          
          {recentMatches.length === 0 ? (
            <View style={styles.emptyMatchesContainer}>
              <Text style={styles.emptyMatchesText}>No recent matches found</Text>
              <TouchableOpacity 
                style={styles.findMatchButton}
                onPress={async () => {
                  try {
                    const { data, error } = await supabase
                      .from('venues')
                      .select('id')
                      .limit(1)
                      .single();
                    
                    if (error) throw error;
                    
                    if (data && data.id) {
                      navigation.navigate('Matches', { venueId: data.id });
                    } else {
                      console.error('No venues found');
                      // Show an error or create a venue
                    }
                  } catch (error) {
                    console.error('Error fetching venue:', error);
                  }
                }}
              >
                <Text style={styles.findMatchButtonText}>Find a Match</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentMatches.map((match, index) => {
              // Format the date consistently
              let formattedDate = 'Unknown date';
              try {
                if (match.end_time) {
                  formattedDate = format(new Date(match.end_time), 'MMM d, h:mm a');
                } else if (match.start_time) {
                  formattedDate = format(new Date(match.start_time), 'MMM d, h:mm a');
                }
              } catch (error) {
                console.error('Error formatting date:', error);
              }
              
              // Determine match status
              const isActive = match.status === 'active';
              const statusText = isActive ? 'In Progress' : 'Completed';
              
              return (
                <TouchableOpacity 
                  key={match.id || index}
                  style={[
                    styles.matchCard,
                    isActive && styles.activeMatchCard
                  ]}
                  onPress={() => {
                    if (!match.id || !match.table_id) {
                      console.log('Cannot navigate: missing match ID or table ID');
                      return;
                    }
                    
                    // Navigate through the root stack using CommonActions
                    navigation.dispatch(
                      CommonActions.navigate({
                        name: 'Match',
                        params: { 
                          matchId: match.id, 
                          tableId: match.table_id 
                        }
                      })
                    );
                  }}
                >
                  <View style={styles.matchHeader}>
                    <View style={styles.matchDateContainer}>
                      <Text style={styles.matchDate}>{formattedDate}</Text>
                      <Text style={styles.tableName}>{match.enhancedData.tableName}</Text>
                    </View>
                    <Text style={[
                      styles.matchStatus,
                      isActive ? styles.activeStatus : styles.completedStatus
                    ]}>
                      {statusText}
                    </Text>
                  </View>
                  
                  <View style={styles.matchTeams}>
                    <View style={styles.teamContainer}>
                      <Text style={styles.teamName}>{match.enhancedData.team1Name}</Text>
                      <Text style={styles.teamScore}>{match.enhancedData.score[0]}</Text>
                    </View>
                    
                    <Text style={styles.vsText}>VS</Text>
                    
                    <View style={styles.teamContainer}>
                      <Text style={styles.teamName}>{match.enhancedData.team2Name}</Text>
                      <Text style={styles.teamScore}>{match.enhancedData.score[1]}</Text>
                    </View>
                  </View>
                  
                  {isActive && (
                    <TouchableOpacity
                      style={styles.continueMatchButton}
                      onPress={() => {
                        navigation.dispatch(
                          CommonActions.navigate({
                            name: 'Match',
                            params: { 
                              matchId: match.id, 
                              tableId: match.table_id 
                            }
                          })
                        );
                      }}
                    >
                      <Text style={styles.continueMatchButtonText}>Continue Match</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  },
  refreshRatingText: {
    fontSize: 12,
    color: '#3498db',
    marginBottom: 8,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  defaultAvatar: {
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  playerRating: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  emptyMatchesContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyMatchesText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  findMatchButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  findMatchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
  activeMatchCard: {
    borderWidth: 2,
    borderColor: '#2196f3',
    backgroundColor: '#f8fdff',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  matchDateContainer: {
    flexDirection: 'column',
  },
  matchDate: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  tableName: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  matchStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeStatus: {
    backgroundColor: '#e3f2fd',
    color: '#2196f3',
  },
  completedStatus: {
    backgroundColor: '#e8f5e9',
    color: '#4caf50',
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
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
  continueMatchButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 12,
  },
  continueMatchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  profileActionButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  adminButton: {
    backgroundColor: '#e74c3c',
  },
  profileActionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
