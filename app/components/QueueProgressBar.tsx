// app/components/QueueProgressBar.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface QueueProgressBarProps {
  position: number;
  totalInQueue: number;
}

export const QueueProgressBar: React.FC<QueueProgressBarProps> = ({
  position,
  totalInQueue
}) => {
  // Calculate progress percentage (0 if not in queue)
  const progressPercentage = position > 0 
    ? Math.max(0, 100 - ((position - 1) / totalInQueue) * 100)
    : 0;
    
  let barColor = '#3498db'; // Default blue
  let statusText = 'In Queue';
  
  if (progressPercentage >= 95) {
    // About to play
    barColor = '#2ecc71'; // Green
    statusText = 'Your Turn Next!';
  } else if (progressPercentage >= 75) {
    // Coming up soon
    barColor = '#f39c12'; // Orange
    statusText = 'Coming Up Soon';
  }
  
  if (position <= 0) {
    statusText = 'Not In Queue';
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{statusText}</Text>
        {position > 0 && (
          <Text style={styles.positionText}>
            Position: {position} of {totalInQueue}
          </Text>
        )}
      </View>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.progressBar,
            { width: `${progressPercentage}%`, backgroundColor: barColor }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34495e',
  },
  positionText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  barBackground: {
    height: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
});