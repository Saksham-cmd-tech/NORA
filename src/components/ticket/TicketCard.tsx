import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Share2, Calendar } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { NormalizedTicket } from '../../types/ticket';
import { getTrainName } from '../../utils/stationLookup';
import { AppText } from '../common/AppText';
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
    ticket.train.name &&
    !/^\d+$/.test(ticket.train.name.trim()) &&
    ticket.train.name.trim() !== ticket.train.number
      ? ticket.train.name
      : getTrainName(ticket.train.number) || ticket.train.type || 'EXPRESS';

  const isConfirmed = ticket.status === 'CONFIRMED' || !ticket.status;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={styles.card}
    >
      {/* Top Header Row: Apple Wallet style transit header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <AppText
            variant="micro"
            weight="bold"
            color="secondary"
            uppercase
            letterSpacing={0.8}
            numberOfLines={1}
            style={styles.trainNameLabel}
          >
            {resolvedTrainName}
          </AppText>
          <View style={styles.trainBadge}>
            <AppText variant="micro" weight="bold" color="primary">
              {`TRAIN ${ticket.train.number}`}
            </AppText>
          </View>
        </View>

        <View style={[styles.statusPill, isConfirmed ? styles.statusPillGreen : styles.statusPillOrange]}>
          <View style={[styles.statusDot, isConfirmed ? styles.statusDotGreen : styles.statusDotOrange]} />
          <AppText
            variant="micro"
            weight="bold"
            color={isConfirmed ? 'success' : 'orange'}
            uppercase
            letterSpacing={0.6}
          >
            {ticket.status || 'CONFIRMED'}
          </AppText>
        </View>
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

      {/* Perforated Divider Line with Circular Cutout Notches */}
      <View style={styles.perforationContainer}>
        <View style={styles.notchLeft} />
        <View style={styles.dashedLine} />
        <View style={styles.notchRight} />
      </View>

      {/* Journey Detail Grid (Apple Wallet transit data layout) */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCol}>
          <AppText variant="micro" uppercase color="secondary" weight="medium" letterSpacing={0.6}>
            TRAVEL DATE
          </AppText>
          <AppText variant="body" weight="bold" color="primary" style={styles.valueSpacing} numberOfLines={1}>
            {ticket.journey.date}
          </AppText>
        </View>

        <View style={[styles.infoCol, styles.infoColCenter]}>
          <AppText variant="micro" uppercase color="secondary" weight="medium" letterSpacing={0.6}>
            CLASS / COACH
          </AppText>
          <AppText variant="body" weight="bold" color="orange" style={styles.valueSpacing} numberOfLines={1}>
            {ticket.passenger.coach
              ? `${ticket.passenger.class || 'CC'} · ${ticket.passenger.coach}`
              : (ticket.passenger.class || 'CC')}
          </AppText>
        </View>

        <View style={[styles.infoCol, styles.infoColRight]}>
          <AppText variant="micro" uppercase color="secondary" weight="medium" letterSpacing={0.6}>
            SEAT
          </AppText>
          <AppText variant="body" weight="bold" color="primary" style={styles.valueSpacing} numberOfLines={1}>
            {ticket.passenger.seat && ticket.passenger.seat !== 'CONFIRMED'
              ? `${ticket.passenger.seat}`
              : 'CNF'}
          </AppText>
        </View>
      </View>

      {/* Card Action Buttons (Apple secondary pill actions) */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onShare}
          style={styles.actionBtn}
        >
          <Share2 size={13} color={Colors.appleSecondaryLabel} style={{ marginRight: 6 }} />
          <AppText variant="caption" weight="medium" color="primary">
            Share Pass
          </AppText>
        </TouchableOpacity>

        <View style={styles.actionBtnSpacing} />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onAddToCalendar}
          style={styles.actionBtn}
        >
          <Calendar size={13} color={Colors.appleSecondaryLabel} style={{ marginRight: 6 }} />
          <AppText variant="caption" weight="medium" color="primary">
            Add to Calendar
          </AppText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  trainNameLabel: {
    flexShrink: 1,
    marginRight: 8,
  },
  trainBadge: {
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillGreen: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
  },
  statusPillOrange: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusDotGreen: {
    backgroundColor: Colors.appleGreen,
  },
  statusDotOrange: {
    backgroundColor: Colors.appleOrange,
  },
  perforationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    position: 'relative',
    marginHorizontal: -18,
  },
  notchLeft: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.background,
    marginLeft: -8,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    borderStyle: 'dashed',
    marginHorizontal: 4,
  },
  notchRight: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.background,
    marginRight: -8,
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
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  actionBtnSpacing: {
    width: 10,
  },
});
