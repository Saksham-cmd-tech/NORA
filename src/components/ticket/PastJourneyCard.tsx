import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { NormalizedTicket } from '../../types/ticket';
import { AppText } from '../common/AppText';
import { StatusBadge } from '../common/StatusBadge';

interface PastJourneyCardProps {
  ticket: NormalizedTicket;
  onPress?: () => void;
}

export const PastJourneyCard: React.FC<PastJourneyCardProps> = ({
  ticket,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.leftCol}>
        <AppText variant="body" weight="bold" color="primary">
          {`${ticket.journey.fromName?.split(' ')[0] || ticket.journey.from} → ${ticket.journey.toName?.split(' ')[0] || ticket.journey.to}`}
        </AppText>
        <AppText variant="tiny" color="secondary" style={styles.trainText}>
          {`${ticket.train.number} ${ticket.train.name}`}
        </AppText>
      </View>

      <View style={styles.rightCol}>
        <StatusBadge label="COMPLETED" variant="dark" />
        <AppText variant="tiny" color="muted" style={styles.dateText}>
          {ticket.journey.date.split(' ').slice(0, 2).join(' ')}
        </AppText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leftCol: {
    flex: 1,
  },
  trainText: {
    marginTop: 4,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  dateText: {
    marginTop: 4,
  },
});
