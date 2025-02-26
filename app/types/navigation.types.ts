import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Auth stack navigator params
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

// Main stack navigator params
export type RootStackParamList = {
  // Tab Navigator
  MainTabs: undefined;
  
  // Screens accessible from tabs
  MatchSetup: { tableId: string };
  Match: { matchId: string; tableId: string };
  Players: undefined;
  PlayerDetailsScreen: { playerId: string };
  MatchHistory: undefined;
  
  // Settings and other screens
  SettingsScreen: undefined;
  ProfileScreen: undefined;
  AdminScreen: undefined;
  
  // Auth screens (for navigation from within the app)
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

// Tab navigator params
export type MainTabParamList = {
  Home: undefined;
  Matches: { venueId: string };
  Rules: undefined;
};

// Navigation prop types
export type RootStackNavigationProp<T extends keyof RootStackParamList> = StackNavigationProp<
  RootStackParamList,
  T
>;

export type AuthStackNavigationProp<T extends keyof AuthStackParamList> = StackNavigationProp<
  AuthStackParamList,
  T
>;

export type MainTabNavigationProp<T extends keyof MainTabParamList> = BottomTabNavigationProp<
  MainTabParamList,
  T
>;

// Route prop types
export type RootStackRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

export type AuthStackRouteProp<T extends keyof AuthStackParamList> = RouteProp<
  AuthStackParamList,
  T
>;

export type MainTabRouteProp<T extends keyof MainTabParamList> = RouteProp<
  MainTabParamList,
  T
>;