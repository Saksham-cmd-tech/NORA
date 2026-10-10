import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Share2, Calendar } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { NormalizedTicket } from '../../types/ticket';
import { getTrainName } from '../../utils/stationLookup';
import { AppText } from '../common/AppText';
import { StatusBadge } from '../common/StatusBadge';
import { AppButton } from '../common/AppButton';
import { StationRoute } from './StationRoute';

interface TicketCardProps {
  ticket: NormalizedTicket;
  onPress?: () => void;
  onShare?: () => void;
  onAddToCalendar?: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onPress,
  onShare,
  onAddToCalendar,
}) => {
  const resolvedTrainName =
    ticket.train.name && !/^\d+$/.test(ticket.train.name.trim()) && ticket.train.name.trim() !== ticket.train.number
      ? ticket.train.name
      : getTrainName(ticket.train.number) || ticket.train.type || 'EXPRESS';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={styles.card}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerPillLeft}>
          <StatusBadge
            label={resolvedTrainName.toUpperCase()}
            variant="dark"
          />
        </View>
        <StatusBadge
          label={`TRAIN ${ticket.train.number}`}
          variant="orange"
        />
      </View>

      {/* Main Station Route */}
      <StationRoute
        fromCode={ticket.journey.from}
        fromName={ticket.journey.fromName}
        departureTime={ticket.journey.departure}
        toCode={ticket.journey.to}
        toName={ticket.journey.toName}
        arrivalTime={ticket.journey.arrival}
        duration={ticket.journey.duration}
      />

      {/* Perforated Divider Line with Notches */}
      <View style={styles.perforationContainer}>
        <View style={styles.notchLeft} />
        <View style={styles.dashedLine} />
        <View style={styles.notchRight} />
      </View>

      {/* Journey Detail Grid (Genuine SMS Data) */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCol}>
          <AppText variant="micro" uppercase color="muted" weight="bold">
            TRAVEL DATE
          </AppText>
          <AppText variant="body" weight="bold" color="primary" style={styles.valueSpacing} numberOfLines={1}>
            {ticket.journey.date}
          </AppText>
        </View>

        <View style={[styles.infoCol, styles.infoColCenter]}>
          <AppText variant="micro" uppercase color="muted" weight="bold">
            CLASS / COACH
          </AppText>
          <AppText variant="body" weight="bold" color="orange" style={styles.valueSpacing} numberOfLines={1}>
            {ticket.passenger.coach
              ? `${ticket.passenger.class || 'CC'} · ${ticket.passenger.coach}`
              : (ticket.passenger.class || 'CC')}
          </AppText>
        </View>

        <View style={[styles.infoCol, styles.infoColRight]}>
          <AppText variant="micro" uppercase color="muted" weight="bold">
            SEAT
          </AppText>
          <AppText variant="body" weight="bold" color="primary" style={styles.valueSpacing} numberOfLines={1}>
            {ticket.passenger.seat ? `${ticket.passenger.seat}` : 'CONFIRMED'}
          </AppText>
        </View>
      </View>

      {/* Card Action Buttons */}
      <View style={styles.actionsRow}>
        <View style={styles.actionBtnWrapper}>
          <AppButton
            title="SHARE PASS"
            variant="actionPill"
            icon={<Share2 size={13} color={Colors.textSecondary} />}
            onPress={onShare}
          />
        </View>
        <View style={styles.actionBtnSpacing} />
        <View style={styles.actionBtnWrapper}>
          <AppButton
            title="ADD TO CALENDAR"
            variant="actionPill"
            icon={<Calendar size={13} color={Colors.textSecondary} />}
            onPress={onAddToCalendar}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadiusLg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerPillLeft: {
    flexShrink: 1,
    marginRight: 8,
  },
  perforationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    position: 'relative',
    marginHorizontal: -Spacing.lg,
  },
  notchLeft: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.background,
    marginLeft: -7,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderStyle: 'dashed',
    marginHorizontal: 4,
  },
  notchRight: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.background,
    marginRight: -7,
  },
  infoGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  infoColCenter: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  infoColRight: {
    alignItems: 'flex-end',
  },
  valueSpacing: {
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  actionBtnWrapper: {
    flex: 1,
  },
  actionBtnSpacing: {
    width: 10,
  },
});
