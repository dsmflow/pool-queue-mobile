import { Json, Match, Player } from './database.types';

// Team structure in a match
export interface TeamData {
  name: string;
  players: string[];
  type: 'stripes' | 'solids';
  playerDetails?: Player[];
}

// Enhanced match with player details
export interface EnhancedMatch extends Omit<Match, 'teams'> {
  teams: TeamData[];
  score?: {
    current_score: number[];
    games_to_win: number;
  };
  name?: string;
  type?: string;
}

// Player with details from queue
export interface PlayerWithDetails {
  id: string;
  table_id: string;
  player_id: string;
  position: number;
  skipped: boolean;
  created_at: string;
  player: Player;
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
}

// Extended player profile with statistics
export interface ExtendedPlayerProfile extends Player {
  games_played?: number;
  games_won?: number;
  is_admin?: boolean;
}

// Match team structure
export interface MatchTeam {
  name: string;
  players: string[];  // Array of player UUIDs
  type?: string;
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
  metadata: Record<string, any> | null;
  duration_minutes: number | null;
}
