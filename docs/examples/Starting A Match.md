   **Starting a Match (`startMatch`):**

    *   **Sending (Match):**
        ```typescript
        interface MatchInsert {
          table_id: number;
          game_type: string;
          // start_time is automatically set by the database default
        }

        const newMatch: MatchInsert = {
          table_id: 2,
          game_type: "9-ball",
        };
        const { data: matchData, error: matchError } = await supabase.from('matches').insert([newMatch]).select().single();
        ```

    *   **Receiving (Match):**

        ```json
        {
          "id": 5, // Generated match ID
          "table_id": 2,
          "start_time": "2024-01-27T16:48:00Z",
          "end_time": null, // Will be null until the match ends
          "game_type": "9-ball",
          "created_at": "2024-01-27T16:48:00Z",
          "winner_player_id": null
        }
        ```

    *   **Sending (Match Players):**
        ```typescript
        interface MatchPlayerInsert {
            match_id: number;
            player_id: number;
            score?: number; // Optional
        }

        const matchPlayers: MatchPlayerInsert[] = [
          { match_id: 5, player_id: 1 }, // Assuming match ID 5
          { match_id: 5, player_id: 4 },
        ];

        const { error } = await supabase.from('match_players').insert(matchPlayers);

        ```
    *   **Receiving (Match Players)**
        ```json
           [
              {
                "id": 8,
                "match_id": 5,
                "player_id": 1,
                "score": null,
                "created_at": "2024-01-27T17:20:19.180751+00:00"
              },
              {
                "id": 9,
                "match_id": 5,
                "player_id": 4,
                "score": null,
                "created_at": "2024-01-27T17:20:19.180751+00:00"
              }
            ]
        ```