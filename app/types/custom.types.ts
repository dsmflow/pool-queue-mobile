import { Json, Match, Player } from './database.types';

// Team structure in a match
export interface TeamData {
  name: string;
  players: string[]; // Array of player IDs
  type: 'stripes' | 'solids' | 'undecided'; // Added 'undecided' for initial match setup
  playerDetails?: Player[]; // Optional array of Player objects
}

// Enhanced match with player details
export interface EnhancedMatch extends Omit<Match, 'teams'> {
  teams: TeamData[]; // NOT optional - every match should have teams
  score: { // Consistent with your database
    current_score: number[];
    games_to_win: number;
  };
}

// Player with details from queue
export interface PlayerWithDetails {
  id: string;
  table_id: string;
  player_id: string;
  position: number;
  skipped: boolean;
  notified: boolean; // Add this field
  created_at: string;
  player: Player;
}

// Notification type
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  metadata: any;
  created_at: string;
}

// Table details response
export interface TableWithDetails {
  table: {
    id: string;
    name: string;
    type: string;
    is_available: boolean;
    venue_id: string;
    created_at: string;
  };
  match: EnhancedMatch | null;
  queue: PlayerWithDetails[];
  staleData?: boolean; // Flag to indicate potentially unreliable data from subscription
}

// Extended player profile with statistics
export interface ExtendedPlayerProfile extends Player {
  games_played?: number;
  games_won?: number;
  is_admin?: boolean;
}

// Match team structure (This seems redundant with TeamData - consider removing)
export interface MatchTeam {
  name: string;
  players: string[];  // Array of player UUIDs
  type?: string;
}

// Player rating change structure
export interface RatingChange {
  initial: number;
  final: number;
}

// Match metadata structure
export interface MatchMetadata {
  name?: string;
  type?: string;
  winner_team?: string;
  loser_team?: string; // Add this field
  winner_team_index?: number; // Add this field
  teams?: {
    name: string;
    type?: string;
    players: string[];
  }[];
  rating_changes?: Record<string, RatingChange>;
}

// Archive match structure
export interface ArchivedMatch {
  id: string;
  match_id: string;
  table_id: string;
  players: string[];  // Array of player UUIDs
  final_score: [number, number] | null;
  winner_player_id: string | null;
  start_time: string;
  end_time: string;
  archived_at: string;
  metadata: MatchMetadata | null;
  duration_minutes: number | null;
  winner_team: string; // Added this to show that I have this field as well.
  teams: { name: string }[];
}
