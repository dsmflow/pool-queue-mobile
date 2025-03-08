// app/screens/NotificationsScreen.tsx
import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import { NotificationList } from '../components/NotificationList';

export const NotificationsScreen: React.FC = () => {
  const { loadNotifications } = useNotifications();
  
  useEffect(() => {
    loadNotifications();
  }, []);
  
  return (
    <SafeAreaView style={styles.container}>
      <NotificationList />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
});