import { supabase } from './supabase';
import { Match } from '../types/database.types';

/**
 * Fetch a venue by ID
 * @param venueId The ID of the venue to fetch
 * @returns The venue data
 */
export const fetchVenue = async (venueId: string) => {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * Fetch all venues
 * @returns Array of venues
 */
export const fetchAllVenues = async () => {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

/**
 * Fetch the last venue a user played at
 * @param userId The ID of the user
 * @returns The venue data and the last match played there
 */
export const fetchLastPlayedVenue = async (userId: string) => {
  // First, find the most recent match the user participated in
  const { data: matchesData, error: matchesError } = await supabase
    .from('matches')
    .select(`
      id,
      table_id,
      teams,
      start_time,
      end_time,
      status
    `)
    .order('start_time', { ascending: false })
    .limit(10); // Fetch last 10 matches to filter through
  
  if (matchesError) throw matchesError;
  
  // Filter matches to find ones where the user participated
  const userMatches = matchesData?.filter(match => {
    // Ensure teams is an array
    if (!match.teams || !Array.isArray(match.teams)) {
      return false;
    }
    
    // Check if any team has the current user
    return match.teams.some(team => {
      // Ensure team.players is an array
      if (!team || !team.players || !Array.isArray(team.players)) {
        return false;
      }
      // Check if the user is in the team
      return team.players.some(playerId => 
        typeof playerId === 'string' && playerId === userId
      );
    });
  });
  
  if (!userMatches || userMatches.length === 0) {
    return null; // User hasn't played any matches
  }
  
  // Get the most recent match
  const lastMatch = userMatches[0];
  
  // Get the table details to find the venue
  const { data: tableData, error: tableError } = await supabase
    .from('tables')
    .select('venue_id')
    .eq('id', lastMatch.table_id)
    .single();
  
  if (tableError) {
    console.error('Error fetching table data:', tableError);
    // Try to return a default venue instead of throwing
    const { data: defaultVenue } = await supabase
      .from('venues')
      .select('*')
      .limit(1)
      .single();
      
    if (defaultVenue) {
      return {
        venue: defaultVenue,
        lastMatch: lastMatch as Match
      };
    }
    throw tableError;
  }
  
  if (!tableData || !tableData.venue_id) {
    throw new Error('Table data or venue_id is missing');
  }
  
  // Get the venue details
  const { data: venueData, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('id', tableData.venue_id)
    .single();
  
  if (venueError) {
    console.error('Error fetching venue data:', venueError);
    // Try to return a default venue instead of throwing
    const { data: defaultVenue } = await supabase
      .from('venues')
      .select('*')
      .limit(1)
      .single();
      
    if (defaultVenue) {
      return {
        venue: defaultVenue,
        lastMatch: lastMatch as Match
      };
    }
    throw venueError;
  }
  
  return {
    venue: venueData,
    lastMatch: lastMatch as Match
  };
};
