// app/components/QueuePositionIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface QueuePositionIndicatorProps {
  position: number;
  totalInQueue: number;
  isCurrentPlayer: boolean;
}

export const QueuePositionIndicator: React.FC<QueuePositionIndicatorProps> = ({
  position,
  totalInQueue,
  isCurrentPlayer
}) => {
  // Different styles based on position
  let backgroundColor = '#3498db'; // Default blue
  let statusText = `Position ${position} of ${totalInQueue}`;
  
  if (position === 1) {
    // Next up
    backgroundColor = '#f39c12'; // Orange
    statusText = 'Next Up';
  }
  
  if (isCurrentPlayer) {
    // Your turn!
    backgroundColor = '#2ecc71'; // Green
    statusText = 'Your Turn!';
  }
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={styles.positionText}>
        {position === 0 ? 'Playing Now' : `#${position}`}
      </Text>
      <Text style={styles.statusText}>{statusText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  positionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
  },
});