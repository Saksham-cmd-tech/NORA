import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Radio,
  Share2,
  MapPin,
  ShieldCheck,
  User,
  Trash2,
  Clock,
  ArrowRight,
  ChevronRight,
} from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { NormalizedTicket } from '../../types/ticket';
import { getTrainName } from '../../utils/stationLookup';
import { getLiveTrainStatus, LiveTrainData, formatHaltTime } from '../../services/railService';
import { AppText } from '../common/AppText';

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
  const [loading, setLoading] = useState<boolean>(true);

  const resolvedTrainName =
    ticket.train.name &&
    !/^\d+$/.test(ticket.train.name.trim()) &&
    ticket.train.name.trim() !== ticket.train.number
      ? ticket.train.name
      : getTrainName(ticket.train.number) || ticket.train.type || 'SUPERFAST EXPRESS';

  useEffect(() => {
    let isMounted = true;
    getLiveTrainStatus(ticket.train.number)
      .then((data) => {
        if (isMounted) {
          if (data) setLiveData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [ticket.train.number]);

  const delayMinutes = liveData?.delayMinutes ?? 0;
  const isDelayed = delayMinutes > 5;
  const isRunning = liveData?.status === 'running';
  const isCompleted = liveData?.status === 'completed';

  const statusLabel = loading
    ? 'SYNCING...'
    : isDelayed
    ? `DELAYED ${delayMinutes}M`
    : isRunning
    ? 'RUNNING ON TIME'
    : isCompleted
    ? 'ARRIVED'
    : 'SCHEDULED';

  const statusColor = isDelayed
    ? Colors.appleOrange
    : isRunning
    ? Colors.appleGreen
    : isCompleted
    ? Colors.appleTeal
    : Colors.appleSecondaryLabel;

  const statusBg = isDelayed
    ? 'rgba(255, 159, 10, 0.15)'
    : isRunning
    ? 'rgba(48, 209, 88, 0.15)'
    : isCompleted
    ? 'rgba(100, 210, 255, 0.15)'
    : 'rgba(255, 255, 255, 0.08)';

  // Calculate journey route progress percentage if halts available
  let routeProgressPercent = 0;
  if (liveData?.route && liveData.route.length > 0) {
    const passedCount = liveData.route.filter(
      (h) => h.status === 'departed' || h.status === 'arrived'
    ).length;
    routeProgressPercent = Math.min(100, Math.round((passedCount / liveData.route.length) * 100));
  }

  // Location display info
  const nextHalt = liveData?.nextHalt;
  const nextHaltName = nextHalt?.stationName || nextHalt?.stationCode;
  const nextHaltPlatform = nextHalt?.platform ? ` · PF ${nextHalt.platform}` : '';
  const nextHaltEta = nextHalt?.arrivalTime ? ` · ETA ${formatHaltTime(nextHalt.arrivalTime)}` : '';

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
      {/* 1. TOP HEADER: Shared badge & Live delay telemetry */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.trackingBadge}>
            <View style={styles.pulsingDot} />
            <Radio size={11} color={Colors.appleTeal} style={{ marginRight: 4 }} />
            <AppText
              variant="micro"
              weight="bold"
              style={styles.trackingBadgeText}
            >
              SHARED TRIP
            </AppText>
          </View>

          <View style={styles.trainNumberBadge}>
            <AppText variant="micro" weight="bold" color="primary">
              {`#${ticket.train.number}`}
            </AppText>
          </View>
        </View>

        {/* Live Status Pill */}
        <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.appleTeal} style={{ marginRight: 4 }} />
          ) : (
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          )}
          <AppText
            variant="micro"
            weight="bold"
            letterSpacing={0.6}
            style={{ color: statusColor }}
          >
            {statusLabel}
          </AppText>
        </View>
      </View>

      {/* 2. TRAIN NAME */}
      <View style={styles.trainNameContainer}>
        <AppText
          variant="title"
          weight="heavy"
          color="white"
          numberOfLines={1}
          style={styles.trainNameText}
        >
          {resolvedTrainName}
        </AppText>
        <AppText variant="micro" color="secondary" weight="medium">
          {ticket.journey.date}
        </AppText>
      </View>

      {/* 3. ROUTE VIEW (Big Station Codes + Times) */}
      <View style={styles.routeContainer}>
        {/* Origin */}
        <View style={styles.stationColLeft}>
          <AppText variant="huge" weight="heavy" color="white" style={styles.stationCode}>
            {ticket.journey.from}
          </AppText>
          <AppText variant="tiny" color="secondary" numberOfLines={1} style={styles.stationName}>
            {ticket.journey.fromName || ticket.journey.from}
          </AppText>
          <View style={styles.timeRow}>
            <Clock size={11} color={Colors.appleTeal} style={{ marginRight: 4 }} />
            <AppText variant="body" weight="bold" style={styles.timeTextTeal}>
              {ticket.journey.departure || '--:--'}
            </AppText>
          </View>
        </View>

        {/* Route Track in Middle */}
        <View style={styles.routeTrackCenter}>
          <View style={styles.trackDurationPill}>
            <AppText variant="micro" weight="bold" color="secondary">
              {ticket.journey.duration || 'DIRECT'}
            </AppText>
          </View>
          <View style={styles.trackLineRow}>
            <View style={styles.trackDot} />
            <View style={styles.trackLine} />
            <View style={styles.trainIconBubble}>
              <Radio size={12} color={Colors.appleTeal} />
            </View>
            <View style={styles.trackLine} />
            <View style={styles.trackDot} />
          </View>
          <AppText variant="micro" color="muted" uppercase letterSpacing={0.8} style={{ marginTop: 2 }}>
            LIVE TRACK
          </AppText>
        </View>

        {/* Destination */}
        <View style={styles.stationColRight}>
          <AppText variant="huge" weight="heavy" color="white" style={styles.stationCode}>
            {ticket.journey.to}
          </AppText>
          <AppText variant="tiny" color="secondary" numberOfLines={1} style={styles.stationName}>
            {ticket.journey.toName || ticket.journey.to}
          </AppText>
          <View style={styles.timeRowRight}>
            <Clock size={11} color={Colors.textSecondary} style={{ marginRight: 4 }} />
            <AppText variant="body" weight="bold" color="primary">
              {ticket.journey.arrival || '--:--'}
            </AppText>
          </View>
        </View>
      </View>

      {/* 4. HERO INSET: REAL-TIME RADAR TELEMETRY CAPSULE */}
      <View style={styles.telemetryCapsule}>
        <View style={styles.telemetryHeader}>
          <View style={styles.telemetryTitleRow}>
            <MapPin size={13} color={Colors.appleTeal} style={{ marginRight: 5 }} />
            <AppText variant="micro" weight="bold" style={styles.telemetryTitleText}>
              {isRunning
                ? 'CURRENT JOURNEY STATUS'
                : isCompleted
                ? 'JOURNEY COMPLETED'
                : 'UPCOMING SCHEDULE'}
            </AppText>
          </View>
          <View style={styles.tapToViewRow}>
            <AppText variant="micro" weight="semibold" style={{ color: Colors.appleTeal }}>
              View Halts
            </AppText>
            <ChevronRight size={12} color={Colors.appleTeal} />
          </View>
        </View>

        <AppText variant="body" weight="bold" color="white" numberOfLines={1} style={styles.locationMainText}>
          {nextHalt
            ? `Next: ${nextHaltName}${nextHaltPlatform}`
            : liveData?.currentLocation?.stationName
            ? `Near ${liveData.currentLocation.stationName}`
            : `Boarding at ${ticket.journey.fromName || ticket.journey.from}`}
        </AppText>

        <AppText variant="tiny" color="secondary" numberOfLines={1} style={styles.locationSubText}>
          {nextHalt
            ? `${nextHaltEta ? nextHaltEta.replace(' · ', '') : 'Tracking realtime progress'}${
                isDelayed ? ` · Running ${delayMinutes}m behind schedule` : ' · Running on time'
              }`
            : `Scheduled journey · Track live updates when train departs`}
        </AppText>

        {/* Live Journey Progress Bar */}
        {isRunning && routeProgressPercent > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${routeProgressPercent}%` }]} />
            </View>
            <View style={styles.progressLabelRow}>
              <AppText variant="micro" color="secondary">
                Origin
              </AppText>
              <AppText variant="micro" weight="bold" style={{ color: Colors.appleTeal }}>
                {`${routeProgressPercent}% completed`}
              </AppText>
              <AppText variant="micro" color="secondary">
                Destination
              </AppText>
            </View>
          </View>
        )}
      </View>

      {/* 5. TRAVELER / BERTH DETAILS (PRIVACY CONSCIOUS) */}
      <View style={styles.travelerRow}>
        {hasSpecificSeat ? (
          <View style={styles.travelerInfo}>
            <User size={13} color={Colors.appleOrange} style={{ marginRight: 6 }} />
            <AppText variant="caption" weight="medium" color="secondary">
              Traveler:{' '}
              <AppText variant="caption" weight="bold" color="orange">
                {`Coach ${ticket.passenger.coach} · Seat ${ticket.passenger.seat}`}
              </AppText>
              {ticket.passenger.class ? ` (${ticket.passenger.class})` : ''}
            </AppText>
          </View>
        ) : (
          <View style={styles.travelerInfo}>
            <ShieldCheck size={13} color={Colors.appleGreen} style={{ marginRight: 6 }} />
            <AppText variant="caption" weight="medium" color="secondary">
              Coach & berth protected by traveler
            </AppText>
          </View>
        )}
      </View>

      {/* 6. CARD ACTION BUTTONS */}
      <View style={styles.actionsRow}>
        {/* Primary CTA: Track Live Radar */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onTrackLive || handleCardPress}
          style={styles.primaryActionBtn}
        >
          <Radio size={14} color={Colors.appleTeal} style={{ marginRight: 6 }} />
          <AppText variant="caption" weight="bold" style={styles.primaryActionBtnText}>
            Open Live Radar
          </AppText>
        </TouchableOpacity>

        {/* Secondary: Share Link */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onShare}
          style={styles.secondaryActionBtn}
        >
          <Share2 size={13} color={Colors.appleSecondaryLabel} />
        </TouchableOpacity>

        {/* Delete / Remove */}
        {onDelete && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDeletePress}
            style={styles.deleteActionBtn}
          >
            <Trash2 size={13} color={Colors.appleTertiaryLabel} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131821', // Dark elevated surface with navy radar tint
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(100, 210, 255, 0.32)', // Distinct Apple Teal glowing border
    marginVertical: 10,
    shadowColor: '#64D2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 210, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.28)',
    marginRight: 8,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.appleTeal,
    marginRight: 5,
  },
  trackingBadgeText: {
    color: Colors.appleTeal,
    letterSpacing: 0.8,
  },
  trainNumberBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  trainNameContainer: {
    marginBottom: 12,
  },
  trainNameText: {
    fontSize: 19,
    marginBottom: 2,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  stationColLeft: {
    flex: 1.1,
    alignItems: 'flex-start',
  },
  stationColRight: {
    flex: 1.1,
    alignItems: 'flex-end',
  },
  stationCode: {
    fontSize: 26,
    letterSpacing: 0.5,
  },
  stationName: {
    marginTop: 2,
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  timeTextTeal: {
    color: Colors.appleTeal,
  },
  routeTrackCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  trackDurationPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  trackLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  trackDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(100, 210, 255, 0.4)',
  },
  trackLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(100, 210, 255, 0.25)',
  },
  trainIconBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(100, 210, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  telemetryCapsule: {
    backgroundColor: 'rgba(5, 10, 16, 0.75)',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.18)',
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  telemetryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  telemetryTitleText: {
    color: Colors.appleTeal,
    letterSpacing: 0.6,
  },
  tapToViewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationMainText: {
    fontSize: 14,
    marginBottom: 3,
  },
  locationSubText: {
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.appleTeal,
    borderRadius: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  travelerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  travelerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(100, 210, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.4)',
    borderRadius: 12,
    paddingVertical: 9,
    marginRight: 8,
  },
  primaryActionBtnText: {
    color: Colors.appleTeal,
  },
  secondaryActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.appleSecondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginRight: 8,
  },
  deleteActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.25)',
  },
});
