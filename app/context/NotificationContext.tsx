// app/context/NotificationContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './AuthContext';
import { Notification } from '../types/custom.types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loadNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  hasQueueTurnNotification: boolean;
  getQueueTurnNotification: () => Notification | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [hasQueueTurnNotification, setHasQueueTurnNotification] = useState<boolean>(false);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  
  // Load notifications from database
  const loadNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('[NotificationContext] Error loading notifications:', error);
        return;
      }
      
      setNotifications(data || []);
      
      // Count unread notifications
      const unread = (data || []).filter(n => !n.read).length;
      setUnreadCount(unread);
      
      // Check for turn notifications
      const turnNotification = (data || []).find(
        n => n.type === 'turn_notification' && !n.read
      );
      setHasQueueTurnNotification(!!turnNotification);
    } catch (error) {
      console.error('[NotificationContext] Error in loadNotifications:', error);
    }
  };
  
  // Mark a notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
        
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Check for remaining turn notifications
      const remainingTurnNotification = notifications.find(
        n => n.id !== notificationId && n.type === 'turn_notification' && !n.read
      );
      setHasQueueTurnNotification(!!remainingTurnNotification);
    } catch (error) {
      console.error('[NotificationContext] Error marking notification as read:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      setHasQueueTurnNotification(false);
    } catch (error) {
      console.error('[NotificationContext] Error marking all notifications as read:', error);
    }
  };
  
  // Delete a notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
        
      // Update local state
      const deleted = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if needed
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Check for remaining turn notifications
      const remainingTurnNotification = notifications.find(
        n => n.id !== notificationId && n.type === 'turn_notification' && !n.read
      );
      setHasQueueTurnNotification(!!remainingTurnNotification);
    } catch (error) {
      console.error('[NotificationContext] Error deleting notification:', error);
    }
  };
  
  // Get the current queue turn notification if available
  const getQueueTurnNotification = (): Notification | null => {
    const turnNotification = notifications.find(
      n => n.type === 'turn_notification' && !n.read
    );
    return turnNotification || null;
  };
  
  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;
    
    const setupSubscription = () => {
      // Clean up any existing subscription
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        } catch (err) {
          console.error('[NotificationContext] Error cleaning up subscription:', err);
        }
      }
      
      // Create a new subscription
      try {
        const channel = supabase
          .channel(`user-notifications-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            async (payload) => {
              console.log('[NotificationContext] Notification change detected:', payload.eventType);
              
              // Reload notifications when changes occur
              await loadNotifications();
            }
          )
          .subscribe();
          
        subscriptionRef.current = channel;
      } catch (err) {
        console.error('[NotificationContext] Error setting up notification subscription:', err);
      }
    };
    
    // Load initial notifications
    loadNotifications();
    
    // Set up subscription
    setupSubscription();
    
    // Clean up on unmount or user change
    return () => {
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        } catch (err) {
          console.error('[NotificationContext] Error cleaning up subscription on unmount:', err);
        }
      }
    };
  }, [user?.id]);
  
  const value = {
    notifications,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    hasQueueTurnNotification,
    getQueueTurnNotification
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};