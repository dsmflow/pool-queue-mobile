import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { QueueEntry, Player } from '../types/database.types';

type QueueEntryWithPlayer = QueueEntry & {
  player: Player;
};

type QueueListProps = {
  queue: QueueEntryWithPlayer[];
  onSkipPress: (queueEntryId: string, currentSkipStatus: boolean) => void;
  onRemovePress?: (queueEntryId: string) => void;
};

export const QueueList: React.FC<QueueListProps> = ({
  queue,
  onSkipPress,
  onRemovePress
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
      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.queueItem}>
            <View style={styles.positionContainer}>
              <Text style={styles.positionText}>{index + 1}</Text>
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{item.player.name}</Text>
              <Text style={styles.playerRating}>★ {item.player.rating}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.skipButton,
                  item.skipped && styles.skippedButton
                ]}
                onPress={() => onSkipPress(item.id, item.skipped)}
              >
                <Text style={styles.skipButtonText}>
                  {item.skipped ? 'Unskip' : 'Skip'}
                </Text>
              </TouchableOpacity>
              
              {onRemovePress && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemovePress(item.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  emptyText: {
    color: '#9e9e9e',
    fontSize: 16,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  positionContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#424242',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  playerRating: {
    fontSize: 14,
    color: '#f57f17',
  },
  actions: {
    flexDirection: 'row',
  },
  skipButton: {
    backgroundColor: '#f1f2f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  skippedButton: {
    backgroundColor: '#d1d8e0',
  },
  skipButtonText: {
    fontSize: 12,
    color: '#2f3542',
  },
  removeButton: {
    backgroundColor: '#ffebee',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  removeButtonText: {
    fontSize: 12,
    color: '#c62828',
  },
});