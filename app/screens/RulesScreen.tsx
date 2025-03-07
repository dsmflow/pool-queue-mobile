import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal,
  SafeAreaView
} from 'react-native';

type RuleSet = {
  id: string;
  name: string;
  description: string;
  rules: string[];
};

export const RulesScreen: React.FC = () => {
  const [selectedRuleSet, setSelectedRuleSet] = useState<RuleSet | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const ruleSets: RuleSet[] = [
    {
      id: 'bca',
      name: 'BCA Rules',
      description: 'Billiard Congress of America - Official rules for professional play',
      rules: [
        '1. PLAYERS MUST LAG FOR BREAK. The winner of the lag has the option to break or to require their opponent to break.',
        '2. THE RACK. The balls are racked in a triangle with the 8-ball in the center, the first ball of the rack on the foot spot, a stripe in one corner of the rack and a solid in the other corner.',
        '3. LEGAL BREAK SHOT. On the break shot, the breaker must either pocket a ball or drive at least four balls to the rail.',
        '4. BALL POCKETED ON THE BREAK. If a player pockets a ball on a legal break, they continue their turn. The table remains open until a player legally pockets a called ball.',
        '5. OPEN TABLE. When the table is open, a player may hit either a stripe or a solid first to pocket a ball. The table is open after the break and remains open until a player legally pockets a called ball.',
        '6. CONTINUING PLAY. A player must hit one of their balls first and either pocket a ball or cause any ball to hit a rail.',
        '7. SHOTS MUST BE CALLED. A player must call the ball and the pocket. Details of the shot, such as cushions or kisses, need not be called.',
        '8. COMBINATION SHOTS. Combination shots are allowed, but the first ball hit must be of the shooter\'s group.',
        '9. BALLS JUMPED OFF THE TABLE. Jumped balls are considered fouls. Any jumped object ball is spotted, and any jumped cue ball is ball in hand for the opponent.',
        '10. GAME WINNING SHOT. On the shot that pockets the 8-ball, the shooter must clearly call the ball and pocket. If the shooter fouls on this shot, they lose the game.'
      ]
    },
    {
      id: 'apa',
      name: 'APA Rules',
      description: 'American Poolplayers Association - Handicapped league rules',
      rules: [
        '1. GENERAL DESCRIPTION. 8-Ball is played with a cue ball and 15 numbered object balls. The shooter\'s group of seven balls (1-7 or 9-15) must all be pocketed before attempting to pocket the 8-ball to win.',
        '2. THE BREAK. The break is determined by lag or coin toss. The winner of the lag or toss has the option to break or to require their opponent to break.',
        '3. 8-BALL POCKETED ON THE BREAK. If the 8-ball is pocketed on the break, the breaker may ask for a re-rack or have the 8-ball spotted and continue shooting.',
        '4. OPEN TABLE. The table is open after the break. When the table is open, a player may hit either a stripe or a solid first to pocket a ball.',
        '5. CHOICE OF GROUP. The choice of stripes or solids is not determined on the break, even if balls are pocketed. The table remains open until a player legally pockets a called ball after the break.',
        '6. LEGAL SHOT. On all shots, the shooter must hit one of their group\'s balls first and then: (1) pocket the called ball, or (2) cause the cue ball or any object ball to contact a rail.',
        '7. COMBINATION SHOTS. Combination shots are allowed, but the first ball hit must be of the shooter\'s group.',
        '8. BALLS JUMPED OFF THE TABLE. Jumped balls are considered fouls. Any jumped object ball is spotted, and any jumped cue ball is ball in hand for the opponent.',
        '9. PLAYING THE 8-BALL. When shooting at the 8-ball, a player must first call the pocket. If the shooter pockets the 8-ball in the called pocket, they win the game.',
        '10. LOSS OF GAME. A player loses the game if they: (a) pocket the 8-ball before clearing their group, (b) pocket the 8-ball in a pocket other than the one called, or (c) commit a foul while pocketing the 8-ball.'
      ]
    },
    {
      id: 'usapl',
      name: 'USAPL Rules',
      description: 'USA Pool League - Competitive league rules',
      rules: [
        '1. OBJECT OF THE GAME. 8-Ball is played with a cue ball and 15 numbered balls. One player must pocket balls 1-7 (solids), while the other player pockets 9-15 (stripes). The player pocketing their group first and then legally pocketing the 8-ball wins the game.',
        '2. RACKING THE BALLS. The balls are racked in a triangle with the 8-ball in the center, the first ball on the foot spot, a stripe in one corner, and a solid in the other corner.',
        '3. BREAK SHOT. The break is determined by lag. The winner of the lag has the option to break or to require their opponent to break.',
        '4. LEGAL BREAK SHOT. The breaker must either pocket a ball or drive at least four balls to the rail.',
        '5. DETERMINING GROUPS. The table is always open immediately after the break shot. The player\'s group (stripes or solids) is determined when a player legally pockets a called ball after the break.',
        '6. LEGAL SHOT. On all shots, the shooter must hit one of their group\'s balls first and then: (1) pocket a ball from their group, or (2) cause the cue ball or any object ball to contact a rail.',
        '7. SAFETY PLAY. For tactical reasons, a player may choose to pocket an obvious ball and also discontinue their turn at the table by declaring "safety" in advance.',
        '8. SCORING. A player is entitled to continue shooting until they fail to legally pocket a ball of their group. After a player has pocketed all of their group of balls, they shoot to pocket the 8-ball.',
        '9. FOULS. If a player commits a foul, their turn is over, and the incoming player gets ball in hand anywhere on the table.',
        '10. LOSS OF GAME. A player loses the game if they: (a) foul when pocketing the 8-ball, (b) pocket the 8-ball when it is not legal to do so, or (c) pocket the 8-ball in a pocket other than the one designated.'
      ]
    },
    {
      id: 'barroom',
      name: 'Bar Rules',
      description: 'Common casual rules found in bars and pubs',
      rules: [
        '1. COIN TOSS OR WINNER STAYS. In most bar settings, a coin toss determines who breaks first, or the winner of the previous game breaks.',
        '2. RACKING. The 8-ball must be in the center of the rack, with a solid in one corner and a stripe in the other corner.',
        '3. SELECTION AFTER BREAK. If a player pockets a ball on the break, they may choose to be solids or stripes, regardless of what type of ball was pocketed. If a stripe is pocketed, they can still elect to take solids but must make a solid on their follow-up shot.',
        '4. POST-BREAK PLAY. After the break, the table is open. The player must make an intentional, called shot to continue their turn.',
        '5. CALLED SHOTS. In some bar rules, players must call their shots (ball and pocket). In others, only the 8-ball shot needs to be called.',
        '6. CAROM SHOTS. Any carom shots (where the cue ball hits multiple balls) must be called, including the intended ball and pocket.',
        '7. SCRATCH ON THE BREAK. If a player scratches on the break, the incoming player has ball-in-hand behind the head string only.',
        '8. FOULS. Common fouls include: (a) cue ball scratch, (b) hitting the opponent\'s balls first, (c) failure to hit any ball with the cue ball, or (d) no ball hits a rail after contact.',
        '9. BALL-IN-HAND PENALTIES. After a foul, the incoming player typically gets ball-in-hand behind the head string only, not anywhere on the table.',
        '10. WINNING THE GAME. A player wins by legally pocketing all their assigned balls and then the 8-ball. Scratching while shooting the 8-ball is a loss.'
      ]
    }
  ];
  
  const openRuleSet = (ruleSet: RuleSet) => {
    setSelectedRuleSet(ruleSet);
    setModalVisible(true);
  };
  
  const closeModal = () => {
    setModalVisible(false);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Pool Game Rules</Text>
      <Text style={styles.subheader}>Select a ruleset to view detailed rules</Text>
      
      <ScrollView contentContainerStyle={styles.ruleSetContainer}>
        {ruleSets.map((ruleSet) => (
          <TouchableOpacity
            key={ruleSet.id}
            style={styles.ruleSetCard}
            onPress={() => openRuleSet(ruleSet)}
          >
            <Text style={styles.ruleSetName}>{ruleSet.name}</Text>
            <Text style={styles.ruleSetDescription}>{ruleSet.description}</Text>
            <Text style={styles.viewRulesText}>View Rules →</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRuleSet?.name}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>{selectedRuleSet?.description}</Text>
            
            <ScrollView style={styles.rulesScrollView}>
              {selectedRuleSet?.rules.map((rule, index) => (
                <View key={index} style={styles.ruleItem}>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity style={styles.closeModalButton} onPress={closeModal}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subheader: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  ruleSetContainer: {
    paddingBottom: 16,
  },
  ruleSetCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ruleSetName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  ruleSetDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  viewRulesText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3498db',
    alignSelf: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  rulesScrollView: {
    maxHeight: '70%',
  },
  ruleItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  ruleText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  closeModalButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
