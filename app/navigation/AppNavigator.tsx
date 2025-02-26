import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { TabNavigator } from './TabNavigator';
import { MatchSetupScreen } from '../screens/MatchSetupScreen';
import { MatchScreen } from '../screens/MatchScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { MatchHistoryScreen } from '../screens/MatchHistoryScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { supabase } from '../api/supabase';
import { RootStackParamList } from '../types/navigation.types';
import { useAuth } from '../context/AuthContext';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const [defaultVenueId, setDefaultVenueId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchDefaultVenue = async () => {
      try {
        // Get first venue from database
        const { data, error } = await supabase
          .from('venues')
          .select('id')
          .limit(1)
          .single();
        
        if (error) throw error;
        setDefaultVenueId(data.id);
      } catch (error) {
        console.error('Error fetching default venue:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDefaultVenue();
  }, []);

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
        name="MatchHistory" 
        component={MatchHistoryScreen}
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