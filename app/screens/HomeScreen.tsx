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
import { useNavigation, CompositeNavigationProp, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, MainTabParamList } from '../types/navigation.types';
import { supabase } from '../api/supabase';
import { format } from 'date-fns';
import { Player } from '../types/database.types';
import { ExtendedPlayerProfile, ArchivedMatch } from '../types/custom.types';
import { fetchLastPlayedVenue } from '../api/venues';
import { VenueCard } from '../components/VenueCard';
import { useAuth } from '../context/AuthContext';

type HomeScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<MainTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isAdmin } = useAuth(); // Get authenticated user and admin status from context
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState<ExtendedPlayerProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [lastVenue, setLastVenue] = useState<any>(null);
  const [winRate, setWinRate] = useState<string>('0%');
  
  useEffect(() => {
    fetchUserData();
    calculateWinRate();
  }, [user]);
  
  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get the current user ID from auth context or use a fallback
      const currentUserId = user?.id || '00000000-0000-0000-0000-000000000001';
      
      // Fetch player profile
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', currentUserId)
        .single();
      
      if (playerError) throw playerError;
      setPlayerData(playerData);
      
      // Fetch recent matches
      const { data: matchData, error: matchError } = await supabase
        .from('match_archives')
        .select('*')
        .filter('players', 'cs', `{${currentUserId}}`)
        .order('end_time', { ascending: false })
        .limit(5);
      
      if (matchError) throw matchError;
      setRecentMatches(matchData || []);
      
      // Fetch last played venue
      const lastVenue = await fetchLastPlayedVenue(currentUserId);
      setLastVenue(lastVenue);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateWinRate = async () => {
    if (!user?.id) return setWinRate('0%');
    
    try {
      // Query match_archives to get wins and total matches for the user
      const { data, error } = await supabase
        .from('match_archives')
        .select('players, winner_player_id')
        .filter('players', 'cs', `{${user.id}}`) as {
          data: ArchivedMatch[] | null;
          error: any;
        };
      
      if (error) throw error;
      
      if (!data || data.length === 0) return setWinRate('0%');
      
      // Count total matches and wins
      const matchesPlayed = data.length;
      const matchesWon = data.filter(match => match.winner_player_id === user.id).length;
      
      if (matchesPlayed === 0) return setWinRate('0%');
      const winRate = (matchesWon / matchesPlayed) * 100;
      setWinRate(`${Math.round(winRate)}%`);
    } catch (error) {
      console.error('Error calculating win rate:', error);
      setWinRate('0%');
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
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f6fa" />
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
              onPress={() => navigation.navigate('MatchHistory')}
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
              // Ensure teams is properly typed and has fallbacks
              const teams = Array.isArray(match.teams) ? match.teams : [];
              const team1 = teams[0] || { name: 'Team 1', players: [] };
              const team2 = teams[1] || { name: 'Team 2', players: [] };
              
              // Ensure score is properly typed
              const score = match.score && typeof match.score === 'object' && 
                            match.score.current_score && Array.isArray(match.score.current_score) 
                            ? match.score.current_score 
                            : [0, 0];
              
              const startTime = match.start_time 
                ? format(new Date(match.start_time), 'MMM d, h:mm a') 
                : 'Unknown';
              
              const isActive = match.status === 'active';
              
              return (
                <TouchableOpacity 
                  key={match.id || index}
                  style={[
                    styles.matchCard,
                    isActive && styles.activeMatchCard
                  ]}
                  onPress={() => {
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
                    <Text style={styles.matchDate}>{startTime}</Text>
                    <Text style={[
                      styles.matchStatus,
                      isActive ? styles.activeStatus : styles.completedStatus
                    ]}>
                      {isActive ? 'In Progress' : 'Completed'}
                    </Text>
                  </View>
                  
                  <View style={styles.matchTeams}>
                    <View style={styles.teamContainer}>
                      <Text style={styles.teamName}>
                        {team1.playerDetails && team1.playerDetails[0]?.name || team1.name}
                      </Text>
                      <Text style={styles.teamScore}>{score[0]}</Text>
                    </View>
                    
                    <Text style={styles.vsText}>VS</Text>
                    
                    <View style={styles.teamContainer}>
                      <Text style={styles.teamName}>
                        {team2.playerDetails && team2.playerDetails[0]?.name || team2.name}
                      </Text>
                      <Text style={styles.teamScore}>{score[1]}</Text>
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
  matchDate: {
    fontSize: 14,
    color: '#7f8c8d',
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
