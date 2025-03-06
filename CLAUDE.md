# Pool Queue App - Development Guidelines

## Commands
- `npm run start` - Start development server with Expo
- `npm run android` - Build and run on Android
- `npm run ios` - Build and run on iOS
- `npm run web` - Start web development server
- `npm run generate-types` - Generate TypeScript types from Supabase

## Code Style
- **Imports**: React/RN first, external libraries next, local imports grouped by functionality
- **Naming**: Components in PascalCase (.tsx), utilities in camelCase (.ts)
- **Types**: Interface props with `SomethingProps`, React components as `React.FC<Props>`
- **State**: Explicit typing `useState<boolean>(false)`, descriptive names
- **Error handling**: Try/catch in async functions, console.error + user feedback
- **Formatting**: 2-space indentation, semi-colons, trailing commas
- **Component structure**: Props → state → effects → handlers → render
- **Styles**: Use StyleSheet.create() at bottom of file

## Architecture
- Supabase for backend (auth, database)
- React Navigation for routing (stack + tabs)
- Context API for global state management
- TypeScript throughout the codebase