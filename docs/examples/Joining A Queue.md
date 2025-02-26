*   **Joining a Queue (`joinQueue`):**

    *   **Sending:**
        ```typescript
        // Example data to send when joining a queue:
        interface QueueEntryInsert {
          queue_id: number;
          player_id: number;
          queue_position: number;
          // is_skipped is optional and defaults to false
        }

        const newQueueEntry: QueueEntryInsert = {
          queue_id: 1,  // ID of the queue
          player_id: 3,  // ID of the player joining
          queue_position: 2, // Calculated position
        };

        // In your db.ts:
        const { error } = await supabase.from('queue_entries').insert([newQueueEntry]);
        ```

    *   **Receiving:** After a successful insert, Supabase typically returns the inserted row (if you use `.select()`):

        ```json
        {
          "id": 15, // The generated ID of the new queue entry
          "queue_id": 1,
          "player_id": 3,
          "joined_at": "2024-01-27T16:45:00Z",
          "queue_position": 2,
          "is_skipped": false
        }
        ```