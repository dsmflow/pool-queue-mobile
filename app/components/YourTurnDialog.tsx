// app/components/YourTurnDialog.tsx
import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Easing 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { useNotifications } from '../context/NotificationContext';

interface YourTurnDialogProps {
  visible: boolean;
  onClose: () => void;
  tableId: string;
  tableName: string;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const YourTurnDialog: React.FC<YourTurnDialogProps> = ({
  visible,
  onClose,
  tableId,
  tableName
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { getQueueTurnNotification, markAsRead } = useNotifications();
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    if (visible) {
      // Reset and start animation
      animatedValue.setValue(0);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 500,
        easing: Easing.elastic(0.8),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);
  
  const handleStartMatch = () => {
    // Mark notification as read if it exists
    const notification = getQueueTurnNotification();
    if (notification) {
      markAsRead(notification.id);
    }
    
    // Close dialog
    onClose();
    
    // Navigate to match setup
    navigation.navigate('MatchSetup', {
      tableId,
      timestamp: Date.now()
    });
  };
  
  const handleWaitLonger = () => {
    onClose();
  };
  
  const scale = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.1, 1]
  });
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.dialogContainer, { transform: [{ scale }] }]}>
          <View style={styles.header}>
            <Text style={styles.title}>🎱 It's Your Turn!</Text>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.messageText}>
              It's your turn to play on table{' '}
              <Text style={styles.tableName}>{tableName}</Text>!
            </Text>
            <Text style={styles.instructionText}>
              You can start your match now or wait a bit longer.
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.waitButton}
              onPress={handleWaitLonger}
            >
              <Text style={styles.waitButtonText}>Wait Longer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartMatch}
            >
              <Text style={styles.startButtonText}>Start Match</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 20,
  },
  messageText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
    color: '#2c3e50',
  },
  tableName: {
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#7f8c8d',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  waitButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  waitButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  startButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  startButtonText: {
    fontSize: 16,
    color: '#2ecc71',
    fontWeight: 'bold',
  },
});