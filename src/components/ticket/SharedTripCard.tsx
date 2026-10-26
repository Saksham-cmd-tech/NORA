import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Radio, ChevronRight } from 'lucide-react-native';
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
}) => {
  const [liveData, setLiveData] = useState<LiveTrainData | null>(null);
  const [loading, setLoading] = useState(true);

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
        {/* Line 1: Train Name & Train Number */}
        <View style={styles.trainHeaderRow}>
          <AppText
            variant="body"
            weight="heavy"
            color="primary"
            numberOfLines={1}
            style={styles.trainNameText}
          >
            {resolvedTrainName}
          </AppText>
          <AppText
            variant="body"
            weight="bold"
            color="secondary"
            style={styles.trainNumberText}
          >
            {ticket.train.number}
          </AppText>
        </View>

        {/* Line 2: Origin, Connecting Line, and Destination */}
        <View style={styles.routeRow}>
          <View style={styles.stationBlockLeft}>
            <AppText variant="title" weight="heavy" color="primary" style={styles.stationCode}>
              {ticket.journey.from}
            </AppText>
            <AppText variant="caption" weight="bold" color="orange" style={styles.timeText}>
              {ticket.journey.departure || '--:--'}
            </AppText>
          </View>

          <View style={styles.routeCenterLineCol}>
            <View style={styles.trackLine} />
          </View>

          <View style={styles.stationBlockRight}>
            <AppText variant="title" weight="heavy" color="primary" style={styles.stationCode}>
              {ticket.journey.to}
            </AppText>
            <AppText variant="caption" weight="bold" color="primary" style={styles.timeText}>
              {ticket.journey.arrival || '--:--'}
            </AppText>
          </View>
        </View>

        {/* Line 3: Date | Live status | Shared (or Berth) */}
        <View style={styles.dataRow}>
          <View style={styles.dataColLeft}>
            <AppText variant="caption" weight="medium" color="secondary" numberOfLines={1}>
              {ticket.journey.date}
            </AppText>
          </View>

          <View style={styles.dataColCenter}>
            <View style={styles.statusRow}>
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
                variant="caption"
                weight="bold"
                color={isDelayed ? 'orange' : isRunning ? 'success' : 'secondary'}
                numberOfLines={1}
              >
                {isDelayed ? `${delayMinutes}m Late` : isRunning ? 'On Time' : 'Scheduled'}
              </AppText>
            </View>
          </View>

          <View style={styles.dataColRight}>
            <AppText variant="caption" weight="bold" color="orange" numberOfLines={1}>
              {hasSpecificSeat
                ? `${ticket.passenger.coach} · ${ticket.passenger.seat}`
                : 'Shared'}
            </AppText>
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
          <Radio size={12} color={Colors.primary} style={{ marginRight: 6 }} />
          <AppText variant="caption" weight="bold" color="primary" numberOfLines={1}>
            {nextHalt
              ? `Next: ${nextHaltName}${nextHaltPlatform}`
              : isRunning
              ? 'Train en route · Realtime tracking active'
              : isCompleted
              ? 'Journey completed at destination'
              : `Departs from ${ticket.journey.from}`}
          </AppText>
        </View>

        <View style={styles.stubRight}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : nextHalt?.arrivalTime ? (
            <AppText variant="tiny" weight="bold" color="orange">
              {`ETA ${formatHaltTime(nextHalt.arrivalTime)}`}
            </AppText>
          ) : (
            <ChevronRight size={14} color={Colors.textSecondary} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  upperSection: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
  },
  trainHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  trainNameText: {
    flex: 1,
    fontSize: 16,
    marginRight: 10,
  },
  trainNumberText: {
    fontSize: 15,
    letterSpacing: 0.5,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  stationBlockLeft: {
    alignItems: 'flex-start',
    minWidth: 70,
  },
  stationBlockRight: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  stationCode: {
    fontSize: 24,
    letterSpacing: 0.5,
  },
  timeText: {
    marginTop: 2,
  },
  routeCenterLineCol: {
    flex: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 4,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  perforationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 4,
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
    paddingVertical: 11,
  },
  stubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  stubRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
