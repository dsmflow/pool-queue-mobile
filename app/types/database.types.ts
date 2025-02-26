export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      matches: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          metadata: Json
          score: Json
          start_time: string
          status: string
          table_id: string
          teams: Json
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          metadata?: Json
          score?: Json
          start_time?: string
          status?: string
          table_id: string
          teams: Json
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          metadata?: Json
          score?: Json
          start_time?: string
          status?: string
          table_id?: string
          teams?: Json
        }
        Relationships: [
          {
            foreignKeyName: "matches_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          }
        ]
      }
      match_archives: {
        Row: {
          id: string
          match_id: string
          table_id: string
          players: Json
          final_score: Json | null
          winner_player_id: string | null
          start_time: string
          end_time: string
          archived_at: string
          metadata: Json | null
          duration_minutes: number | null
        }
        Insert: {
          id?: string
          match_id: string
          table_id: string
          players: Json
          final_score?: Json | null
          winner_player_id?: string | null
          start_time: string
          end_time: string
          archived_at?: string
          metadata?: Json | null
          duration_minutes?: number | null
        }
        Update: {
          id?: string
          match_id?: string
          table_id?: string
          players?: Json
          final_score?: Json | null
          winner_player_id?: string | null
          start_time?: string
          end_time?: string
          archived_at?: string
          metadata?: Json | null
          duration_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_archives_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_archives_winner_player_id_fkey"
            columns: ["winner_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          }
        ]
      }
      players: {
        Row: {
          created_at: string
          email: string | null
          id: string
          metadata: Json
          name: string
          rating: number
          avatar_url: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name: string
          rating?: number
          avatar_url?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name?: string
          rating?: number
          avatar_url?: string | null
        }
        Relationships: []
      }
      queue_entries: {
        Row: {
          created_at: string
          id: string
          player_id: string
          position: number
          skipped: boolean
          table_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          position: number
          skipped?: boolean
          table_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          position?: number
          skipped?: boolean
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          }
        ]
      }
      tables: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          metadata: Json
          name: string
          type: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          metadata?: Json
          name: string
          type: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          metadata?: Json
          name?: string
          type?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          }
        ]
      }
      venues: {
        Row: {
          address: string | null
          created_at: string
          id: string
          metadata: Json
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      end_match_transaction: {
        Args: {
          p_match_id: string
        }
        Returns: undefined
      }
      start_match_transaction: {
        Args: {
          p_table_id: string
          p_teams: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Export specific types for use in the application
export type Table = Database['public']['Tables']['tables']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type QueueEntry = Database['public']['Tables']['queue_entries']['Row'];
export type Player = Database['public']['Tables']['players']['Row'];
export type MatchArchive = Database['public']['Tables']['match_archives']['Row'];