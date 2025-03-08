// app/components/TurnNotificationBanner.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { useNotifications } from '../context/NotificationContext';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const TurnNotificationBanner: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { hasQueueTurnNotification, getQueueTurnNotification, markAsRead } = useNotifications();
  
  if (!hasQueueTurnNotification) {
    return null;
  }
  
  const notification = getQueueTurnNotification();
  if (!notification) {
    return null;
  }
  
  const handleBannerPress = () => {
    const metadata = notification.metadata || {};
    const tableId = metadata.table_id;
    
    if (!tableId) {
      Alert.alert('Error', 'Table information is missing');
      return;
    }
    
    // Ask user if they want to start their match
    Alert.alert(
      'Your Turn',
      'It\'s your turn to play! Do you want to start your match now?',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => {
            // Mark notification as read but don't start match
            markAsRead(notification.id);
          }
        },
        {
          text: 'Start Match',
          onPress: () => {
            // Mark notification as read
            markAsRead(notification.id);
            
            // Navigate to queue screen with timestamp to ensure fresh component mount
            navigation.navigate('QueueScreen', {
              tableId,
              timestamp: Date.now()
            });
          }
        }
      ]
    );
  };
  
  return (
    <TouchableOpacity style={styles.container} onPress={handleBannerPress}>
      <Text style={styles.title}>🎱 It's Your Turn!</Text>
      <Text style={styles.message}>{notification.message}</Text>
      <View style={styles.buttonContainer}>
        <Text style={styles.buttonText}>Start Match</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#27ae60',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: 'white',
    marginBottom: 8,
  },
  buttonContainer: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  buttonText: {
    color: '#27ae60',
    fontWeight: 'bold',
    fontSize: 14,
  },
});