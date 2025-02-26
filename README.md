# Pool Queue Mobile

A React Native mobile application for managing pool matches and player queues in pool halls and venues. Built with React Native, Expo, and Supabase.

## Features

- 🎱 Real-time match tracking and scoring
- 👥 Player profiles and statistics
- 📊 Match history and win rate tracking
- 🏢 Venue management system
- ⏱️ Queue management for tables
- 📱 Cross-platform (iOS & Android)
- 🔐 User authentication and authorization
- 📈 Player rating system

## Tech Stack

- **Frontend**: React Native, Expo
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Context
- **Navigation**: React Navigation
- **Database**: PostgreSQL with RLS policies

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Supabase account
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dsmflow/pool-queue-mobile.git
cd pool-queue-mobile
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory and add your Supabase credentials:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npx expo start
```

### Database Setup

The `db` directory contains all necessary SQL scripts for setting up the database schema and policies. Run these scripts in your Supabase SQL editor in the following order:

1. Schema creation scripts in `db/schema/`
2. RLS policy scripts
3. Migration scripts (if applicable)

## Project Structure

```
pool-queue-mobile/
├── app/
│   ├── api/          # API integration
│   ├── components/   # Reusable components
│   ├── context/      # React Context providers
│   ├── navigation/   # Navigation configuration
│   ├── screens/      # Application screens
│   ├── types/        # TypeScript type definitions
│   └── utils/        # Utility functions
├── db/
│   ├── schema/       # Database schema definitions
│   └── migrations/   # Database migrations
├── docs/            # Documentation
└── scripts/         # Utility scripts
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
