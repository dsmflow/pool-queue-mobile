import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity 
} from 'react-native';
import { PlayerWithDetails } from '../types/custom.types';

interface QueueDisplayProps {
  queue: PlayerWithDetails[];
  onRemovePlayer?: (queueEntryId: string) => void;
  onToggleSkip?: (queueEntryId: string, currentSkipStatus: boolean) => void;
  isEditable?: boolean;
}

export const QueueDisplay: React.FC<QueueDisplayProps> = ({
  queue,
  onRemovePlayer,
  onToggleSkip,
  isEditable = false
}) => {
  if (queue.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No players in queue</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Current Queue</Text>
      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={[
            styles.queueItem,
            item.skipped && styles.skippedItem
          ]}>
            <View style={styles.positionContainer}>
              <Text style={styles.positionText}>{item.position}</Text>
            </View>
            <View style={styles.playerInfoContainer}>
              <Text style={styles.playerName}>{item.player.name}</Text>
              <Text style={styles.playerRating}>Rating: {item.player.rating}</Text>
            </View>
            {isEditable && (
              <View style={styles.actionsContainer}>
                {onToggleSkip && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      item.skipped ? styles.unskipButton : styles.skipButton
                    ]}
                    onPress={() => onToggleSkip(item.id, item.skipped)}
                  >
                    <Text style={styles.actionButtonText}>
                      {item.skipped ? 'Unskip' : 'Skip'}
                    </Text>
                  </TouchableOpacity>
                )}
                {onRemovePlayer && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={() => onRemovePlayer(item.id)}
                  >
                    <Text style={styles.actionButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  skippedItem: {
    opacity: 0.5,
    backgroundColor: '#f8f8f8',
  },
  positionContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  playerInfoContainer: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  playerRating: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  skipButton: {
    backgroundColor: '#f39c12',
  },
  unskipButton: {
    backgroundColor: '#27ae60',
  },
  removeButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
});
