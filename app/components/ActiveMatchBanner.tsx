import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { fetchActiveMatchesByUser } from '../api/matches';
import { endMatch, archiveMatch } from '../api/matches';
import { useAuth } from '../context/AuthContext';
import { EnhancedMatch } from '../types/custom.types';
import { supabase } from '../api/supabase';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const ActiveMatchBanner: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<EnhancedMatch | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  
  // Function to handle match updates received via subscription
  const handleMatchUpdate = (payload: any) => {
    if (!activeMatch || !user?.id) return;
    
    try {
      console.log(`Match update received:`, JSON.stringify(payload));
      
      // Only process updates for the active match
      if (payload.new && payload.new.id === activeMatch.id) {
        // Check if any relevant fields changed
        if (payload.eventType === 'UPDATE') {
          // Create an enhanced match from the update
          const updatedMatch = sanitizeMatch(payload.new);
          
          // Check if teams changed
          if (JSON.stringify(updatedMatch.teams) !== JSON.stringify(activeMatch.teams)) {
            console.log('Teams updated remotely');
            // Update local state with the new match data
            setActiveMatch(updatedMatch);
          }
          
          // Check if score changed
          if (JSON.stringify(updatedMatch.score) !== JSON.stringify(activeMatch.score)) {
            console.log('Score updated remotely');
            // Update local state with the new match data
            setActiveMatch(updatedMatch);
          }
          
          // Check if status changed (e.g., match was completed)
          if (updatedMatch.status !== activeMatch.status) {
            console.log(`Match status changed from ${activeMatch.status} to ${updatedMatch.status}`);
            
            // If match was completed, update the UI
            if (updatedMatch.status === 'completed') {
              console.log('Match was completed remotely');
              setActiveMatch(null);
            } else {
              setActiveMatch(updatedMatch);
            }
          }
        }
        
        // If match was deleted
        if (payload.eventType === 'DELETE') {
          console.log('Match was deleted remotely');
          setActiveMatch(null);
        }
      }
    } catch (error) {
      console.error('Error handling match update:', error);
    }
  };

  useEffect(() => {
    const checkForActiveMatches = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        const { activeMatches, error: apiError, staleData } = await fetchActiveMatchesByUser(user.id);
        
        if (apiError) {
          console.error('[ActiveMatchBanner] API error checking for active matches:', apiError);
          setError('Network error while checking active matches');
          // Keep the previous active match data to allow cleanup even during network issues
          return;
        }
        
        if (activeMatches.length > 0) {
          // Use the first active match if multiple exist
          console.log(`[ActiveMatchBanner] Found ${activeMatches.length} active matches for user ${user.id}`);
          setActiveMatch(activeMatches[0]);
          
          // If we're showing potentially stale data, set an error message to warn the user
          if (staleData) {
            console.warn('[ActiveMatchBanner] Using potentially stale match data');
            setError('Using potentially stale match data. Reconnection may be unreliable.');
          }
          
          // Set up real-time subscription for this active match
          setupMatchSubscription(activeMatches[0].id);
        } else {
          console.log(`[ActiveMatchBanner] No active matches found for user ${user.id}`);
          setActiveMatch(null);
        }
      } catch (error) {
        console.error('[ActiveMatchBanner] Error checking for active matches:', error);
        setError('Network error while checking active matches');
        // Don't clear active match on network error to prevent flickering
      } finally {
        setLoading(false);
      }
    };
    
    // Set up subscription for active match updates
    const setupMatchSubscription = (matchId: string) => {
      // Clean up any existing subscription
      if (subscriptionRef.current) {
        try {
          console.log('[ActiveMatchBanner] Cleaning up previous subscription');
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        } catch (err) {
          console.error('[ActiveMatchBanner] Error cleaning up previous subscription:', err);
        }
      }
      
      try {
        // Create unique channel name with timestamp
        const channelName = `active-match-banner-${matchId}-${Date.now()}`;
        console.log(`[ActiveMatchBanner] Setting up subscription for match ${matchId} on channel ${channelName}`);
        
        // Subscribe to match changes
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'matches',
              filter: `id=eq.${matchId}`
            },
            handleMatchUpdate
          )
          .subscribe();
        
        // Store the channel for cleanup
        subscriptionRef.current = channel;
      } catch (err) {
        console.error('[ActiveMatchBanner] Error setting up match subscription:', err);
      }
    };
    
    checkForActiveMatches();
    
    // Set up a polling interval as a backup for subscription
    const intervalId = setInterval(checkForActiveMatches, 60000); // Check every minute
    
    // Clean up subscription and interval on unmount
    return () => {
      clearInterval(intervalId);
      
      if (subscriptionRef.current) {
        try {
          console.log('[ActiveMatchBanner] Cleaning up subscription on unmount');
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        } catch (err) {
          console.error('[ActiveMatchBanner] Error cleaning up subscription on unmount:', err);
        }
      }
    };
  }, [user?.id]);
  
  const handleReconnectMatch = () => {
    if (activeMatch) {
      // Clean up subscription before navigating
      if (subscriptionRef.current) {
        try {
          console.log('[ActiveMatchBanner] Cleaning up subscription before match navigation');
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        } catch (err) {
          console.error('[ActiveMatchBanner] Error cleaning up subscription before navigation:', err);
        }
      }
      
      // Add a timestamp parameter to force the navigation to treat this as a new navigation event
      // This helps prevent stale subscription issues
      const currentTimestamp = Date.now();
      console.log(`[ActiveMatchBanner] Navigating to match with timestamp: ${currentTimestamp}`);
      
      navigation.navigate('Match', {
        matchId: activeMatch.id,
        tableId: activeMatch.table_id,
        timestamp: currentTimestamp
      });
    }
  };

  const handleClearStaleMatch = async () => {
    if (!activeMatch) return;
    
    Alert.alert(
      'Clear Stale Match',
      'Do you want to clear this match? This will remove it from your active matches and free up the table.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear Match',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCleaningUp(true);
              
              // Clean up any existing subscription first
              if (subscriptionRef.current) {
                try {
                  console.log('[ActiveMatchBanner] Cleaning up subscription before match clear');
                  subscriptionRef.current.unsubscribe();
                  subscriptionRef.current = null;
                } catch (err) {
                  console.error('[ActiveMatchBanner] Error cleaning up subscription before match clear:', err);
                }
              }
              
              // End match and archive it to clean up properly
              await endMatch(activeMatch.id, activeMatch.table_id);
              await archiveMatch(activeMatch.id);
              
              // Clear the local state
              setActiveMatch(null);
              Alert.alert('Success', 'Match has been cleared successfully');
            } catch (error) {
              console.error('Error clearing match:', error);
              Alert.alert('Error', 'Failed to clear the match. Please try again.');
            } finally {
              setIsCleaningUp(false);
            }
          }
        }
      ]
    );
  };
  
  if (loading && !activeMatch) {
    return null; // Don't show anything while initially loading
  }
  
  if (!activeMatch && !error) {
    return null; // Don't show if no active match and no error
  }
  
  // Get safe team and validation utilities
  const { getSafeTeam, sanitizeMatch } = require('../utils/validationUtils');
  
  // Format team names for display
  const homeTeam = activeMatch ? getSafeTeam(activeMatch, 0) : { name: 'Team 1' };
  const awayTeam = activeMatch ? getSafeTeam(activeMatch, 1) : { name: 'Team 2' };
  const homeTeamName = homeTeam.name;
  const awayTeamName = awayTeam.name;
  
  return (
    <TouchableOpacity 
      style={[styles.container, error ? styles.errorContainer : null]} 
      onPress={error ? handleClearStaleMatch : handleReconnectMatch}
      disabled={isCleaningUp}
    >
      <View style={styles.content}>
        <View style={styles.infoContainer}>
          <Text style={styles.title}>
            {error ? 'Possible Stale Match' : 'Active Match In Progress'}
          </Text>
          <Text style={styles.matchDetails}>
            {error 
              ? 'Network error while verifying match status' 
              : `${homeTeamName} vs ${awayTeamName}`
            }
          </Text>
        </View>
        <View style={styles.actionContainer}>
          {isCleaningUp ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <TouchableOpacity 
              style={[styles.button, error ? styles.errorButton : null]} 
              onPress={error ? handleClearStaleMatch : handleReconnectMatch}
            >
              <Text style={styles.buttonText}>
                {error ? 'Clear' : 'Reconnect'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2980b9',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorContainer: {
    backgroundColor: '#e74c3c',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  matchDetails: {
    color: 'white',
    fontSize: 14,
  },
  actionContainer: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    minHeight: 36,
  },
  button: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  errorButton: {
    backgroundColor: '#ffeeee',
  },
  buttonText: {
    color: '#2980b9',
    fontWeight: 'bold',
  },
});