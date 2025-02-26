import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { fetchPlayers, createPlayer } from '../api/tables';
import { Player } from '../types/database.types';
import { PlayerItem } from '../components/PlayerItem';
import { supabase } from '../api/supabase';

type PlayerScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'PlayerScreen'>;
};

export const PlayerScreen: React.FC<PlayerScreenProps> = ({ navigation }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  
  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await fetchPlayers();
      setPlayers(data);
    } catch (error) {
      console.error('Error loading players:', error);
      Alert.alert('Error', 'Failed to load players');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    loadPlayers();
    
    // Subscribe to player changes
    const subscription = supabase
      .channel('players_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          loadPlayers();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadPlayers();
  };
  
  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }
    
    try {
      await createPlayer(
        newPlayerName.trim(),
        newPlayerEmail.trim() || undefined
      );
      
      setShowAddModal(false);
      setNewPlayerName('');
      setNewPlayerEmail('');
      
      // Players will be refreshed via subscription
    } catch (error) {
      console.error('Error creating player:', error);
      Alert.alert('Error', 'Failed to create player');
    }
  };
  
  const filteredPlayers = searchQuery
    ? players.filter(player => 
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : players;
  
  const renderItem = ({ item }: { item: Player }) => (
    <PlayerItem
      player={item}
      onPress={() => {
        // Navigate to player details or select player
        navigation.navigate('PlayerDetailsScreen', { playerId: item.id });
      }}
    />
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Players</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Player</Text>
        </TouchableOpacity>
      </View>
      
      <TextInput
        style={styles.searchInput}
        placeholder="Search players..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
      />
      
      {loading && players.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <FlatList
          data={filteredPlayers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No players found matching your search' : 'No players found'}
              </Text>
            </View>
          }
        />
      )}
      
      {/* Add Player Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Player</Text>
            
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter player name"
              value={newPlayerName}
              onChangeText={setNewPlayerName}
            />
            
            <Text style={styles.inputLabel}>Email (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter player email"
              value={newPlayerEmail}
              onChangeText={setNewPlayerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewPlayerName('');
                  setNewPlayerEmail('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddPlayer}
              >
                <Text style={styles.saveButtonText}>Add Player</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f5f6fa',
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f6fa',
  },
  cancelButtonText: {
    color: '#7f8c8d',
  },
  saveButton: {
    backgroundColor: '#3498db',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});