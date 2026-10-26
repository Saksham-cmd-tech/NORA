import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  Navigation,
  AlertCircle,
  Plus,
  Check,
  ShieldCheck,
  Calendar,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { NormalizedTicket } from '../types/ticket';
import { ticketRepository } from '../database/repositories/ticketRepository';
import { AppText } from '../components/common/AppText';
import {
  SharedTripData,
  convertSharedTripToTicket,
} from '../services/tripShareService';
import {
  getLiveTrainStatus,
  LiveTrainData,
  StationHalt,
  formatHaltTime,
} from '../services/railService';
import { getTrainName } from '../utils/stationLookup';

interface SharedJourneyScreenProps {
  sharedTrip: SharedTripData;
  onBack: () => void;
  onSaveToWallet?: (ticket: NormalizedTicket) => void;
  onViewInWallet?: (ticket: NormalizedTicket) => void;
}

export const SharedJourneyScreen: React.FC<SharedJourneyScreenProps> = ({
  sharedTrip,
  onBack,
  onSaveToWallet,
  onViewInWallet,
}) => {
  const [liveData, setLiveData] = useState<LiveTrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedTicket, setSavedTicket] = useState<NormalizedTicket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkIfAlreadySaved();
    fetchLiveStatus();
  }, [sharedTrip.trainNumber]);

  const checkIfAlreadySaved = async () => {
    try {
      const tickets = await ticketRepository.getTickets();
      const existing = tickets.find(
        (t) =>
          t.train.number === sharedTrip.trainNumber &&
          (t.journey.date === sharedTrip.dateOfJourney || !sharedTrip.dateOfJourney)
      );
      if (existing) {
        setIsSaved(true);
        setSavedTicket(existing);
      }
    } catch {
      // Ignore check errors
    }
  };

  const fetchLiveStatus = async (force: boolean = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await getLiveTrainStatus(sharedTrip.trainNumber, force);
      if (data) {
        setLiveData(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to fetch real-time tracking data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    try {
      const newTicket = convertSharedTripToTicket(sharedTrip);
      await ticketRepository.saveOrMergeTicket(newTicket);
      setIsSaved(true);
      setSavedTicket(newTicket);
      if (onSaveToWallet) {
        onSaveToWallet(newTicket);
      }
    } catch (err) {
      console.log('[SharedJourneyScreen] Error saving ticket to wallet:', err);
    }
  };

  const resolvedTrainName =
    sharedTrip.trainName ||
    getTrainName(sharedTrip.trainNumber) ||
    liveData?.trainName ||
    `Train ${sharedTrip.trainNumber}`;

  // Delay & badge calculations
  const delayMinutes = liveData?.delayMinutes ?? 0;
  const isDelayed = delayMinutes > 5;
  const isRunning = liveData?.status === 'running';
  const delayText = isDelayed
    ? `Delayed by ${delayMinutes} min`
    : isRunning
    ? 'Running on time'
    : liveData?.status === 'completed'
    ? 'Arrived at Destination'
    : 'Scheduled Run';

  const nextHalt = liveData?.nextHalt;
  const nextHaltName = nextHalt?.stationName || nextHalt?.stationCode;
  const nextHaltPlatform = nextHalt?.platform ? ` · Platform ${nextHalt.platform}` : '';
  const nextHaltEta = nextHalt?.arrivalTime ? `ETA ${formatHaltTime(nextHalt.arrivalTime)}` : '';

  // Route progress percentage
  let routeProgressPercent = 0;
  if (liveData?.route && liveData.route.length > 0) {
    const passedCount = liveData.route.filter(
      (h) => h.status === 'departed' || h.status === 'arrived'
    ).length;
    routeProgressPercent = Math.min(100, Math.round((passedCount / liveData.route.length) * 100));
  }

  const hasSpecificSeat = Boolean(sharedTrip.coach || sharedTrip.seat);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <AppText variant="bodyLg" weight="bold" color="primary">
            Shared Journey
          </AppText>
          <View style={styles.liveIndicatorRow}>
            <View style={styles.pulsingDot} />
            <AppText variant="micro" color="secondary" style={styles.liveTagText}>
              LIVE TRACKING
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => fetchLiveStatus(true)}
          style={styles.refreshButton}
          disabled={loading || refreshing}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={Colors.textPrimary} />
          ) : (
            <RefreshCw size={18} color={Colors.textPrimary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchLiveStatus(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ================= 1. BOARDING PASS TICKET CARD ================= */}
        <View style={styles.passCard}>
          {/* Header Row: Train Number, Badge & Date */}
          <View style={styles.passHeader}>
            <View style={styles.trainInfoCol}>
              <View style={styles.trainBadgeRow}>
                <View style={styles.trainNumberBadge}>
                  <AppText variant="micro" weight="bold" color="primary">
                    {`TRAIN ${sharedTrip.trainNumber}`}
                  </AppText>
                </View>
                <View style={styles.typeBadge}>
                  <AppText variant="micro" weight="bold" color="orange">
                    {sharedTrip.trainType || 'SUPERFAST'}
                  </AppText>
                </View>
              </View>
              <AppText variant="title" weight="heavy" color="primary" numberOfLines={1} style={styles.trainNameText}>
                {resolvedTrainName}
              </AppText>
            </View>

            <View style={styles.datePill}>
              <Calendar size={12} color={Colors.textSecondary} style={{ marginRight: 4 }} />
              <AppText variant="micro" weight="semibold" color="secondary">
                {sharedTrip.dateOfJourney || 'Today'}
              </AppText>
            </View>
          </View>

          {/* Route Display */}
          <View style={styles.routeRow}>
            <View style={styles.stationBlockLeft}>
              <AppText variant="heading" weight="heavy" color="primary" style={styles.stationCode}>
                {sharedTrip.fromStation}
              </AppText>
              <AppText variant="tiny" color="secondary" numberOfLines={1} style={styles.stationName}>
                {sharedTrip.fromStationName || sharedTrip.fromStation}
              </AppText>
              <AppText variant="body" weight="bold" color="orange" style={styles.timeMargin}>
                {sharedTrip.departureTime || '--:--'}
              </AppText>
            </View>

            <View style={styles.routeCenterLineCol}>
              <View style={styles.trackDurationPill}>
                <AppText variant="micro" weight="bold" color="secondary">
                  DIRECT
                </AppText>
              </View>
              <View style={styles.trackLineRow}>
                <View style={styles.trackDot} />
                <View style={styles.trackLine} />
                <View style={styles.trackDot} />
              </View>
            </View>

            <View style={styles.stationBlockRight}>
              <AppText variant="heading" weight="heavy" color="primary" style={styles.stationCode}>
                {sharedTrip.toStation}
              </AppText>
              <AppText variant="tiny" color="secondary" numberOfLines={1} style={styles.stationName}>
                {sharedTrip.toStationName || sharedTrip.toStation}
              </AppText>
              <AppText variant="body" weight="bold" color="primary" style={styles.timeMargin}>
                {sharedTrip.arrivalTime || '--:--'}
              </AppText>
            </View>
          </View>

          {/* Perforated Divider with Circular Notches */}
          <View style={styles.perforationContainer}>
            <View style={styles.notchLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.notchRight} />
          </View>

          {/* Coach & Seat allocation or Protected Privacy indicator */}
          {hasSpecificSeat ? (
            <View style={styles.berthDetailsRow}>
              {sharedTrip.coach ? (
                <View style={styles.berthBadge}>
                  <AppText variant="micro" color="secondary">COACH</AppText>
                  <AppText variant="body" weight="heavy" color="orange">{sharedTrip.coach}</AppText>
                </View>
              ) : null}
              {sharedTrip.seat ? (
                <View style={styles.berthBadge}>
                  <AppText variant="micro" color="secondary">SEAT</AppText>
                  <AppText variant="body" weight="heavy" color="primary">{sharedTrip.seat}</AppText>
                </View>
              ) : null}
              {sharedTrip.berthType ? (
                <View style={styles.berthBadge}>
                  <AppText variant="micro" color="secondary">BERTH</AppText>
                  <AppText variant="body" weight="heavy" color="primary">{sharedTrip.berthType}</AppText>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.protectedBerthRow}>
              <ShieldCheck size={13} color={Colors.appleGreen} style={{ marginRight: 6 }} />
              <AppText variant="caption" weight="medium" color="secondary">
                Coach & seat details kept private by traveler
              </AppText>
            </View>
          )}
        </View>

        {/* ================= 2. REAL-TIME RADAR TELEMETRY CARD ================= */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusHeaderLeft}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isDelayed ? Colors.appleOrange : Colors.appleGreen },
                ]}
              />
              <AppText variant="body" weight="bold" color="primary">
                {delayText}
              </AppText>
            </View>

            {liveData?.nextHalt?.platform ? (
              <View style={styles.platformBadge}>
                <AppText variant="micro" weight="bold" color="primary">
                  PF {liveData.nextHalt.platform}
                </AppText>
              </View>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <AppText variant="caption" color="secondary" style={{ marginTop: 8 }}>
                Querying National Train Enquiry System...
              </AppText>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color={Colors.warning} style={{ marginRight: 6 }} />
              <AppText variant="caption" color="secondary">
                {error}
              </AppText>
            </View>
          ) : (
            <>
              {/* Current / Next Location Hero Capsule */}
              <View style={styles.locationContainer}>
                <View style={styles.locationIconCircle}>
                  <Navigation size={15} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="micro" uppercase weight="bold" color="secondary" letterSpacing={0.5}>
                    {nextHalt ? 'NEXT UPCOMING HALT' : 'CURRENT POSITION'}
                  </AppText>
                  <AppText variant="bodyLg" weight="heavy" color="primary" style={{ marginTop: 1 }}>
                    {nextHalt ? `${nextHaltName}${nextHaltPlatform}` : liveData?.currentLocation?.stationName || 'En route'}
                  </AppText>
                  {nextHaltEta ? (
                    <AppText variant="tiny" weight="semibold" color="orange" style={{ marginTop: 2 }}>
                      {nextHaltEta}
                    </AppText>
                  ) : null}
                </View>
              </View>

              {/* Live Journey Progress Bar */}
              {isRunning && routeProgressPercent > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${routeProgressPercent}%` }]} />
                  </View>
                  <View style={styles.progressLabelRow}>
                    <AppText variant="micro" color="secondary">
                      {sharedTrip.fromStation}
                    </AppText>
                    <AppText variant="micro" weight="bold" color="orange">
                      {`${routeProgressPercent}% completed`}
                    </AppText>
                    <AppText variant="micro" color="secondary">
                      {sharedTrip.toStation}
                    </AppText>
                  </View>
                </View>
              )}

              {/* Station Halts Timeline */}
              {Array.isArray(liveData?.route) && liveData.route.length > 0 && (
                <View style={styles.timelineSection}>
                  <AppText variant="caption" weight="bold" color="secondary" style={styles.timelineTitle}>
                    SCHEDULED HALTS & TIMINGS
                  </AppText>

                  {liveData.route.slice(0, 10).map((stn: StationHalt, idx: number) => {
                    const isStationPassed = stn.status === 'departed' || stn.status === 'arrived';
                    const hasDelay = stn.delayArrival !== undefined && stn.delayArrival > 0;
                    return (
                      <View key={idx} style={styles.timelineItem}>
                        <View style={styles.timelineLeftCol}>
                          <View
                            style={[
                              styles.timelineDot,
                              isStationPassed ? styles.timelineDotPassed : styles.timelineDotActive,
                            ]}
                          />
                          {idx < Math.min(liveData.route.length, 10) - 1 && <View style={styles.timelineConnector} />}
                        </View>
                        <View style={styles.timelineStationDetails}>
                          <AppText variant="caption" weight="bold" color={isStationPassed ? 'muted' : 'primary'}>
                            {stn.stationName} ({stn.stationCode})
                          </AppText>
                          <AppText variant="micro" color="secondary">
                            {stn.actualArrival || stn.scheduledArrival || stn.scheduledDeparture || '--:--'}
                            {stn.platform ? ` · PF ${stn.platform}` : ''}
                            {hasDelay ? ` (+${stn.delayArrival}m)` : ''}
                          </AppText>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>

        {/* Info Note on Privacy */}
        <View style={styles.privacyNoteBox}>
          <AppText variant="micro" color="secondary" style={{ textAlign: 'center', lineHeight: 18 }}>
            🔒 This journey was shared via a stateless deep link. No user data or PNR is stored on remote servers.
          </AppText>
        </View>
      </ScrollView>

      {/* ================= 3. PERSISTENT BOTTOM ACTION BAR ================= */}
      <View style={styles.bottomBar}>
        {isSaved ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => savedTicket && onViewInWallet && onViewInWallet(savedTicket)}
            style={styles.savedButton}
          >
            <Check size={18} color={Colors.appleGreen} style={{ marginRight: 8 }} />
            <AppText variant="body" weight="bold" style={{ color: Colors.appleGreen }}>
              SAVED IN YOUR WALLET
            </AppText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            style={styles.saveButton}
          >
            <Plus size={18} color="#000000" style={{ marginRight: 8 }} />
            <AppText variant="body" weight="heavy" color="dark">
              ADD TO MY WALLET
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.appleGroupedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.appleGreen,
    marginRight: 5,
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.appleGroupedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  passCard: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trainInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  trainBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  trainNumberBadge: {
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginRight: 6,
  },
  typeBadge: {
    backgroundColor: 'rgba(245, 51, 44, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 51, 44, 0.28)',
  },
  trainNameText: {
    fontSize: 18,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
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
  stationName: {
    marginTop: 2,
    marginBottom: 2,
  },
  timeMargin: {
    marginTop: 2,
  },
  routeCenterLineCol: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: Colors.primary,
  },
  trackLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 3,
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
    backgroundColor: '#000000',
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
    backgroundColor: '#000000',
    marginRight: -8,
  },
  berthDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  berthBadge: {
    backgroundColor: Colors.appleSecondaryBg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  protectedBerthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  statusCard: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginBottom: 16,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  platformBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  locationIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(245, 51, 44, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.appleGreen,
    borderRadius: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timelineSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.appleSeparator,
    paddingTop: 12,
  },
  timelineTitle: {
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 40,
  },
  timelineLeftCol: {
    alignItems: 'center',
    width: 20,
    marginRight: 10,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: Colors.primary,
  },
  timelineDotPassed: {
    backgroundColor: Colors.appleTertiaryLabel,
  },
  timelineConnector: {
    width: 1.5,
    flex: 1,
    backgroundColor: Colors.appleSeparator,
    marginVertical: 2,
  },
  timelineStationDetails: {
    flex: 1,
    paddingBottom: 10,
  },
  privacyNoteBox: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.appleSeparator,
    backgroundColor: '#000000',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedButton: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.35)',
  },
});
