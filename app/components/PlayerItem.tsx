import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Player } from '../types/database.types';

type PlayerItemProps = {
  player: Player;
  selected?: boolean;
  showRating?: boolean;
  onPress?: () => void;
  style?: object;
};

export const PlayerItem: React.FC<PlayerItemProps> = ({
  player,
  selected = false,
  showRating = true,
  onPress,
  style
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.selected,
        style
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.content}>
        <Text style={styles.name}>{player.name}</Text>
        {showRating && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>★ {player.rating}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  selected: {
    backgroundColor: '#e3f2fd',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  ratingContainer: {
    backgroundColor: '#fff9c4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    color: '#f57f17',
    fontWeight: 'bold',
  },
});