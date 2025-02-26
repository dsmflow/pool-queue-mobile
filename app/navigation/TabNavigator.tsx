import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { MatchesScreen } from '../screens/MatchesScreen';
import { RulesScreen } from '../screens/RulesScreen';
import { MainTabParamList } from '../types/navigation.types';

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

const RulesIcon = ({ color }: { color: string }) => (
  <View style={[styles.iconContainer, { backgroundColor: color }]}>
    <Text style={styles.iconText}>📋</Text>
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
        name="Rules"
        component={RulesScreen}
        options={{
          tabBarLabel: 'Rules',
          tabBarIcon: ({ color }) => <RulesIcon color={color} />,
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
});
