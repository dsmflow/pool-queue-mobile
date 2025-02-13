import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from './Theme';

export type Player = {
  id: string;
  name: string;
  skillRating: number;
  gamesPlayed: number;
  winRate: number;
};

type PlayerCardProps = {
  player: Player;
  onPress?: () => void;
};

export function PlayerCard({ player, onPress }: PlayerCardProps) {
  const backgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  return (
    <Pressable onPress={onPress}>
      <View style={[styles.card, { backgroundColor, borderColor }]}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: textColor }]}>{player.name}</Text>
          <View style={styles.rating}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={[styles.ratingText, { color: textColor }]}>
              {player.skillRating}
            </Text>
          </View>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: textColor }]}>Games</Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {player.gamesPlayed}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: textColor }]}>Win Rate</Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {(player.winRate * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});