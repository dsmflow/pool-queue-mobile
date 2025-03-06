import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// --- Auth Stack ---
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

// --- Main Tab Navigator ---
export type MainTabParamList = {
  Home: undefined;
  Matches: { venueId: string };
  Rules: undefined;
  Profile: undefined;
  Match: { matchId: string; tableId: string };
};

// --- Root Stack ---
export type RootStackParamList = {
  MainTabs: undefined; // Represents the entire tab navigator
  MatchSetup: { tableId: string };
  Match: { matchId: string; tableId: string };
  Players: undefined;
  PlayerDetailsScreen: { playerId: string }; // Keep this, as it's defined
  Stats: undefined;
  SettingsScreen: undefined; // Keep this
  ProfileScreen: undefined; // Correct location
  AdminScreen: undefined;
};

// --- Helper Types (Simplified and Consolidated) ---

// For screens within the RootStack
export type RootStackScreenProps<T extends keyof RootStackParamList> = {
  navigation: StackNavigationProp<RootStackParamList, T>;
  route: RouteProp<RootStackParamList, T>;
};

// For screens within the AuthStack
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = {
  navigation: StackNavigationProp<AuthStackParamList, T>;
  route: RouteProp<AuthStackParamList, T>;
};

// For screens within tabs (using BottomTabNavigationProp)
export type MainTabScreenProps<T extends keyof MainTabParamList> = {
  navigation: BottomTabNavigationProp<MainTabParamList, T>;
  route: RouteProp<MainTabParamList, T>;
};

// If you need StackNavigationProp within a tab (e.g., for MatchesScreen):
export type MainTabStackNavigationProp<T extends keyof MainTabParamList> =
  StackNavigationProp<RootStackParamList, 'MainTabs'>;