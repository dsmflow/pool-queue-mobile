import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { PlayerCard, Player } from '../../components/PlayerCard';
import { useThemeColor } from '../../components/Theme';

const mockPlayers: Player[] = [
  {
    id: '1',
    name: 'John Smith',
    skillRating: 1850,
    gamesPlayed: 42,
    winRate: 0.67,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    skillRating: 1920,
    gamesPlayed: 38,
    winRate: 0.71,
  },
  {
    id: '3',
    name: 'Mike Wilson',
    skillRating: 1760,
    gamesPlayed: 25,
    winRate: 0.52,
  },
];

export default function PlayersScreen() {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <FlatList
        data={mockPlayers}
        renderItem={({ item }) => <PlayerCard player={item} />}
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
  list: {
    padding: 16,
  },
});