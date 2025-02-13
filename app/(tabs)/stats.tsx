import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeColor } from '../../components/Theme';

type StatCard = {
  title: string;
  value: string | number;
  subtitle?: string;
};

const mockStats: StatCard[] = [
  { title: 'Total Games', value: 156 },
  { title: 'Average Game Time', value: '21 min' },
  { title: 'Most Active Player', value: 'John Smith', subtitle: '42 games' },
  { title: 'Highest Win Rate', value: '71%', subtitle: 'Sarah Johnson' },
  { title: 'Longest Streak', value: '8 wins', subtitle: 'Mike & Sarah' },
  { title: 'Today\'s Games', value: 12 },
];

export default function StatsScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'card');

  const renderStatCard = ({ title, value, subtitle }: StatCard) => (
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.cardValue, { color: textColor }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.cardSubtitle, { color: textColor }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: textColor }]}>Statistics</Text>
      <View style={styles.grid}>
        {mockStats.map((stat, index) => (
          <View key={index} style={styles.gridItem}>
            {renderStatCard(stat)}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -8,
  },
  gridItem: {
    width: '50%',
    padding: 8,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
});