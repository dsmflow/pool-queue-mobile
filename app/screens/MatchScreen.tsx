import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  Image
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { fetchMatch, updateMatchScore, endMatch, archiveMatch, updateTeamTypes } from '../api/matches';
import { supabase } from '../api/supabase';
import { EnhancedMatch, TeamData } from '../types/custom.types';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { validateMatchScore, validateTeams, validateMetadata, getSafeTeam, getSafeScore } from '../utils/validationUtils';

type MatchScreenRouteProp = RouteProp<RootStackParamList, 'Match'>;
type MatchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Match'>;

type Props = {
  route: MatchScreenRouteProp;
  navigation: MatchScreenNavigationProp;
};

export const MatchScreen: React.FC<Props> = ({ route, navigation }) => {
  const { matchId, tableId } = route.params;
  const { user } = useAuth();
  const [match, setMatch] = useState<EnhancedMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number[]>([0, 0]);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<number | null>(null);
  const [showBallTypeModal, setShowBallTypeModal] = useState(false);
  const [remoteUpdate, setRemoteUpdate] = useState<boolean>(false);
  const [matchEnded, setMatchEnded] = useState<boolean>(false);
  const [ratingChanges, setRatingChanges] = useState<{[key: string]: {initial: number, final: number}} | null>(null);
  const [winnerTeamIndex, setWinnerTeamIndex] = useState<number | null>(null);
  const subscriptionRef = useRef<any>(null);
  
  // Set up realtime subscription for match updates
  useEffect(() => {
    if (!matchId) return;
    
    const setupSubscription = async () => {
      console.log(`Setting up subscription for match: ${matchId}`);
      
      // Clear any existing subscription
      if (subscriptionRef.current) {
        try {
          // Use unsubscribe instead of removeSubscription
          subscriptionRef.current.unsubscribe();
          console.log('Successfully unsubscribed from previous channel');
        } catch (err) {
          console.error('Error unsubscribing from channel:', err);
        }
        subscriptionRef.current = null;
      }
      
      // Subscribe to changes on the matches table for this match
      const channel = supabase
        .channel('match-updates')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'matches',
            filter: `id=eq.${matchId}`
          }, 
          (payload: { 
            eventType: 'INSERT' | 'UPDATE' | 'DELETE'; 
            new: Match | null; 
            old: Match | null;
          }) => {
            console.log('Match update received:', payload);
            
            // Handle different types of updates
            if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedMatch = payload.new;
              
              // Check if the match has been completed (status changed to completed)
              if (updatedMatch.status === 'completed' && match?.status === 'active') {
                console.log('Match completed remotely');
                setMatchEnded(true);
                setRemoteUpdate(true);
                
                // Determine the winner based on the score
                const scoreData = updatedMatch.score as any;
                const finalScore = scoreData?.current_score || [0, 0];
                const winningTeamIndex = finalScore[0] > finalScore[1] ? 0 : 1;
                setWinnerTeamIndex(winningTeamIndex);
                
                // Update the score to match the server state
                setScore(finalScore);
                
                // Check if there are any match archives created with rating changes for this match
                checkForMatchArchive();
              } 
              // Handle score updates
              else if (updatedMatch.score && JSON.stringify(updatedMatch.score) !== JSON.stringify(match?.score)) {
                console.log('Score updated remotely');
                const scoreData = updatedMatch.score as any;
                setScore(scoreData.current_score || [0, 0]);
                setRemoteUpdate(true);
              }
              // Handle team type updates (stripes/solids)
              else if (updatedMatch.teams && JSON.stringify(updatedMatch.teams) !== JSON.stringify(match?.teams)) {
                console.log('Teams updated remotely');
                // Refresh match data by fetching it again
                fetchMatch(matchId).then(updatedMatchData => {
                  if (updatedMatchData) {
                    setMatch(updatedMatchData);
                  }
                }).catch(err => {
                  console.error('Error refreshing match after team update:', err);
                });
              }
            } 
            // Handle match deletion (usually means it was archived)
            else if (payload.eventType === 'DELETE') {
              console.log('Match deleted (likely archived)');
              checkForMatchArchive();
              setMatchEnded(true);
              setRemoteUpdate(true);
            }
          }
        )
        .subscribe();
      
      subscriptionRef.current = channel;
      console.log('New subscription established');
    };
    
    setupSubscription();
    
    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up match subscription on component unmount');
        try {
          subscriptionRef.current.unsubscribe();
        } catch (err) {
          console.error('Error cleaning up subscription:', err);
        }
        subscriptionRef.current = null;
      }
    };
  }, [matchId, match?.status, match?.score, match?.teams]);
  
  // Check for match archive to get rating changes
  const checkForMatchArchive = async () => {
    try {
      const { data, error } = await supabase
        .from('match_archives')
        .select('metadata, winner_team')
        .eq('match_id', matchId)
        .single();
      
      if (error) {
        console.error('Error checking match archive:', error);
        return;
      }
      
      if (data) {
        // Use the dedicated column if available, fall back to metadata
        const winnerTeam = data.winner_team || 
                          (data.metadata && typeof data.metadata === 'object' ? 
                           (data.metadata as MatchMetadata).winner_team : null);
                           
        // Safely validate metadata
        const validatedMetadata = validateMetadata(data.metadata);
        
        // Set rating changes if available
        if (validatedMetadata.rating_changes) {
          setRatingChanges(validatedMetadata.rating_changes);
          console.log('Retrieved rating changes:', validatedMetadata.rating_changes);
        }
        
        // Try to find winner team index
        if (winnerTeam && match?.teams) {
          const validatedTeams = validateTeams(match.teams);
          const index = validatedTeams.findIndex(team => team.name === winnerTeam);
          if (index !== -1) {
            setWinnerTeamIndex(index);
          }
        }
      }
    } catch (err) {
      console.error('Error in checkForMatchArchive:', err);
    }
  };

  useEffect(() => {
    const loadMatch = async () => {
      try {
        setLoading(true);
        
        // Validate that both matchId and tableId are provided
        if (!matchId || !tableId) {
          console.error('Missing required parameters:', { matchId, tableId });
          Alert.alert(
            'Missing Information',
            'Unable to load the match due to missing information. Please return to the previous screen.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
        
        const matchData = await fetchMatch(matchId);
        
        if (!matchData) {
          // Handle case where match doesn't exist (might have been archived or deleted)
          checkForMatchArchive(); // Check if it was archived
          Alert.alert(
            'Match Not Found',
            'This match may have been completed or archived. Returning to previous screen.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
        
        // Verify that the match is for the correct table
        if (matchData.table_id !== tableId) {
          console.warn('Table ID mismatch:', { expectedTableId: tableId, actualTableId: matchData.table_id });
          Alert.alert(
            'Incorrect Table',
            'The match information does not match the table ID. Returning to previous screen.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
        
        setMatch(matchData);
        
        // Initialize score from match data
        if (matchData.score && Array.isArray(matchData.score.current_score)) {
          setScore(matchData.score.current_score);
        }
        
        // Check if match is already completed
        if (matchData.status === 'completed') {
          setMatchEnded(true);
          checkForMatchArchive();
        }
      } catch (error) {
        console.error('Error loading match:', error);
        Alert.alert('Error', 'Failed to load match details', [
          { text: 'Go Back', onPress: () => navigation.goBack() }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    loadMatch();
  }, [matchId, tableId]);
  
  const handleScoreChange = async (teamIndex: number, increment: boolean) => {
    const newScore = [...score];
    if (increment) {
      newScore[teamIndex] += 1;
    } else if (newScore[teamIndex] > 0) {
      newScore[teamIndex] -= 1;
    }
    
    setScore(newScore);
    
    try {
      await updateMatchScore(matchId, newScore);
    } catch (error) {
      console.error('Error updating score:', error);
      Alert.alert('Error', 'Failed to update score');
      // Revert score on error
      setScore(score);
    }
  };
  
  const handleEndMatch = async () => {
    setShowWinnerModal(true);
  };
  
  const handleAssignBallTypes = async (homeType: 'stripes' | 'solids') => {
    if (!match) return;
    
    try {
      const awayType = homeType === 'stripes' ? 'solids' : 'stripes';
      
      const updatedTeams: TeamData[] = [
        { ...match.teams[0], type: homeType },
        { ...match.teams[1], type: awayType }
      ];
      
      // Update the match teams
      await updateTeamTypes(matchId, updatedTeams);
      
      // Update local state
      setMatch({
        ...match,
        teams: updatedTeams
      });
      
      // Close the modal
      setShowBallTypeModal(false);
    } catch (error) {
      console.error('Error assigning ball types:', error);
      Alert.alert('Error', 'Failed to assign ball types');
    }
  };
  
  const confirmEndMatch = async () => {
    if (selectedWinner === null) {
      Alert.alert('Error', 'Please select a winner to end the match');
      return;
    }
    
    if (!match) {
      console.error('[MatchScreen] Cannot end match: match data is missing');
      Alert.alert('Error', 'Failed to end match - match data is missing');
      return;
    }
    
    try {
      // Update the final score based on the winner
      const finalScore = [...score];
      
      // If the selected winner doesn't already have the highest score, update it
      if (selectedWinner === 0 && finalScore[0] <= finalScore[1]) {
        finalScore[0] = Math.max(finalScore[1] + 1, 3); // Ensure winner has at least 3 points or more than opponent
      } else if (selectedWinner === 1 && finalScore[1] <= finalScore[0]) {
        finalScore[1] = Math.max(finalScore[0] + 1, 3); // Ensure winner has at least 3 points or more than opponent
      }
      
      // Update the score if it changed
      if (finalScore[0] !== score[0] || finalScore[1] !== score[1]) {
        await updateMatchScore(matchId, finalScore);
        setScore(finalScore);
      }
      
      // End the match with the winner information
      setIsArchiving(true);
      await endMatch(matchId, tableId, selectedWinner);
      
      // Get the proper team references
      const homeTeam = match.teams[0];
      const awayTeam = match.teams[1];
      
      // Show a message about the match ending
      const winnerName = selectedWinner === 0 
        ? (homeTeam.playerDetails && homeTeam.playerDetails[0]?.name || homeTeam.name)
        : (awayTeam.playerDetails && awayTeam.playerDetails[0]?.name || awayTeam.name);
        
      Alert.alert(
        'Match Complete',
        `${winnerName} won the match!`,
        [{ text: 'OK' }]
      );
      
      // Close the modal
      setShowWinnerModal(false);
      
      // Set a flag in navigation params to trigger a refresh
      navigation.navigate('MainTabs', {
        screen: 'Matches',
        params: {
          refresh: true,
          timestamp: Date.now() // Add timestamp to force refresh
        }
      });
    } catch (error) {
      console.error('[MatchScreen] Error ending match:', error);
      Alert.alert('Error', 'Failed to end match');
    } finally {
      setIsArchiving(false);
    }
  };
  
  // Effect for handling remote match completion
  useEffect(() => {
    if (remoteUpdate && matchEnded && !showWinnerModal) {
      console.log('Handling remote match completion');
      
      // Calculate and display rating changes for current user
      let message = 'This match has been completed by the other player.';
      let userRatingChange = null;
      
      if (ratingChanges && user?.id && ratingChanges[user.id]) {
        const change = ratingChanges[user.id];
        const difference = change.final - change.initial;
        const sign = difference >= 0 ? '+' : '';
        userRatingChange = `${sign}${difference}`;
        
        message += `\n\nYour rating has changed from ${change.initial} to ${change.final} (${userRatingChange}).`;
      }
      
      // Add winner announcement if available
      if (winnerTeamIndex !== null && match?.teams) {
        const winnerTeam = match.teams[winnerTeamIndex];
        const winnerName = (winnerTeam.playerDetails && winnerTeam.playerDetails[0]?.name) || winnerTeam.name;
        message = `${winnerName} won the match!\n\n${message}`;
      }
      
      Alert.alert(
        'Match Completed',
        message,
        [{ 
          text: 'OK', 
          onPress: () => {
            // Navigate back to venue screen with refresh parameter
            navigation.navigate('MainTabs', {
              screen: 'Matches',
              params: {
                refresh: true,
                timestamp: Date.now()
              }
            });
          }
        }]
      );
      
      // Reset flag to prevent multiple alerts
      setRemoteUpdate(false);
    }
  }, [remoteUpdate, matchEnded, ratingChanges, user?.id, winnerTeamIndex, match?.teams]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  if (!match) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          Match not found. It may have been completed or deleted.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Return to Previous Screen</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Get safe team data
  const homeTeam = getSafeTeam(match, 0);
  const awayTeam = getSafeTeam(match, 1);
  
  // Get team names and score
  const [homeScore, awayScore] = score;
  
  // Format the match start time
  const formattedStartTime = match.start_time
    ? format(new Date(match.start_time), 'h:mm a')
    : '';
  
  const isGamePoint = (teamIndex: number) => {
    // Use safely validated match score
    const validatedScore = match ? validateMatchScore(match.score) : { current_score: [0, 0], games_to_win: 3 };
    const gamesToWin = validatedScore.games_to_win;
    return score[teamIndex] === gamesToWin;
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {homeTeam.playerDetails && homeTeam.playerDetails[0]?.name || homeTeam.name} vs {awayTeam.playerDetails && awayTeam.playerDetails[0]?.name || awayTeam.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            {match.type || '8-ball'} • Started at {formattedStartTime}
          </Text>
        </View>
        
        <View style={styles.scoreboardContainer}>
          <View style={styles.teamContainer}>
            <View style={styles.teamNameContainer}>
              <Text style={styles.teamName} numberOfLines={2} ellipsizeMode="tail">
                {homeTeam.playerDetails && homeTeam.playerDetails[0]?.name || homeTeam.name}
              </Text>
            </View>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>
                {homeTeam.playerDetails && homeTeam.playerDetails[0]?.rating || 'N/A'}
              </Text>
            </View>
            {homeTeam.type && homeTeam.type !== 'undecided' && (
              <View style={styles.ballTypeContainer}>
                <Text style={styles.ballTypeText}>
                  {homeTeam.type === 'stripes' ? 'Stripes' : 'Solids'}
                </Text>
              </View>
            )}
            <Text style={styles.scoreText}>{homeScore}</Text>
            <View style={styles.scoreButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  isGamePoint(0) && styles.gamePointButton,
                  (matchEnded || remoteUpdate) && styles.disabledButton
                ]}
                onPress={() => handleScoreChange(0, true)}
                disabled={matchEnded || remoteUpdate}
              >
                <Text style={styles.scoreButtonText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  isGamePoint(0) && styles.gamePointButton,
                  (matchEnded || remoteUpdate) && styles.disabledButton
                ]}
                onPress={() => handleScoreChange(0, false)}
                disabled={matchEnded || remoteUpdate}
              >
                <Text style={styles.scoreButtonText}>-1</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.divider}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          
          <View style={styles.teamContainer}>
            <View style={styles.teamNameContainer}>
              <Text style={styles.teamName} numberOfLines={2} ellipsizeMode="tail">
                {awayTeam.playerDetails && awayTeam.playerDetails[0]?.name || awayTeam.name}
              </Text>
            </View>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>
                {awayTeam.playerDetails && awayTeam.playerDetails[0]?.rating || 'N/A'}
              </Text>
            </View>
            {awayTeam.type && awayTeam.type !== 'undecided' && (
              <View style={styles.ballTypeContainer}>
                <Text style={styles.ballTypeText}>
                  {awayTeam.type === 'stripes' ? 'Stripes' : 'Solids'}
                </Text>
              </View>
            )}
            <Text style={styles.scoreText}>{awayScore}</Text>
            <View style={styles.scoreButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  isGamePoint(1) && styles.gamePointButton,
                  (matchEnded || remoteUpdate) && styles.disabledButton
                ]}
                onPress={() => handleScoreChange(1, true)}
                disabled={matchEnded || remoteUpdate}
              >
                <Text style={styles.scoreButtonText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  isGamePoint(1) && styles.gamePointButton,
                  (matchEnded || remoteUpdate) && styles.disabledButton
                ]}
                onPress={() => handleScoreChange(1, false)}
                disabled={matchEnded || remoteUpdate}
              >
                <Text style={styles.scoreButtonText}>-1</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <Text style={styles.gameInfoText}>First to {match.score?.games_to_win || 3} games wins</Text>
        
        <View style={styles.actionsContainer}>
          {/* Set ball types button */}
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { backgroundColor: '#f39c12' },
              (matchEnded || remoteUpdate) && styles.disabledActionButton
            ]}
            onPress={() => setShowBallTypeModal(true)}
            disabled={matchEnded || remoteUpdate || isArchiving}
          >
            <Text style={styles.actionButtonText}>
              {(homeTeam.type && homeTeam.type !== 'undecided') ? 'Change Ball Types' : 'Set Ball Types'}
            </Text>
          </TouchableOpacity>
          
          {/* Complete match button */}
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { backgroundColor: '#2e86de' },
              (matchEnded || remoteUpdate || isArchiving) && styles.disabledActionButton
            ]}
            onPress={() => handleEndMatch()}
            disabled={matchEnded || remoteUpdate || isArchiving}
          >
            <Text style={styles.actionButtonText}>
              {matchEnded ? 'Match Ended' : isArchiving ? 'Ending Match...' : 'End Match'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Remote match ended banner */}
        {matchEnded && (
          <View style={styles.matchEndedBanner}>
            <Text style={styles.matchEndedText}>
              This match has been completed. You'll be redirected to the venue screen.
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Winner Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showWinnerModal}
        onRequestClose={() => setShowWinnerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Match Winner</Text>
            <Text style={styles.modalSubtitle}>
              Please confirm which team won the match
            </Text>
            
            <View style={styles.winnerOptions}>
              <TouchableOpacity
                style={[
                  styles.winnerOption,
                  selectedWinner === 0 && styles.selectedWinnerOption
                ]}
                onPress={() => setSelectedWinner(0)}
              >
                <Text style={styles.winnerOptionTeamName}>{homeTeam.playerDetails && homeTeam.playerDetails[0]?.name || homeTeam.name}</Text>
                <Text style={styles.winnerOptionScore}>{homeScore}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.winnerOption,
                  selectedWinner === 1 && styles.selectedWinnerOption
                ]}
                onPress={() => setSelectedWinner(1)}
              >
                <Text style={styles.winnerOptionTeamName}>{awayTeam.playerDetails && awayTeam.playerDetails[0]?.name || awayTeam.name}</Text>
                <Text style={styles.winnerOptionScore}>{awayScore}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowWinnerModal(false);
                  setSelectedWinner(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  selectedWinner === null && styles.disabledButton
                ]}
                onPress={confirmEndMatch}
                disabled={selectedWinner === null}
              >
                <Text style={styles.confirmButtonText}>Confirm & End Match</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ball Type Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showBallTypeModal}
        onRequestClose={() => setShowBallTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Ball Types</Text>
            <Text style={styles.modalSubtitle}>
              Select which player has stripes or solids
            </Text>
            
            <View style={styles.ballTypeOptions}>
              <View style={styles.ballTypeOptionContainer}>
                <Text style={styles.ballTypePlayerName}>
                  {homeTeam.playerDetails && homeTeam.playerDetails[0]?.name || homeTeam.name}
                </Text>
                <View style={styles.ballTypeButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.ballTypeButton,
                      homeTeam.type === 'stripes' && styles.selectedBallTypeButton
                    ]}
                    onPress={() => handleAssignBallTypes('stripes')}
                  >
                    <Text style={styles.ballTypeButtonText}>Stripes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.ballTypeButton,
                      homeTeam.type === 'solids' && styles.selectedBallTypeButton
                    ]}
                    onPress={() => handleAssignBallTypes('solids')}
                  >
                    <Text style={styles.ballTypeButtonText}>Solids</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowBallTypeModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  matchEndedBanner: {
    backgroundColor: '#e74c3c',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  matchEndedText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disabledActionButton: {
    backgroundColor: '#bdc3c7',
    opacity: 0.7,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  scoreboardContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
    minHeight: 250,
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: '100%',
  },
  teamNameContainer: {
    height: 60, // Fixed height for 2 lines of text
    width: '100%',
    justifyContent: 'center',
    marginBottom: 8,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  ratingContainer: {
    height: 30,
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scoreButton: {
    backgroundColor: '#f1c40f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#d35400',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  gamePointButton: {
    backgroundColor: '#e74c3c',
  },
  scoreButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#95a5a6',
  },
  gameInfoText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  ballTypeContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  ballTypeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2980b9',
  },
  ballTypeOptions: {
    marginVertical: 16,
  },
  ballTypeOptionContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ballTypePlayerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  ballTypeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  ballTypeButton: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dcdde1',
  },
  selectedBallTypeButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#3498db',
  },
  ballTypeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  winnerOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  winnerOption: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedWinnerOption: {
    borderColor: '#3498db',
    backgroundColor: '#e3f2fd',
  },
  winnerOptionTeamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  winnerOptionScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmButton: {
    flex: 2,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#3498db',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  scoreButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});