import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';

type VenueCardProps = {
  venue: {
    id: string;
    name: string;
    address?: string | null;
    created_at?: string;
  };
  lastPlayed?: string;
  onPress: () => void;
};

export const VenueCard: React.FC<VenueCardProps> = ({
  venue,
  lastPlayed,
  onPress
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🎱</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.venueName}>{venue.name}</Text>
          {venue.address && (
            <Text style={styles.address}>{venue.address}</Text>
          )}
          {lastPlayed ? (
            <Text style={styles.lastPlayed}>
              Last played: {format(new Date(lastPlayed), 'MMM d, h:mm a')}
            </Text>
          ) : (
            <Text style={styles.lastPlayed}>No recent matches</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden'
  },
  content: {
    flexDirection: 'row',
    padding: 16,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  icon: {
    fontSize: 24
  },
  details: {
    flex: 1,
    justifyContent: 'center'
  },
  venueName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333'
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  lastPlayed: {
    fontSize: 14,
    color: '#666'
  }
});
