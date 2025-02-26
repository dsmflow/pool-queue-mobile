import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  SafeAreaView,
  TextInput,
  Alert,
  ScrollView
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { supabase } from '../api/supabase';
import { startMatch } from '../api/matches';
import { Player } from '../types/database.types';
import { TeamData } from '../types/custom.types';

type MatchSetupScreenRouteProp = RouteProp<RootStackParamList, 'MatchSetup'>;
type MatchSetupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MatchSetup'>;

type Props = {
  route: MatchSetupScreenRouteProp;
  navigation: MatchSetupScreenNavigationProp;
};

export const MatchSetupScreen: React.FC<Props> = ({ route, navigation }) => {
  const { tableId } = route.params;
  
  const [table, setTable] = useState<{ name: string; type: string } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');
  const [team1Players, setTeam1Players] = useState<string[]>([]);
  const [team2Players, setTeam2Players] = useState<string[]>([]);
  const [team1Type, setTeam1Type] = useState<'stripes' | 'solids'>('stripes');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get table details
        const { data: tableData, error: tableError } = await supabase
          .from('tables')
          .select('name, type')
          .eq('id', tableId)
          .single();
        
        if (tableError) throw tableError;
        setTable(tableData);
        
        // Get all players
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, name, rating')
          .order('name');
        
        if (playersError) throw playersError;
        setPlayers(playersData as Player[]);
      } catch (error) {
        console.error('Error loading setup data:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [tableId]);
  
  const togglePlayerSelection = (team: 'team1' | 'team2', playerId: string) => {
    if (team === 'team1') {
      if (team1Players.includes(playerId)) {
        setTeam1Players(team1Players.filter(id => id !== playerId));
      } else {
        setTeam1Players([...team1Players, playerId]);
      }
    } else {
      if (team2Players.includes(playerId)) {
        setTeam2Players(team2Players.filter(id => id !== playerId));
      } else {
        setTeam2Players([...team2Players, playerId]);
      }
    }
  };
  
  const toggleTeamType = () => {
    setTeam1Type(team1Type === 'stripes' ? 'solids' : 'stripes');
  };
  
  const handleStartMatch = async () => {
    if (team1Players.length === 0 || team2Players.length === 0) {
      Alert.alert('Error', 'Each team must have at least one player');
      return;
    }
    
    try {
      const teams: TeamData[] = [
        {
          name: team1Name,
          players: team1Players,
          type: team1Type
        },
        {
          name: team2Name,
          players: team2Players,
          type: team1Type === 'stripes' ? 'solids' : 'stripes'
        }
      ];
      
      const match = await startMatch(tableId, teams);
      
      // Navigate to the Match screen to view the match instead of going back
      navigation.navigate('Match', { 
        matchId: match.id,
        tableId: tableId
      });
    } catch (error) {
      console.error('Error starting match:', error);
      Alert.alert('Error', 'Failed to start match. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>New Match Setup</Text>
      <Text style={styles.tableInfo}>
        {table?.name} • {table?.type}
      </Text>
      
      <View style={styles.teamsContainer}>
        {/* Team 1 Setup */}
        <View style={styles.teamSection}>
          <TextInput
            style={styles.teamNameInput}
            value={team1Name}
            onChangeText={setTeam1Name}
            placeholder="Team 1 Name"
          />
          <TouchableOpacity 
            style={[
              styles.teamTypeButton, 
              { backgroundColor: team1Type === 'stripes' ? '#3498db' : '#e74c3c' }
            ]}
            onPress={toggleTeamType}
          >
            <Text style={styles.teamTypeText}>{team1Type}</Text>
          </TouchableOpacity>
          
          <Text style={styles.sectionTitle}>Select Players:</Text>
          <FlatList
            data={players}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.playerItem,
                  team1Players.includes(item.id) && styles.selectedPlayer
                ]}
                onPress={() => togglePlayerSelection('team1', item.id)}
              >
                <Text style={styles.playerName}>{item.name}</Text>
                <Text style={styles.playerRating}>★ {item.rating}</Text>
              </TouchableOpacity>
            )}
            style={styles.playersList}
          />
        </View>
        
        {/* Team 2 Setup */}
        <View style={styles.teamSection}>
          <TextInput
            style={styles.teamNameInput}
            value={team2Name}
            onChangeText={setTeam2Name}
            placeholder="Team 2 Name"
          />
          <View style={[
            styles.teamTypeButton, 
            { backgroundColor: team1Type === 'stripes' ? '#e74c3c' : '#3498db' }
          ]}>
            <Text style={styles.teamTypeText}>
              {team1Type === 'stripes' ? 'solids' : 'stripes'}
            </Text>
          </View>
          
          <Text style={styles.sectionTitle}>Select Players:</Text>
          <FlatList
            data={players}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.playerItem,
                  team2Players.includes(item.id) && styles.selectedPlayer
                ]}
                onPress={() => togglePlayerSelection('team2', item.id)}
              >
                <Text style={styles.playerName}>{item.name}</Text>
                <Text style={styles.playerRating}>★ {item.rating}</Text>
              </TouchableOpacity>
            )}
            style={styles.playersList}
          />
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.startButton}
        onPress={handleStartMatch}
      >
        <Text style={styles.startButtonText}>Start Match</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  tableInfo: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 24,
    textAlign: 'center',
  },
  teamsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  teamSection: {
    flex: 1,
    marginHorizontal: 8,
  },
  teamNameInput: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    fontSize: 16,
  },
  teamTypeButton: {
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  teamTypeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  playersList: {
    backgroundColor: '#fff',
    borderRadius: 4,
    maxHeight: 300,
  },
  playerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedPlayer: {
    backgroundColor: '#e3f2fd',
  },
  playerName: {
    fontSize: 14,
  },
  playerRating: {
    fontSize: 12,
    color: '#f39c12',
  },
  startButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});