import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useThemeColor } from '../../components/Theme';
import { format } from 'date-fns';

type Game = {
  id: string;
  players: string[];
  winner: string;
  duration: number; // in minutes
  date: Date;
};

const mockGames: Game[] = [
  {
    id: '1',
    players: ['John & Mike', 'Sarah & Tom'],
    winner: 'John & Mike',
    duration: 23,
    date: new Date(),
  },
  {
    id: '2',
    players: ['Alex & Chris', 'Emma & Dave'],
    winner: 'Emma & Dave',
    duration: 18,
    date: new Date(Date.now() - 3600000),
  },
];

export default function GamesScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'card');
  const tintColor = useThemeColor({}, 'tint');

  const renderGameItem = ({ item }: { item: Game }) => (
    <View style={[styles.gameItem, { backgroundColor: cardColor }]}>
      <View style={styles.gameHeader}>
        <Text style={[styles.date, { color: textColor }]}>
          {format(item.date, 'MMM d, h:mm a')}
        </Text>
        <Text style={[styles.duration, { color: textColor }]}>
          {item.duration} min
        </Text>
      </View>
      <View style={styles.matchup}>
        <Text
          style={[
            styles.team,
            { color: item.winner === item.players[0] ? tintColor : textColor },
          ]}>
          {item.players[0]}
        </Text>
        <Text style={[styles.vs, { color: textColor }]}>vs</Text>
        <Text
          style={[
            styles.team,
            { color: item.winner === item.players[1] ? tintColor : textColor },
          ]}>
          {item.players[1]}
        </Text>
      </View>
      <Text style={[styles.winner, { color: tintColor }]}>
        Winner: {item.winner}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, { color: textColor }]}>Recent Games</Text>
      <FlatList
        data={mockGames}
        renderItem={renderGameItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  list: {
    padding: 16,
  },
  gameItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    opacity: 0.8,
  },
  duration: {
    fontSize: 14,
    opacity: 0.8,
  },
  matchup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  team: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  vs: {
    fontSize: 14,
    opacity: 0.6,
    marginHorizontal: 8,
  },
  winner: {
    fontSize: 14,
    fontWeight: '600',
  },
});