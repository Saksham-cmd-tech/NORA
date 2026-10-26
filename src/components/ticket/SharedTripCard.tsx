import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Radio, ChevronRight, ShieldCheck, ArrowRight, Clock } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { NormalizedTicket } from '../../types/ticket';
import { getTrainName, getStationName } from '../../utils/stationLookup';
import { getLiveTrainStatus, LiveTrainData, formatHaltTime } from '../../services/railService';
import { isEarlyJourney } from '../../utils/dateUtils';
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
}) => {
  const [liveData, setLiveData] = useState<LiveTrainData | null>(null);
  const [loading, setLoading] = useState(true);

  const resolvedTrainName =
    ticket.train.name &&
    !/^\d+$/.test(ticket.train.name.trim()) &&
    ticket.train.name.trim() !== ticket.train.number
      ? ticket.train.name
      : getTrainName(ticket.train.number) || ticket.train.type || 'EXPRESS';

  const fromStationName = ticket.journey.fromName || getStationName(ticket.journey.from);
  const toStationName = ticket.journey.toName || getStationName(ticket.journey.to);

  const isEarly = isEarlyJourney(ticket.journey.date, ticket.journey.departure);

  useEffect(() => {
    // If date is not of today and departure time is greater than 1 hour away,
    // do NOT query radar / live train status on the main screen!
    if (isEarly) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    getLiveTrainStatus(ticket.train.number, true)
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
  }, [ticket.train.number, isEarly]);

  const delayMinutes = liveData?.delayMinutes ?? 0;
  const isDelayed = delayMinutes > 5;
  const isRunning = liveData?.status === 'running';
  const isCompleted = liveData?.status === 'completed';

  const nextHalt = liveData?.nextHalt;
  const nextHaltName = nextHalt?.stationName || nextHalt?.stationCode;
  const nextHaltPlatform = nextHalt?.platform ? ` · PF ${nextHalt.platform}` : '';

  const hasSpecificSeat = Boolean(ticket.passenger?.coach && ticket.passenger?.seat);

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
      {/* ================= UPPER SECTION ================= */}
      <View style={styles.upperSection}>
        {/* Line 1: Train Name & Train Number with Badges */}
        <View style={styles.trainHeaderRow}>
          <View style={styles.trainNameContainer}>
            <View style={styles.sharedBadge}>
              <Radio size={10} color={Colors.primary} />
              <AppText variant="micro" weight="heavy" color="primary" style={styles.sharedBadgeText}>
                SHARED
              </AppText>
            </View>
            <AppText
              variant="subheading"
              weight="heavy"
              color="primary"
              numberOfLines={1}
              style={styles.trainNameText}
            >
              {resolvedTrainName}
            </AppText>
          </View>

          <View style={styles.trainNumberBadge}>
            <AppText
              variant="caption"
              weight="heavy"
              color="primary"
              style={styles.trainNumberText}
            >
              {ticket.train.number}
            </AppText>
          </View>
        </View>

        {/* Line 2: Origin, Minimalist Connecting Track, and Destination */}
        <View style={styles.routeRow}>
          <View style={styles.stationBlockLeft}>
            <AppText variant="title" weight="heavy" color="primary" style={styles.stationCode}>
              {ticket.journey.from}
            </AppText>
            <AppText variant="caption" weight="heavy" color="primary" style={styles.timeText}>
              {ticket.journey.departure || '--:--'}
            </AppText>
            {fromStationName ? (
              <AppText variant="micro" weight="medium" color="secondary" numberOfLines={1} style={styles.stationSubName}>
                {fromStationName}
              </AppText>
            ) : null}
          </View>

          <View style={styles.routeCenterLineCol}>
            <View style={styles.trackLineSegment} />
            <View style={styles.trackCenterPill}>
              <ArrowRight size={12} color={Colors.appleTertiaryLabel} />
            </View>
            <View style={styles.trackLineSegment} />
          </View>

          <View style={styles.stationBlockRight}>
            <AppText variant="title" weight="heavy" color="primary" style={styles.stationCode}>
              {ticket.journey.to}
            </AppText>
            <AppText variant="caption" weight="heavy" color="primary" style={styles.timeText}>
              {ticket.journey.arrival || '--:--'}
            </AppText>
            {toStationName ? (
              <AppText variant="micro" weight="medium" color="secondary" numberOfLines={1} style={styles.stationSubName}>
                {toStationName}
              </AppText>
            ) : null}
          </View>
        </View>

        {/* Line 3: Date | Live status | Shared (or Berth) */}
        <View style={styles.dataRow}>
          {/* Column 1: Date */}
          <View style={styles.dataColLeft}>
            <AppText variant="micro" uppercase color="secondary" weight="bold" letterSpacing={0.8} style={styles.dataLabel}>
              DATE
            </AppText>
            <AppText variant="caption" weight="bold" color="primary" numberOfLines={1} style={styles.dataValue}>
              {ticket.journey.date}
            </AppText>
          </View>

          {/* Column 2: Live status capsule */}
          <View style={styles.dataColCenter}>
            <AppText variant="micro" uppercase color="secondary" weight="bold" letterSpacing={0.8} style={styles.dataLabel}>
              STATUS
            </AppText>
            <View
              style={[
                styles.statusCapsule,
                isEarly
                  ? styles.statusCapsuleNeutral
                  : isDelayed
                  ? styles.statusCapsuleDelayed
                  : isRunning
                  ? styles.statusCapsuleGreen
                  : styles.statusCapsuleNeutral,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isEarly
                    ? styles.statusDotNeutral
                    : isDelayed
                    ? styles.statusDotDelayed
                    : isRunning
                    ? styles.statusDotGreen
                    : styles.statusDotNeutral,
                ]}
              />
              <AppText
                variant="micro"
                weight="heavy"
                color={!isEarly && isRunning ? 'success' : 'primary'}
                numberOfLines={1}
              >
                {isEarly ? 'Scheduled' : isDelayed ? `${delayMinutes}m Late` : isRunning ? 'On Time' : 'Scheduled'}
              </AppText>
            </View>
          </View>

          {/* Column 3: Seat or Shared status */}
          <View style={styles.dataColRight}>
            <AppText variant="micro" uppercase color="secondary" weight="bold" letterSpacing={0.8} style={styles.dataLabel}>
              BERTH
            </AppText>
            {hasSpecificSeat ? (
              <View style={styles.seatCapsule}>
                <AppText variant="caption" weight="heavy" color="primary" numberOfLines={1}>
                  {`${ticket.passenger.coach} · ${ticket.passenger.seat}`}
                </AppText>
              </View>
            ) : (
              <View style={styles.sharedCapsule}>
                <ShieldCheck size={10} color={Colors.appleTertiaryLabel} style={{ marginRight: 3 }} />
                <AppText variant="micro" weight="bold" color="secondary" numberOfLines={1}>
                  Shared
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ================= PERFORATION NOTCHES & LINE ================= */}
      <View style={styles.perforationContainer}>
        <View style={styles.notchLeft} />
        <View style={styles.dashedLine} />
        <View style={styles.notchRight} />
      </View>

      {/* ================= LOWER SECTION (STUB) ================= */}
      <View style={styles.bottomStub}>
        <View style={styles.stubLeft}>
          <View style={styles.radioIconCircle}>
            {isEarly ? (
              <Clock size={12} color={Colors.appleSecondaryLabel} />
            ) : (
              <Radio size={12} color={Colors.primary} />
            )}
          </View>
          <AppText
            variant="caption"
            weight="bold"
            color="primary"
            numberOfLines={1}
            style={styles.stubText}
          >
            {isEarly
              ? `Departs from ${fromStationName || ticket.journey.from}`
              : nextHalt
              ? `Next: ${nextHaltName}${nextHaltPlatform}`
              : isRunning
              ? 'Train en route · Realtime tracking active'
              : isCompleted
              ? 'Journey completed at destination'
              : `Departs from ${fromStationName || ticket.journey.from}`}
          </AppText>
        </View>

        <View style={styles.stubRight}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : !isEarly && nextHalt?.arrivalTime ? (
            <View style={styles.etaBadge}>
              <AppText variant="micro" weight="heavy" color="primary">
                {`ETA ${formatHaltTime(nextHalt.arrivalTime)}`}
              </AppText>
              <ChevronRight size={12} color={Colors.appleTertiaryLabel} style={{ marginLeft: 2 }} />
            </View>
          ) : !isEarly ? (
            <View style={styles.openRadarPill}>
              <AppText variant="micro" weight="bold" color="secondary" style={{ marginRight: 2 }}>
                Radar
              </AppText>
              <ChevronRight size={12} color={Colors.appleTertiaryLabel} />
            </View>
          ) : (
            <View style={styles.openRadarPill}>
              <AppText variant="micro" weight="bold" color="secondary" style={{ marginRight: 2 }}>
                Pass
              </AppText>
              <ChevronRight size={12} color={Colors.appleTertiaryLabel} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  upperSection: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  trainHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trainNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 51, 44, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 51, 44, 0.25)',
    marginRight: 8,
  },
  sharedBadgeText: {
    marginLeft: 3,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  trainNameText: {
    flex: 1,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  trainNumberBadge: {
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  trainNumberText: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  stationBlockLeft: {
    alignItems: 'flex-start',
    minWidth: 76,
  },
  stationBlockRight: {
    alignItems: 'flex-end',
    minWidth: 76,
  },
  stationCode: {
    fontSize: 26,
    letterSpacing: 0.5,
    lineHeight: 30,
  },
  timeText: {
    marginTop: 2,
    fontSize: 13,
  },
  stationSubName: {
    marginTop: 2,
    maxWidth: 90,
    fontSize: 10,
  },
  routeCenterLineCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  trackLineSegment: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  trackCenterPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.appleSecondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginHorizontal: 4,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  dataColLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  dataColCenter: {
    flex: 1.2,
    alignItems: 'center',
  },
  dataColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dataLabel: {
    fontSize: 9,
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 13,
  },
  statusCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusCapsuleGreen: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  statusCapsuleDelayed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  statusCapsuleNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  statusDotGreen: {
    backgroundColor: Colors.appleGreen,
  },
  statusDotDelayed: {
    backgroundColor: '#FF453A',
  },
  statusDotNeutral: {
    backgroundColor: Colors.appleSecondaryLabel,
  },
  seatCapsule: {
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  sharedCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  perforationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 0,
    backgroundColor: Colors.appleGroupedBg,
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
  bottomStub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  radioIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(245, 51, 44, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stubText: {
    flex: 1,
    fontSize: 12,
  },
  stubRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  openRadarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
