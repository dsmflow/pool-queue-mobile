import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { fetchMatch, updateMatchScore, endMatch, archiveMatch } from '../api/matches';
import { EnhancedMatch, TeamData } from '../types/custom.types';
import { format } from 'date-fns';

type MatchScreenRouteProp = RouteProp<RootStackParamList, 'Match'>;
type MatchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Match'>;

type Props = {
  route: MatchScreenRouteProp;
  navigation: MatchScreenNavigationProp;
};

export const MatchScreen: React.FC<Props> = ({ route, navigation }) => {
  const { matchId, tableId } = route.params;
  const [match, setMatch] = useState<EnhancedMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number[]>([0, 0]);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<number | null>(null);
  
  useEffect(() => {
    const loadMatch = async () => {
      try {
        setLoading(true);
        const matchData = await fetchMatch(matchId);
        
        if (!matchData) {
          // Handle case where match doesn't exist (might have been archived or deleted)
          Alert.alert(
            'Match Not Found',
            'This match may have been completed or archived. Returning to previous screen.',
            [{ 
              text: 'OK', 
              onPress: () => navigation.goBack() 
            }]
          );
          return;
        }
        
        setMatch(matchData);
        
        // Initialize score from match data
        if (matchData.score && Array.isArray(matchData.score.current_score)) {
          setScore(matchData.score.current_score);
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
  }, [matchId]);
  
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
  
  const confirmEndMatch = async () => {
    if (selectedWinner === null) {
      Alert.alert('Error', 'Please select a winner to end the match');
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
      
      // End the match
      await endMatch(matchId, tableId);
      
      // Archive the match for historical reporting
      setIsArchiving(true);
      try {
        await archiveMatch(matchId);
      } catch (archiveError) {
        console.error('Error archiving match:', archiveError);
        // We don't show an error to the user for this as it's not critical
      } finally {
        setIsArchiving(false);
      }
      
      // Close the modal
      setShowWinnerModal(false);
      
      // Navigate back to the venue screen
      navigation.navigate('MainTabs');
    } catch (error) {
      console.error('Error ending match:', error);
      Alert.alert('Error', 'Failed to end match');
    }
  };
  
  if (loading || !match) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  const homeTeam = match.teams[0] as TeamData;
  const awayTeam = match.teams[1] as TeamData;
  
  // Get team names and score
  const homeScore = score[0];
  const awayScore = score[1];
  
  // Format the match start time
  const formattedStartTime = match.start_time
    ? format(new Date(match.start_time), 'h:mm a')
    : '';
  
  const isGamePoint = (teamIndex: number) => {
    const gamesToWin = match.score?.games_to_win || 2;
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
            <Text style={styles.scoreText}>{homeScore}</Text>
            <View style={styles.scoreButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  isGamePoint(0) && styles.gamePointButton
                ]}
                onPress={() => handleScoreChange(0, true)}
              >
                <Text style={styles.scoreButtonText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  isGamePoint(0) && styles.gamePointButton
                ]}
                onPress={() => handleScoreChange(0, false)}
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
            <Text style={styles.scoreText}>{awayScore}</Text>
            <View style={styles.scoreButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  isGamePoint(1) && styles.gamePointButton
                ]}
                onPress={() => handleScoreChange(1, true)}
              >
                <Text style={styles.scoreButtonText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  isGamePoint(1) && styles.gamePointButton
                ]}
                onPress={() => handleScoreChange(1, false)}
              >
                <Text style={styles.scoreButtonText}>-1</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <Text style={styles.gameInfoText}>First to {match.score?.games_to_win || 3} games wins</Text>
        
        <View style={styles.actionsContainer}>
          {/* Complete match buttons */}
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: '#2e86de' }]}
            onPress={() => handleEndMatch()}
            disabled={isArchiving}
          >
            <Text style={styles.completeButtonText}>
              {isArchiving ? 'Ending Match...' : 'End Match'}
            </Text>
          </TouchableOpacity>
        </View>
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
  completeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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