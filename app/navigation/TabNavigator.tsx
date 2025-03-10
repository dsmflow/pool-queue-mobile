import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { MatchesScreen } from '../screens/MatchesScreen';
import { RulesScreen } from '../screens/RulesScreen';
import { MainTabParamList } from '../types/navigation.types';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { useNotifications } from '../context/NotificationContext';

// You can replace these with actual icons
const HomeIcon = ({ color }: { color: string }) => (
  <View style={[styles.iconContainer, { backgroundColor: color }]}>
    <Text style={styles.iconText}>🏠</Text>
  </View>
);

const MatchesIcon = ({ color }: { color: string }) => (
  <View style={[styles.iconContainer, { backgroundColor: color }]}>
    <Text style={styles.iconText}>🎱</Text>
  </View>
);

const NotificationsIcon = ({ color }: { color: string }) => {
  const { unreadCount, hasQueueTurnNotification } = useNotifications();
  
  return (
    <View>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Text style={styles.iconText}>🔔</Text>
      </View>
      {unreadCount > 0 && (
        <View style={[
          styles.badge, 
          hasQueueTurnNotification ? styles.importantBadge : null
        ]}>
          <Text style={styles.badgeText}>
            {unreadCount <= 99 ? unreadCount : '99+'}
          </Text>
        </View>
      )}
    </View>
  );
};

const RulesIcon = ({ color }: { color: string }) => (
  <View style={[styles.iconContainer, { backgroundColor: color }]}>
    <Text style={styles.iconText}>📋</Text>
  </View>
);

const ProfileIcon = ({ color }: { color: string }) => (
  <View style={[styles.iconContainer, { backgroundColor: color }]}>
    <Text style={styles.iconText}>🧑</Text>
  </View>
);

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabNavigatorProps = {
  defaultVenueId?: string;
};

export const TabNavigator: React.FC<TabNavigatorProps> = ({ defaultVenueId }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#ecf0f1',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        initialParams={{ venueId: defaultVenueId || '00000000-0000-0000-0000-000000000001' }} // Use UUID format
        options={{
          tabBarLabel: 'Matches',
          tabBarIcon: ({ color }) => <MatchesIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => <NotificationsIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Rules"
        component={RulesScreen}
        options={{
          tabBarLabel: 'Rules',
          tabBarIcon: ({ color }) => <RulesIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  importantBadge: {
    backgroundColor: '#27ae60',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});
