// app/components/NotificationList.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { useNotifications } from '../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const NotificationList: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { 
    notifications, 
    markAsRead, 
    deleteNotification, 
    markAllAsRead 
  } = useNotifications();
  
  if (notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No notifications</Text>
      </View>
    );
  }
  
  const handleNotificationPress = (notification: any) => {
    // Mark as read first
    markAsRead(notification.id);
    
    // Handle different notification types
    if (notification.type === 'turn_notification') {
      const tableId = notification.metadata?.table_id;
      if (tableId) {
        navigation.navigate('QueueScreen', {
          tableId,
          timestamp: Date.now()
        });
      }
    }
  };
  
  const handleDeletePress = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteNotification(notificationId)
        }
      ]
    );
  };
  
  const renderNotificationItem = ({ item }: { item: any }) => {
    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
    
    let icon = '🔔';
    let backgroundColor = '#f0f0f0';
    let borderColor = '#e0e0e0';
    
    // Style based on notification type
    if (item.type === 'turn_notification') {
      icon = '🎱';
      backgroundColor = item.read ? '#e3f2fd' : '#bbdefb';
      borderColor = item.read ? '#bbdefb' : '#64b5f6';
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          { backgroundColor, borderColor }
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationIcon}>{icon}</Text>
          <Text style={styles.timestamp}>{timeAgo}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePress(item.id)}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        {!item.read && <View style={styles.unreadIndicator} />}
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity style={styles.clearAllButton} onPress={markAllAsRead}>
            <Text style={styles.clearAllButtonText}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearAllButton: {
    padding: 8,
  },
  clearAllButtonText: {
    color: '#3498db',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e0e0e0',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#333',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
});