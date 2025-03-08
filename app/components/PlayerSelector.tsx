import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Player } from '../types/database.types';

interface PlayerSelectorProps {
  visible: boolean;
  players: Player[];
  onSelect: (playerId: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export const PlayerSelector: React.FC<PlayerSelectorProps> = ({
  visible,
  players,
  onSelect,
  onClose,
  loading = false
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Player</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Joining queue...</Text>
            </View>
          ) : (
            <FlatList
              data={players}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.playerItem}
                  onPress={() => onSelect(item.id)}
                  disabled={loading}
                >
                  <Text style={styles.playerName}>{item.name}</Text>
                  <Text style={styles.playerRating}>Rating: {item.rating}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No players found</Text>
              }
            />
          )}
          
          <TouchableOpacity
            style={[styles.closeButton, loading && styles.disabledButton]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.closeButtonText}>{loading ? 'Please wait...' : 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  playerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerRating: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 16,
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});
