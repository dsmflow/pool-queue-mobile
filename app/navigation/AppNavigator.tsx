import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { TabNavigator } from './TabNavigator';
import { MatchSetupScreen } from '../screens/MatchSetupScreen';
import { MatchScreen } from '../screens/MatchScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { supabase } from '../api/supabase';
import { RootStackParamList } from '../types/navigation.types'; // Import the type
import { useAuth } from '../context/AuthContext';
import { ProfileScreen } from '../screens/ProfileScreen';

const Stack = createStackNavigator<RootStackParamList>(); // Correct type parameter

export const AppNavigator = () => {
  const [defaultVenueId, setDefaultVenueId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const { isAdmin, user } = useAuth();  // Get user

  useEffect(() => {
    const fetchDefaultVenue = async () => {
      try {
        // Get first venue from database
        const { data, error } = await supabase
          .from('venues')
          .select('id')
          .limit(1)
          .single(); // Good - .single()

        if (error) throw error;
        if (data && data.id) { // Check for data and data.id
          setDefaultVenueId(data.id);
        }
      } catch (error) {
        console.error('Error fetching default venue:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) { // Only fetch if user is logged in
      fetchDefaultVenue();
    } else {
      setLoading(false)
    }

  }, [user]); // Depend on user

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName="MainTabs">
      {/* Main Tab Navigator */}
      <Stack.Screen
        name="MainTabs"
        options={{ headerShown: false }}
      >
        {() => <TabNavigator defaultVenueId={defaultVenueId} />}
      </Stack.Screen>

      {/* Screens accessible from tabs */}
      <Stack.Screen
        name="MatchSetup"
        component={MatchSetupScreen}
        options={{ title: 'New Match' }}
      />
      <Stack.Screen
        name="Match"
        component={MatchScreen}
        options={{ title: 'Match Details' }}
      />
      <Stack.Screen
        name="Players"
        component={PlayerScreen}
        options={{ title: 'Players' }}
      />
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: 'Stats' }}
      />

      {/* Admin Screen - only accessible to admins */}
      {isAdmin && (
        <Stack.Screen
          name="AdminScreen"
          component={AdminScreen}
          options={{
            title: 'Admin Panel',
            headerStyle: {
              backgroundColor: '#e74c3c',
            },
            headerTintColor: '#fff',
          }}
        />
      )}
    </Stack.Navigator>
  );
};