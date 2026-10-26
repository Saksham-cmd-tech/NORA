import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Share2, Radio, Trash2 } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { NormalizedTicket } from '../../types/ticket';
import { getTrainName } from '../../utils/stationLookup';
import { getLiveTrainStatus, LiveTrainData, formatHaltTime } from '../../services/railService';
import { AppText } from '../common/AppText';
import { StationRoute } from './StationRoute';

interface SharedTripCardProps {
  ticket: NormalizedTicket;
  onPress?: () => void;
  onTrackLive?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

export const SharedTripCard: React.FC<SharedTripCardProps> = ({
  ticket,
  onPress,
  onTrackLive,
  onShare,
  onDelete,
}) => {
  const [liveData, setLiveData] = useState<LiveTrainData | null>(null);

  const resolvedTrainName =
    ticket.train.name &&
    !/^\d+$/.test(ticket.train.name.trim()) &&
    ticket.train.name.trim() !== ticket.train.number
      ? ticket.train.name
      : getTrainName(ticket.train.number) || ticket.train.type || 'EXPRESS';

  useEffect(() => {
    let isMounted = true;
    getLiveTrainStatus(ticket.train.number)
      .then((data) => {
        if (isMounted && data) {
          setLiveData(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [ticket.train.number]);

  const delayMinutes = liveData?.delayMinutes ?? 0;
  const isDelayed = delayMinutes > 5;
  const isRunning = liveData?.status === 'running';
  const isCompleted = liveData?.status === 'completed';

  const statusText = isDelayed
    ? `DELAYED ${delayMinutes}M`
    : isRunning
    ? 'ON TIME'
    : isCompleted
    ? 'ARRIVED'
    : 'SCHEDULED';

  const nextHalt = liveData?.nextHalt;
  const nextHaltName = nextHalt?.stationName || nextHalt?.stationCode;
  const nextHaltPlatform = nextHalt?.platform ? ` · PF ${nextHalt.platform}` : '';

  const hasSpecificSeat =
    Boolean(ticket.passenger?.coach && ticket.passenger?.seat) &&
    ticket.passenger.coach !== 'B1' &&
    ticket.passenger.seat !== '1';

  const handleDeletePress = () => {
    Alert.alert(
      'Remove Shared Trip',
      `Remove ${resolvedTrainName} (${ticket.train.number}) from your wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onDelete?.(),
        },
      ]
    );
  };

  const handleCardPress = () => {
    if (onTrackLive) {
      onTrackLive();
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={handleCardPress}
      style={styles.card}
    >
      {/* 1. Top Header Row: Apple Wallet style transit header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.trainBadge}>
            <AppText variant="micro" weight="bold" color="primary">
              {`TRAIN ${ticket.train.number}`}
            </AppText>
          </View>
          <View style={styles.sharedBadge}>
            <AppText variant="micro" weight="bold" color="orange">
              SHARED PASS
            </AppText>
          </View>
        </View>

        {/* Live Running Delay Status Pill */}
        <View
          style={[
            styles.statusPill,
            isDelayed
              ? styles.statusPillOrange
              : isRunning
              ? styles.statusPillGreen
              : styles.statusPillMuted,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isDelayed
                ? styles.statusDotOrange
                : isRunning
                ? styles.statusDotGreen
                : styles.statusDotMuted,
            ]}
          />
          <AppText
            variant="micro"
            weight="bold"
            color={isDelayed ? 'orange' : isRunning ? 'success' : 'secondary'}
            uppercase
            letterSpacing={0.6}
          >
            {statusText}
          </AppText>
        </View>
      </View>

      {/* Train Name Title */}
      <AppText
        variant="heading"
        weight="heavy"
        color="primary"
        numberOfLines={1}
        style={styles.trainNameTitle}
      >
        {resolvedTrainName}
      </AppText>

      {/* 2. Main Station Route */}
      <StationRoute
        fromCode={ticket.journey.from}
        fromName={ticket.journey.fromName}
        departureTime={ticket.journey.departure}
        toCode={ticket.journey.to}
        toName={ticket.journey.toName}
        arrivalTime={ticket.journey.arrival}
        duration={ticket.journey.duration}
      />

      {/* 3. Live Journey Telemetry Strip (Integrated into Ticket) */}
      <View style={styles.liveTelemetryStrip}>
        <View style={styles.liveTelemetryLeft}>
          <Radio size={12} color={Colors.primary} style={{ marginRight: 6 }} />
          <AppText variant="tiny" weight="semibold" color="primary" numberOfLines={1}>
            {nextHalt
              ? `Next: ${nextHaltName}${nextHaltPlatform}`
              : isRunning
              ? 'Train en route · Realtime tracking active'
              : isCompleted
              ? 'Journey completed at destination'
              : `Boarding from ${ticket.journey.fromName || ticket.journey.from}`}
          </AppText>
        </View>
        {nextHalt?.arrivalTime && (
          <AppText variant="tiny" weight="bold" color="orange" style={styles.etaText}>
            {`ETA ${formatHaltTime(nextHalt.arrivalTime)}`}
          </AppText>
        )}
      </View>

      {/* 4. Perforated Divider Line with Circular Cutout Notches */}
      <View style={styles.perforationContainer}>
        <View style={styles.notchLeft} />
        <View style={styles.dashedLine} />
        <View style={styles.notchRight} />
      </View>

      {/* 5. Journey Detail Grid (Apple Wallet transit data layout) */}
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
            LIVE STATUS
          </AppText>
          <AppText
            variant="body"
            weight="bold"
            color={isDelayed ? 'orange' : isRunning ? 'success' : 'primary'}
            style={styles.valueSpacing}
            numberOfLines={1}
          >
            {isDelayed ? `${delayMinutes}m Late` : isRunning ? 'On Time' : 'Scheduled'}
          </AppText>
        </View>

        <View style={[styles.infoCol, styles.infoColRight]}>
          <AppText variant="micro" uppercase color="secondary" weight="medium" letterSpacing={0.6}>
            BERTH / SEAT
          </AppText>
          <AppText variant="body" weight="bold" color="orange" style={styles.valueSpacing} numberOfLines={1}>
            {hasSpecificSeat
              ? `${ticket.passenger.coach || 'B1'} · ${ticket.passenger.seat || '1'}`
              : 'PROTECTED'}
          </AppText>
        </View>
      </View>

      {/* 6. Card Action Buttons (Apple secondary pill actions) */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onTrackLive || handleCardPress}
          style={styles.actionBtnPrimary}
        >
          <Radio size={13} color={Colors.primary} style={{ marginRight: 6 }} />
          <AppText variant="caption" weight="bold" color="orange">
            Track Live
          </AppText>
        </TouchableOpacity>

        <View style={styles.actionBtnSpacing} />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onShare}
          style={styles.actionBtn}
        >
          <Share2 size={13} color={Colors.appleSecondaryLabel} style={{ marginRight: 6 }} />
          <AppText variant="caption" weight="medium" color="primary">
            Share Link
          </AppText>
        </TouchableOpacity>

        {onDelete && (
          <>
            <View style={styles.actionBtnSpacing} />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDeletePress}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={14} color={Colors.appleTertiaryLabel} />
            </TouchableOpacity>
          </>
        )}
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
    flexWrap: 'nowrap',
  },
  trainNameTitle: {
    fontSize: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  trainBadge: {
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginRight: 6,
  },
  sharedBadge: {
    backgroundColor: 'rgba(245, 51, 44, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 51, 44, 0.28)',
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
  statusPillMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
  statusDotMuted: {
    backgroundColor: Colors.appleSecondaryLabel,
  },
  liveTelemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.appleSecondaryBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  liveTelemetryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  etaText: {
    flexShrink: 0,
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
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 51, 44, 0.12)',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 51, 44, 0.35)',
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
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.appleSecondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  actionBtnSpacing: {
    width: 8,
  },
});
