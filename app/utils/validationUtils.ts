import { EnhancedMatch, TeamData, MatchMetadata, RatingChange } from '../types/custom.types';
import { Match, Player } from '../types/database.types';

/**
 * Validates and normalizes match score data
 * @param scoreData Raw score data from the database
 * @returns Normalized score object with proper types
 */
export const validateMatchScore = (scoreData: any): { current_score: number[]; games_to_win: number } => {
  // Default values
  const defaultScore = { current_score: [0, 0], games_to_win: 3 };
  
  // Return default if no data
  if (!scoreData) return defaultScore;
  
  // Start with defaults and override with valid data
  const result = { ...defaultScore };
  
  // Validate current_score
  if (scoreData.current_score && Array.isArray(scoreData.current_score)) {
    const scoreArray = scoreData.current_score;
    // Ensure it's an array of two numbers
    if (scoreArray.length >= 2 && 
        typeof scoreArray[0] === 'number' && 
        typeof scoreArray[1] === 'number') {
      result.current_score = [scoreArray[0], scoreArray[1]];
    }
  }
  
  // Validate games_to_win
  if (scoreData.games_to_win && typeof scoreData.games_to_win === 'number') {
    result.games_to_win = scoreData.games_to_win;
  }
  
  return result;
};

/**
 * Validates and normalizes team data
 * @param teamsData Raw teams data from database
 * @returns Normalized teams array with proper types
 */
export const validateTeams = (teamsData: any): TeamData[] => {
  // Default team structure if nothing valid is provided
  const defaultTeams: TeamData[] = [
    { name: 'Team 1', players: [], type: 'undecided' },
    { name: 'Team 2', players: [], type: 'undecided' }
  ];
  
  // Return default if no data or not an array
  if (!teamsData || !Array.isArray(teamsData)) return defaultTeams;
  
  // If we have valid teams data, normalize each team
  const validatedTeams: TeamData[] = [];
  
  for (let i = 0; i < teamsData.length; i++) {
    const team = teamsData[i];
    if (!team) continue;
    
    const validTeam: TeamData = {
      // Ensure name exists and is a string
      name: typeof team.name === 'string' ? team.name : `Team ${i+1}`,
      
      // Ensure players is an array of strings
      players: Array.isArray(team.players) 
        ? team.players.filter(id => typeof id === 'string')
        : [],
      
      // Ensure type is valid
      type: ['stripes', 'solids'].includes(team.type) 
        ? team.type as 'stripes' | 'solids' 
        : 'undecided',
        
      // Keep playerDetails if they exist
      playerDetails: team.playerDetails
    };
    
    validatedTeams.push(validTeam);
  }
  
  // If no valid teams were found, return the default
  return validatedTeams.length > 0 ? validatedTeams : defaultTeams;
};

/**
 * Validates and normalizes metadata
 * @param metadata Raw metadata from database
 * @returns Normalized metadata with proper types
 */
export const validateMetadata = (metadata: any): MatchMetadata => {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  
  const result: MatchMetadata = {};
  
  // Copy valid string fields
  if (typeof metadata.name === 'string') result.name = metadata.name;
  if (typeof metadata.type === 'string') result.type = metadata.type;
  if (typeof metadata.winner_team === 'string') result.winner_team = metadata.winner_team;
  
  // Validate teams if present
  if (metadata.teams && Array.isArray(metadata.teams)) {
    result.teams = metadata.teams.map((team: any) => ({
      name: typeof team.name === 'string' ? team.name : 'Unknown Team',
      type: typeof team.type === 'string' ? team.type : undefined,
      players: Array.isArray(team.players) 
        ? team.players.filter((id: any) => typeof id === 'string')
        : []
    }));
  }
  
  // Validate rating changes if present
  if (metadata.rating_changes && typeof metadata.rating_changes === 'object') {
    const ratingChanges: Record<string, RatingChange> = {};
    
    for (const [playerId, change] of Object.entries(metadata.rating_changes)) {
      if (typeof change === 'object' && change !== null) {
        const { initial, final } = change as any;
        
        if (typeof initial === 'number' && typeof final === 'number') {
          ratingChanges[playerId] = { initial, final };
        }
      }
    }
    
    if (Object.keys(ratingChanges).length > 0) {
      result.rating_changes = ratingChanges;
    }
  }
  
  return result;
};

/**
 * Sanitizes a raw match from the database into an EnhancedMatch with proper types
 * @param rawMatch Raw match data from the database
 * @param players Optional array of players to enhance team details
 * @returns Enhanced match with validated structures
 */
export const sanitizeMatch = (
  rawMatch: Match, 
  players?: Player[]
): EnhancedMatch => {
  if (!rawMatch) {
    throw new Error('Cannot sanitize null match');
  }
  
  // Validate essential components
  const validScore = validateMatchScore(rawMatch.score);
  const validTeams = validateTeams(rawMatch.teams);
  const validMetadata = validateMetadata(rawMatch.metadata);
  
  // Add player details if players are provided
  if (players && players.length > 0) {
    // Create a map for quick player lookup
    const playerMap: Record<string, Player> = {};
    players.forEach(player => {
      if (player && player.id) {
        playerMap[player.id] = player;
      }
    });
    
    // Add player details to each team
    validTeams.forEach(team => {
      if (team.players && team.players.length > 0) {
        team.playerDetails = team.players
          .map(id => playerMap[id])
          .filter(Boolean); // Remove undefined entries
      }
    });
  }
  
  // Construct the enhanced match
  const enhancedMatch: EnhancedMatch = {
    ...rawMatch,
    teams: validTeams,
    score: validScore,
    // Add convenience fields from metadata
    name: validMetadata.name || `Match #${rawMatch.id.substring(0, 8)}`,
    type: validMetadata.type || '8-ball'
  };
  
  return enhancedMatch;
};

/**
 * Helper to safely access team information
 * @param match Match data
 * @param teamIndex Index of the team to get (0 or 1)
 * @returns Safe team data with defaults if not found
 */
export const getSafeTeam = (match: EnhancedMatch | null, teamIndex: number): TeamData => {
  if (!match || !match.teams || !match.teams[teamIndex]) {
    return { name: `Team ${teamIndex + 1}`, players: [], type: 'undecided' };
  }
  
  return match.teams[teamIndex];
};

/**
 * Helper to safely get the current score
 * @param match Match data
 * @returns Safe array of scores with defaults if not found
 */
export const getSafeScore = (match: EnhancedMatch | null): [number, number] => {
  if (!match || !match.score || !match.score.current_score) {
    return [0, 0];
  }
  
  const [score1 = 0, score2 = 0] = match.score.current_score;
  return [score1, score2];
};