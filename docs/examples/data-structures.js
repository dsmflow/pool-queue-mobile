// EXAMPLE DATA STRUCTURES

// 1. Creating a new venue
// POST /venues
const createVenueRequest = {
    name: "Downtown Billiards",
    address: "123 Main St, Anytown, USA",
    metadata: {
      phone: "555-123-4567",
      hours: {
        monday: "12pm-2am",
        tuesday: "12pm-2am",
        wednesday: "12pm-2am",
        thursday: "12pm-2am",
        friday: "12pm-3am",
        saturday: "12pm-3am",
        sunday: "12pm-12am"
      }
    }
  };
  
  // Response
  const venueResponse = {
    id: "b5f3d1e9-6a2c-4b5d-8e7f-9a8b7c6d5e4f",
    name: "Downtown Billiards",
    address: "123 Main St, Anytown, USA",
    metadata: {
      phone: "555-123-4567",
      hours: {
        monday: "12pm-2am",
        tuesday: "12pm-2am",
        wednesday: "12pm-2am",
        thursday: "12pm-2am",
        friday: "12pm-3am",
        saturday: "12pm-3am",
        sunday: "12pm-12am"
      }
    },
    created_at: "2025-02-26T10:30:00.000Z"
  };
  
  // 2. Adding tables to a venue
  // POST /tables
  const createTableRequest = {
    venue_id: "b5f3d1e9-6a2c-4b5d-8e7f-9a8b7c6d5e4f",
    name: "Table 1",
    type: "8-ball",
    is_available: true,
    metadata: {
      size: "9ft",
      brand: "Brunswick",
      felt_color: "green"
    }
  };
  
  // Response
  const tableResponse = {
    id: "c6e4f2d1-5a3b-4c9d-7e6f-8a9b0c1d2e3f",
    venue_id: "b5f3d1e9-6a2c-4b5d-8e7f-9a8b7c6d5e4f",
    name: "Table 1",
    type: "8-ball",
    is_available: true,
    metadata: {
      size: "9ft",
      brand: "Brunswick",
      felt_color: "green"
    },
    created_at: "2025-02-26T10:45:00.000Z"
  };
  
  // 3. Creating a player
  // POST /players
  const createPlayerRequest = {
    name: "John Smith",
    email: "john@example.com",
    rating: 1750,
    metadata: {
      preferred_game: "8-ball",
      years_playing: 5,
      profile_image: "john_profile.jpg"
    }
  };
  
  // Response
  const playerResponse = {
    id: "d7f5e3c1-4b9a-3d8c-6e5f-7a8b9c0d1e2f",
    name: "John Smith",
    email: "john@example.com",
    rating: 1750,
    metadata: {
      preferred_game: "8-ball",
      years_playing: 5,
      profile_image: "john_profile.jpg"
    },
    created_at: "2025-02-26T11:00:00.000Z"
  };
  
  // 4. Starting a match
  // POST /matches
  const createMatchRequest = {
    table_id: "c6e4f2d1-5a3b-4c9d-7e6f-8a9b0c1d2e3f",
    teams: [
      {
        name: "John & Mike",
        players: ["d7f5e3c1-4b9a-3d8c-6e5f-7a8b9c0d1e2f", "e8f6d4c2-3b0a-2d9c-1e8f-7a6b5c4d3e2f"],
        type: "stripes"
      },
      {
        name: "Sarah & Tom",
        players: ["f9e7d5c3-2b1a-0d9c-8e7f-6a5b4c3d2e1f", "g0f8e6d4-1c2b-0a9d-8e7f-6a5b4c3d2e1f"],
        type: "solids"
      }
    ],
    score: {
      games_to_win: 3,
      current_score: [0, 0]
    },
    metadata: {
      bet_amount: 20,
      rules: "BCA"
    }
  };
  
  // Response
  const matchResponse = {
    id: "h1i9j7k5-6l4m-3n2o-1p0q-9r8s7t6u5v4w",
    table_id: "c6e4f2d1-5a3b-4c9d-7e6f-8a9b0c1d2e3f",
    start_time: "2025-02-26T12:00:00.000Z",
    end_time: null,
    status: "active",
    teams: [
      {
        name: "John & Mike",
        players: ["d7f5e3c1-4b9a-3d8c-6e5f-7a8b9c0d1e2f", "e8f6d4c2-3b0a-2d9c-1e8f-7a6b5c4d3e2f"],
        type: "stripes"
      },
      {
        name: "Sarah & Tom",
        players: ["f9e7d5c3-2b1a-0d9c-8e7f-6a5b4c3d2e1f", "g0f8e6d4-1c2b-0a9d-8e7f-6a5b4c3d2e1f"],
        type: "solids"
      }
    ],
    score: {
      games_to_win: 3,
      current_score: [0, 0]
    },
    metadata: {
      bet_amount: 20,
      rules: "BCA"
    },
    created_at: "2025-02-26T12:00:00.000Z"
  };
  
  // 5. Adding player to queue
  // POST /queue_entries
  const createQueueEntryRequest = {
    table_id: "c6e4f2d1-5a3b-4c9d-7e6f-8a9b0c1d2e3f",
    player_id: "x5y3z1a9-8b7c-6d5e-4f3g-2h1i0j9k8l7m",
    position: 1
  };
  
  // Response
  const queueEntryResponse = {
    id: "n6o4p2q0-9r8s-7t6u-5v4w-3x2y1z0a9b8c",
    table_id: "c6e4f2d1-5a3b-4c9d-7e6f-8a9b0c1d2e3f",
    player_id: "x5y3z1a9-8b7c-6d5e-4f3g-2h1i0j9k8l7m",
    position: 1,
    skipped: false,
    created_at: "2025-02-26T12:30:00.000Z"
  };
  
  // 6. Updating match score
  // PATCH /matches/h1i9j7k5-6l4m-3n2o-1p0q-9r8s7t6u5v4w
  const updateMatchScoreRequest = {
    score: {
      games_to_win: 3,
      current_score: [1, 0]
    }
  };
  
  // Response
  const updatedMatchResponse = {
    id: "h1i9j7k5-6l4m-3n2o-1p0q-9r8s7t6u5v4w",
    table_id: "c6e4f2d1-5a3b-4c9d-7e6f-8a9b0c1d2e3f",
    start_time: "2025-02-26T12:00:00.000Z",
    end_time: null,
    status: "active",
    teams: [
      {
        name: "John & Mike",
        players: ["d7f5e3c1-4b9a-3d8c-6e5f-7a8b9c0d1e2f", "e8f6d4c2-3b0a-2d9c-1e8f-7a6b5c4d3e2f"],
        type: "stripes"
      },
      {
        name: "Sarah & Tom",
        players: ["f9e7d5c3-2b1a-0d9c-8e7f-6a5b4c3d2e1f", "g0f8e6d4-1c2b-0a9d-8e7f-6a5b4c3d2e1f"],
        type: "solids"
      }
    ],
    score: {
      games_to_win: 3,
      current_score: [1, 0]
    },
    metadata: {
      bet_amount: 20,
      rules: "BCA"
    },
    created_at: "2025-02-26T12:00:00.000Z"
  };
  
  // 7. Completing a match
  // PATCH /matches/h1i9j7k5-6l4m-3n2o-1p0q-9r8s7t6u5v4w
  const completeMatchRequest = {
    status: "completed",
    end_time: "2025-02-26T13:30:00.000Z",
    score: {
      games_to_win: 3,
      current_score: [3, 1],
      winner: 0 // Index of winning team
    }
  };
  
  // Response
  const completedMatchResponse = {
    id: "h1i9j7k5-6l4m-3n2o-1p0q-9r8s7t6u5v4w",
    table_id: "c6e4f2d1-5a3b-4c9d-7e6f-8a9b0c1d2e3f",
    start_time: "2025-02-26T12:00:00.000Z",
    end_time: "2025-02-26T13:30:00.000Z",
    status: "completed",
    teams: [
      {
        name: "John & Mike",
        players: ["d7f5e3c1-4b9a-3d8c-6e5f-7a8b9c0d1e2f", "e8f6d4c2-3b0a-2d9c-1e8f-7a6b5c4d3e2f"],
        type: "stripes"
      },
      {
        name: "Sarah & Tom",
        players: ["f9e7d5c3-2b1a-0d9c-8e7f-6a5b4c3d2e1f", "g0f8e6d4-1c2b-0a9d-8e7f-6a5b4c3d2e1f"],
        type: "solids"
      }
    ],
    score: {
      games_to_win: 3,
      current_score: [3, 1],
      winner: 0
    },
    metadata: {
      bet_amount: 20,
      rules: "BCA"
    },
    created_at: "2025-02-26T12:00:00.000Z"
  };
  
  // 8. Sample Supabase Realtime Update Payload
  // This is what gets delivered via realtime subscription
  const realtimeTableUpdate = {
    schema: "public",
    table: "tables",
    commit_timestamp: "2025-02-26T13:30:05.000Z",
    eventType: "UPDATE",
    new: {
      id: "c6e4f2d1-5a3b-4c9d-7e6f-8a9b0c1d2e3f",
      venue_id: "b5f3d1e9-6a2c-4b5d-8e7f-9a8b7c6d5e4f",
      name: "Table 1",
      type: "8-ball",
      is_available: true, // Changed from false to true when match completed
      metadata: {
        size: "9ft",
        brand: "Brunswick",
        felt_color: "green"
      },
      created_at: "2025-02-26T10:45:00.000Z"
    },
    old: {
      id: "c6e4f2d1-5a3b-4c9d-7e6f-8a9b0c1d2e3f",
      venue_id: "b5f3d1e9-6a2c-4b5d-8e7f-9a8b7c6d5e4f",
      name: "Table 1",
      type: "8-ball",
      is_available: false,
      metadata: {
        size: "9ft",
        brand: "Brunswick",
        felt_color: "green"
      },
      created_at: "2025-02-26T10:45:00.000Z"
    }
  };
  
  // 9. Fetching tables with current matches and queues (join example)
  const tableWithJoinsResponse = {
    id: "c6e4f2d1-5a3b-4c9d-7e6f-8a9b0c1d2e3f",
    name: "Table 1",
    type: "8-ball",
    is_available: false,
    current_match: {
      id: "h1i9j7k5-6l4m-3n2o-1p0q-9r8s7t6u5v4w",
      start_time: "2025-02-26T12:00:00.000Z",
      teams: [
        { name: "John & Mike", type: "stripes" },
        { name: "Sarah & Tom", type: "solids" }
      ],
      score: {
        current_score: [2, 1]
      }
    },
    queue: [
      {
        id: "n6o4p2q0-9r8s-7t6u-5v4w-3x2y1z0a9b8c",
        position: 1,
        skipped: false,
        player: {
          id: "x5y3z1a9-8b7c-6d5e-4f3g-2h1i0j9k8l7m",
          name: "Alex",
          rating: 1890
        }
      },
      {
        id: "c7d5e3f1-2g0h-9i8j-7k6l-5m4n3o2p1q0r",
        position: 2,
        skipped: false,
        player: {
          id: "s9t7u5v3-4w2x-1y0z-9a8b-7c6d5e4f3g2h",
          name: "Chris",
          rating: 1750
        }
      }
    ]
  };
  
  // 10. Fetching venue with all tables status
  const venueWithTablesResponse = {
    id: "b5f3d1e9-6a2c-4b5d-8e7f-9a8b7c6d5e4f",
    name: "Downtown Billiards",
    address: "123 Main St, Anytown, USA",
    tables: [
      {
        id: "c6e4f2d1-5a3b-4c9d-7e6f-8a9b0c1d2e3f",
        name: "Table 1",
        type: "8-ball",
        is_available: false,
        has_queue: true,
        queue_length: 2
      },
      {
        id: "d7e5f3g1-2h0i-9j8k-7l6m-5n4o3p2q1r0s",
        name: "Table 2",
        type: "9-ball",
        is_available: true,
        has_queue: false,
        queue_length: 0
      }
    ]
  };