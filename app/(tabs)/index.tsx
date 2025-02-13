import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable } from 'react-native';
import { useThemeColor } from '../../components/Theme';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

type GameFormat = '8-ball' | '9-ball';
type BallGroup = 'stripes' | 'solids' | null;

type Player = {
  id: string;
  name: string;
  skillRating: number;
  isSkipped?: boolean;
};

type Team = {
  players: Player[];
  ballGroup: BallGroup;
};

type ActiveGame = {
  gameId: string;
  tableId: string;
  format: GameFormat;
  home: Team;
  away: Team;
  startTime: Date;
  duration: number;
};

type QueuePlayer = {
  id: string;
  player: Player;
  estimatedStartTime: Date;
  format: GameFormat;
};

type TableSection = {
  tableId: string;
  activeGame: ActiveGame | null;
  queue: QueuePlayer[];
};

const mockTables: TableSection[] = [
  {
    tableId: 'Table 1',
    activeGame: {
      gameId: 'active-1',
      tableId: 'Table 1',
      format: '8-ball',
      home: {
        players: [
          { id: '1', name: 'John', skillRating: 1850 },
          { id: '2', name: 'Mike', skillRating: 1920 }
        ],
        ballGroup: 'stripes',
      },
      away: {
        players: [
          { id: '3', name: 'Sarah', skillRating: 1780 },
          { id: '4', name: 'Tom', skillRating: 1840 }
        ],
        ballGroup: 'solids',
      },
      startTime: new Date(Date.now() - 10 * 60000),
      duration: 600,
    },
    queue: [
      {
        id: 'q1',
        player: { id: '5', name: 'Alex', skillRating: 1890 },
        format: '8-ball',
        estimatedStartTime: new Date(Date.now() + 15 * 60000),
      },
      {
        id: 'q2',
        player: { id: '6', name: 'Chris', skillRating: 1750 },
        format: '8-ball',
        estimatedStartTime: new Date(Date.now() + 30 * 60000),
      },
    ],
  },
  {
    tableId: 'Table 2',
    activeGame: null,
    queue: [
      {
        id: 'q3',
        player: { id: '7', name: 'Emma', skillRating: 1950 },
        format: '8-ball',
        estimatedStartTime: new Date(),
      },
      {
        id: 'q4',
        player: { id: '8', name: 'Dave', skillRating: 1830 },
        format: '8-ball',
        estimatedStartTime: new Date(Date.now() + 15 * 60000),
      },
    ],
  },
];

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatPlayerNames(team: Team): string {
  return team.players.map(player => player.name).join(' & ');
}

function SkillRatingBadge({ rating }: { rating: number }) {
  const tintColor = useThemeColor({}, 'tint');
  
  return (
    <View style={[styles.skillBadge, { backgroundColor: `${tintColor}20` }]}>
      <Ionicons name="star" size={12} color={tintColor} />
      <Text style={[styles.skillRating, { color: tintColor }]}>{rating}</Text>
    </View>
  );
}

function ActiveGameCard({ game }: { game: ActiveGame }) {
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <View style={[styles.gameCard, { backgroundColor: cardColor }]}>
      <View style={styles.gameHeader}>
        <Text style={[styles.gameFormat, { color: tintColor }]}>
          {game.format}
        </Text>
        <Text style={[styles.duration, { color: textColor }]}>
          {formatDuration(game.duration)}
        </Text>
      </View>
      <View style={styles.teamsContainer}>
        <View style={styles.teamSection}>
          <Text style={[styles.teamLabel, { color: textColor }]}>Home</Text>
          <Text style={[styles.playerNames, { color: textColor }]}>
            {formatPlayerNames(game.home)}
          </Text>
          <View style={[styles.ballGroup, { backgroundColor: tintColor }]}>
            <Text style={styles.ballGroupText}>{game.home.ballGroup}</Text>
          </View>
        </View>
        <View style={styles.vsContainer}>
          <Text style={[styles.vs, { color: textColor }]}>vs</Text>
        </View>
        <View style={styles.teamSection}>
          <Text style={[styles.teamLabel, { color: textColor }]}>Away</Text>
          <Text style={[styles.playerNames, { color: textColor }]}>
            {formatPlayerNames(game.away)}
          </Text>
          <View style={[styles.ballGroup, { backgroundColor: tintColor }]}>
            <Text style={styles.ballGroupText}>{game.away.ballGroup}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function QueuePlayerCard({ queuePlayer, onToggleSkip }: { 
  queuePlayer: QueuePlayer;
  onToggleSkip: (playerId: string) => void;
}) {
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const [isSkipped, setIsSkipped] = useState(false);

  const handleToggleSkip = () => {
    setIsSkipped(!isSkipped);
    onToggleSkip(queuePlayer.player.id);
  };

  return (
    <View style={[
      styles.queuePlayerCard,
      { 
        backgroundColor: cardColor,
        opacity: isSkipped ? 0.6 : 1
      }
    ]}>
      <View style={styles.queuePlayerInfo}>
        <View style={styles.playerDetails}>
          <Text style={[styles.playerName, { color: textColor }]}>
            {queuePlayer.player.name}
          </Text>
          <SkillRatingBadge rating={queuePlayer.player.skillRating} />
        </View>
        <View style={styles.skipContainer}>
          <Text style={[styles.skipLabel, { color: textColor }]}>
            {isSkipped ? 'Skipped' : 'Skip'}
          </Text>
          <Switch
            value={isSkipped}
            onValueChange={handleToggleSkip}
            trackColor={{ false: '#767577', true: `${tintColor}50` }}
            thumbColor={isSkipped ? tintColor : '#f4f3f4'}
          />
        </View>
      </View>
    </View>
  );
}

function TableSection({ section }: { section: TableSection }) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const handleToggleSkip = (playerId: string) => {
    // Handle skip toggle logic here
    console.log(`Toggle skip for player ${playerId}`);
  };

  return (
    <View style={styles.tableSection}>
      <Text style={[styles.tableTitle, { color: textColor }]}>
        {section.tableId}
      </Text>
      {section.activeGame ? (
        <ActiveGameCard game={section.activeGame} />
      ) : (
        <Text style={[styles.noActiveGame, { color: tintColor }]}>
          Table Available
        </Text>
      )}
      {section.queue.length > 0 && (
        <>
          <Text style={[styles.queueTitle, { color: textColor }]}>Queue</Text>
          {section.queue.map((queuePlayer) => (
            <QueuePlayerCard
              key={queuePlayer.id}
              queuePlayer={queuePlayer}
              onToggleSkip={handleToggleSkip}
            />
          ))}
        </>
      )}
    </View>
  );
}

export default function QueueScreen() {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      {mockTables.map((table) => (
        <TableSection key={table.tableId} section={table} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tableSection: {
    padding: 16,
  },
  tableTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  gameCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  queuePlayerCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  queuePlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  queuePlayerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  skipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipLabel: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.7,
  },
  gameFormat: {
    fontSize: 16,
    fontWeight: '600',
  },
  duration: {
    fontSize: 16,
    fontWeight: '600',
  },
  estimatedTime: {
    fontSize: 14,
    opacity: 0.8,
  },
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  vsContainer: {
    paddingHorizontal: 12,
  },
  vs: {
    fontSize: 14,
    opacity: 0.6,
  },
  playerNames: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  ballGroup: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ballGroupText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  noActiveGame: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    padding: 24,
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillRating: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});