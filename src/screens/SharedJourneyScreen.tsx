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
  Plus,
  Check,
  ShieldCheck,
  Calendar,
  Radio,
  ArrowRight,
  CheckCircle2,
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
import { getTrainName, getStationName } from '../utils/stationLookup';

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

  // Delay & status metrics
  const delayMinutes = liveData?.delayMinutes ?? 0;
  const isDelayed = delayMinutes > 5;
  const isRunning = liveData?.status === 'running';
  const isCompleted = liveData?.status === 'completed';

  const statusLabel = isCompleted
    ? 'JOURNEY COMPLETED'
    : isDelayed
    ? `${delayMinutes} MIN DELAY`
    : isRunning
    ? 'RUNNING ON TIME'
    : 'SCHEDULED RUN';

  // Compute Current Station and Next Station
  const route = Array.isArray(liveData?.route) ? liveData.route : [];
  const passedHalts = route.filter(
    (h) => h.status === 'departed' || h.status === 'arrived'
  );
  const lastPassedHalt = passedHalts.length > 0 ? passedHalts[passedHalts.length - 1] : null;
  const upcomingHalt =
    route.find((h) => h.status !== 'departed' && h.status !== 'arrived') ||
    liveData?.nextHalt;

  const currentStationName =
    liveData?.previousHalt?.stationName ||
    lastPassedHalt?.stationName ||
    liveData?.currentLocation?.stationName ||
    sharedTrip.fromStationName ||
    getStationName(sharedTrip.fromStation) ||
    sharedTrip.fromStation;

  const currentStationCode =
    liveData?.previousHalt?.stationCode ||
    lastPassedHalt?.stationCode ||
    liveData?.currentLocation?.stationCode ||
    sharedTrip.fromStation;

  const currentStationTime =
    liveData?.previousHalt?.departureTime ||
    lastPassedHalt?.actualDeparture ||
    lastPassedHalt?.scheduledDeparture ||
    sharedTrip.departureTime ||
    '';

  const nextStationName =
    liveData?.nextHalt?.stationName ||
    upcomingHalt?.stationName ||
    sharedTrip.toStationName ||
    getStationName(sharedTrip.toStation) ||
    sharedTrip.toStation;

  const nextStationCode =
    liveData?.nextHalt?.stationCode ||
    upcomingHalt?.stationCode ||
    sharedTrip.toStation;

  const rawNextEta =
    liveData?.nextHalt?.arrivalTime ||
    (upcomingHalt as any)?.actualArrival ||
    (upcomingHalt as any)?.scheduledArrival ||
    (upcomingHalt as any)?.arrivalTime ||
    sharedTrip.arrivalTime ||
    '';

  const nextStationEta = rawNextEta ? formatHaltTime(rawNextEta) : '';
  const nextStationPlatform =
    liveData?.nextHalt?.platform || upcomingHalt?.platform;

  // Route progress percentage
  let routeProgressPercent = 0;
  if (route.length > 0) {
    routeProgressPercent = Math.min(
      100,
      Math.round((passedHalts.length / route.length) * 100)
    );
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
          <AppText variant="body" weight="bold" color="primary">
            Shared Journey
          </AppText>
          <View style={styles.liveIndicatorRow}>
            <View style={styles.pulsingDot} />
            <AppText variant="micro" color="secondary" style={styles.liveTagText}>
              LIVE RADAR
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
        {/* ================= 1. CURRENT & NEXT STATION HERO CARD (STAR OF THE PAGE) ================= */}
        <View style={styles.heroCard}>
          {/* Top Status Banner */}
          <View style={styles.heroStatusRow}>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isCompleted
                      ? Colors.appleTertiaryLabel
                      : isDelayed
                      ? '#FF453A'
                      : Colors.appleGreen,
                  },
                ]}
              />
              <AppText variant="micro" weight="heavy" color="primary">
                {statusLabel}
              </AppText>
            </View>

            {liveData?.currentLocation?.speedKmh ? (
              <AppText variant="micro" color="secondary" weight="semibold">
                {`Speed ~${liveData.currentLocation.speedKmh} km/h`}
              </AppText>
            ) : (
              <AppText variant="micro" color="secondary" weight="semibold">
                NTES Live
              </AppText>
            )}
          </View>

          {/* Current & Next Station Columns */}
          <View style={styles.stationsRow}>
            {/* CURRENT / LAST STATION */}
            <View style={styles.stationColLeft}>
              <View style={styles.sectionHeaderBadge}>
                <AppText variant="micro" weight="heavy" color="secondary" style={styles.colHeaderLabel}>
                  {passedHalts.length > 0 ? 'CURRENT / LAST STATION' : 'ORIGIN STATION'}
                </AppText>
              </View>
              <AppText
                variant="heading"
                weight="heavy"
                color="primary"
                numberOfLines={1}
                style={styles.stationNameHeading}
              >
                {currentStationName}
              </AppText>
              <AppText variant="caption" weight="medium" color="secondary" style={styles.stationTimeDetail}>
                {currentStationTime ? `Departed ${currentStationTime}` : `${currentStationCode}`}
              </AppText>
            </View>

            {/* NEXT STATION */}
            <View style={styles.stationColRight}>
              <View style={styles.nextStationBadge}>
                <Radio size={10} color={Colors.primary} style={{ marginRight: 4 }} />
                <AppText variant="micro" weight="heavy" color="primary" style={styles.nextLabelText}>
                  NEXT STATION
                </AppText>
              </View>
              <AppText
                variant="heading"
                weight="heavy"
                color="primary"
                numberOfLines={1}
                style={styles.stationNameHeading}
              >
                {nextStationName}
              </AppText>
              <AppText variant="caption" weight="heavy" color="primary" style={styles.stationTimeDetail}>
                {nextStationEta ? `ETA ${nextStationEta}` : 'Arriving soon'}
                {nextStationPlatform ? ` · Platform ${nextStationPlatform}` : ''}
              </AppText>
            </View>
          </View>

          {/* Progress bar connecting Current Station -> Next Station */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: isCompleted ? '100%' : `${Math.max(12, routeProgressPercent)}%` },
                ]}
              />
            </View>
            <View style={styles.progressFooterRow}>
              <AppText variant="micro" color="secondary">
                {currentStationCode}
              </AppText>
              <AppText variant="micro" color="secondary" weight="semibold">
                {isCompleted
                  ? 'Arrived at destination'
                  : nextStationPlatform
                  ? `Next halt at PF ${nextStationPlatform}`
                  : `${routeProgressPercent}% route completed`}
              </AppText>
              <AppText variant="micro" color="secondary">
                {nextStationCode}
              </AppText>
            </View>
          </View>
        </View>

        {/* ================= 2. JOURNEY OVERVIEW CARD (APPLE BOARDING PASS) ================= */}
        <View style={styles.journeyCard}>
          {/* Card Header: Train Info & Date */}
          <View style={styles.journeyHeaderRow}>
            <View style={styles.trainTitleContainer}>
              <View style={styles.trainNumberBadge}>
                <AppText variant="micro" weight="heavy" color="primary">
                  {sharedTrip.trainNumber}
                </AppText>
              </View>
              <AppText
                variant="body"
                weight="heavy"
                color="primary"
                numberOfLines={1}
                style={styles.trainTitleText}
              >
                {resolvedTrainName}
              </AppText>
            </View>

            <View style={styles.dateBadge}>
              <Calendar size={12} color={Colors.appleTertiaryLabel} style={{ marginRight: 4 }} />
              <AppText variant="micro" weight="semibold" color="secondary">
                {sharedTrip.dateOfJourney || 'Today'}
              </AppText>
            </View>
          </View>

          {/* Route Overview: Origin -> Destination */}
          <View style={styles.routeOverviewRow}>
            <View style={styles.routePointLeft}>
              <AppText variant="title" weight="heavy" color="primary" style={styles.routeCode}>
                {sharedTrip.fromStation}
              </AppText>
              <AppText variant="caption" weight="heavy" color="primary">
                {sharedTrip.departureTime || '--:--'}
              </AppText>
              <AppText variant="micro" color="secondary" numberOfLines={1} style={styles.routeStationSub}>
                {sharedTrip.fromStationName || getStationName(sharedTrip.fromStation)}
              </AppText>
            </View>

            <View style={styles.routeConnectingTrack}>
              <View style={styles.trackLineLeft} />
              <View style={styles.trackArrowPill}>
                <ArrowRight size={12} color={Colors.appleTertiaryLabel} />
              </View>
              <View style={styles.trackLineRight} />
            </View>

            <View style={styles.routePointRight}>
              <AppText variant="title" weight="heavy" color="primary" style={styles.routeCode}>
                {sharedTrip.toStation}
              </AppText>
              <AppText variant="caption" weight="heavy" color="primary">
                {sharedTrip.arrivalTime || '--:--'}
              </AppText>
              <AppText variant="micro" color="secondary" numberOfLines={1} style={styles.routeStationSub}>
                {sharedTrip.toStationName || getStationName(sharedTrip.toStation)}
              </AppText>
            </View>
          </View>

          {/* Seat & Berth or Privacy Protection Row */}
          <View style={styles.berthSectionRow}>
            {hasSpecificSeat ? (
              <View style={styles.berthPillsContainer}>
                {sharedTrip.coach ? (
                  <View style={styles.berthPill}>
                    <AppText variant="micro" color="secondary" style={styles.berthPillLabel}>COACH</AppText>
                    <AppText variant="caption" weight="heavy" color="primary">{sharedTrip.coach}</AppText>
                  </View>
                ) : null}
                {sharedTrip.seat ? (
                  <View style={styles.berthPill}>
                    <AppText variant="micro" color="secondary" style={styles.berthPillLabel}>SEAT</AppText>
                    <AppText variant="caption" weight="heavy" color="primary">{sharedTrip.seat}</AppText>
                  </View>
                ) : null}
                {sharedTrip.berthType ? (
                  <View style={styles.berthPill}>
                    <AppText variant="micro" color="secondary" style={styles.berthPillLabel}>TYPE</AppText>
                    <AppText variant="caption" weight="heavy" color="primary">{sharedTrip.berthType}</AppText>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.privateBerthBox}>
                <ShieldCheck size={14} color={Colors.appleGreen} style={{ marginRight: 6 }} />
                <AppText variant="caption" weight="medium" color="secondary">
                  Coach & seat details kept private by traveler
                </AppText>
              </View>
            )}
          </View>
        </View>

        {/* ================= 3. STATION TIMELINE (CLEAN APPLE LIST) ================= */}
        {route.length > 0 && (
          <View style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <AppText variant="caption" weight="heavy" color="secondary" letterSpacing={0.6}>
                ROUTE HALTS & SCHEDULE
              </AppText>
              <AppText variant="micro" color="secondary">
                {`${passedHalts.length} of ${route.length} passed`}
              </AppText>
            </View>

            {route.map((stn: StationHalt, idx: number) => {
              const isPassed = stn.status === 'departed' || stn.status === 'arrived';
              const isCurrentNext =
                stn.stationCode === nextStationCode ||
                stn.stationCode === currentStationCode;

              return (
                <View key={idx} style={styles.timelineRow}>
                  {/* Timeline left indicator */}
                  <View style={styles.timelineNodeCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        isPassed
                          ? styles.timelineDotPassed
                          : isCurrentNext
                          ? styles.timelineDotCurrent
                          : styles.timelineDotUpcoming,
                      ]}
                    >
                      {isPassed ? (
                        <Check size={8} color="#FFFFFF" />
                      ) : isCurrentNext ? (
                        <View style={styles.innerGlowingDot} />
                      ) : null}
                    </View>
                    {idx < route.length - 1 && <View style={styles.timelineLine} />}
                  </View>

                  {/* Station info */}
                  <View style={styles.timelineContentCol}>
                    <View style={styles.timelineStationTitleRow}>
                      <AppText
                        variant="body"
                        weight={isCurrentNext ? 'heavy' : 'bold'}
                        color={isPassed ? 'secondary' : 'primary'}
                        numberOfLines={1}
                        style={{ flex: 1 }}
                      >
                        {stn.stationName}
                      </AppText>
                      {stn.platform ? (
                        <View style={styles.platformBadge}>
                          <AppText variant="micro" weight="bold" color="secondary">
                            {`PF ${stn.platform}`}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.timelineTimeRow}>
                      <AppText variant="micro" color="secondary">
                        {stn.actualArrival ||
                          stn.scheduledArrival ||
                          stn.actualDeparture ||
                          stn.scheduledDeparture ||
                          '--:--'}
                      </AppText>
                      {stn.delayArrival !== undefined && stn.delayArrival > 0 ? (
                        <AppText variant="micro" weight="bold" color="primary" style={{ marginLeft: 6 }}>
                          {`(+${stn.delayArrival}m)`}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Privacy footnote */}
        <View style={styles.footerNoteBox}>
          <AppText variant="micro" color="secondary" style={styles.footerNoteText}>
            🔒 Stateless Tracking · No PNR or personal journey data is stored on remote servers.
          </AppText>
        </View>
      </ScrollView>

      {/* ================= 4. PERSISTENT APPLE BOTTOM BAR ================= */}
      <View style={styles.bottomBar}>
        {isSaved ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => savedTicket && onViewInWallet && onViewInWallet(savedTicket)}
            style={styles.savedButton}
          >
            <CheckCircle2 size={18} color={Colors.appleGreen} style={{ marginRight: 8 }} />
            <AppText variant="body" weight="heavy" style={{ color: Colors.appleGreen }}>
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
    borderBottomColor: Colors.appleSeparator,
    backgroundColor: '#000000',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.appleGroupedBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.appleGroupedBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  stationsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stationColLeft: {
    flex: 1,
    paddingRight: 10,
  },
  stationColRight: {
    flex: 1.1,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: Colors.appleSeparator,
  },
  sectionHeaderBadge: {
    marginBottom: 4,
  },
  colHeaderLabel: {
    fontSize: 9,
    letterSpacing: 0.6,
  },
  nextStationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nextLabelText: {
    fontSize: 9,
    letterSpacing: 0.6,
  },
  stationNameHeading: {
    fontSize: 18,
    letterSpacing: 0.2,
    lineHeight: 22,
    marginBottom: 2,
  },
  stationTimeDetail: {
    fontSize: 12,
  },
  progressSection: {
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.appleSeparator,
  },
  progressBarTrack: {
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
  progressFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  /* Journey Card */
  journeyCard: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginBottom: 14,
  },
  journeyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  trainTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  trainNumberBadge: {
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginRight: 8,
  },
  trainTitleText: {
    fontSize: 14,
    flex: 1,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  routeOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  routePointLeft: {
    alignItems: 'flex-start',
    minWidth: 80,
  },
  routePointRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  routeCode: {
    fontSize: 24,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  routeStationSub: {
    fontSize: 10,
    marginTop: 2,
    maxWidth: 90,
  },
  routeConnectingTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  trackLineLeft: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  trackArrowPill: {
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
  trackLineRight: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  berthSectionRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.appleSeparator,
  },
  berthPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  berthPill: {
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    alignItems: 'center',
  },
  berthPillLabel: {
    fontSize: 8,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  privateBerthBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },

  /* Timeline Card */
  timelineCard: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    marginBottom: 14,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 46,
  },
  timelineNodeCol: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotPassed: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  timelineDotCurrent: {
    backgroundColor: Colors.primary,
  },
  innerGlowingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  timelineDotUpcoming: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: Colors.appleSeparator,
    marginVertical: 2,
  },
  timelineContentCol: {
    flex: 1,
    paddingBottom: 10,
  },
  timelineStationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  platformBadge: {
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  timelineTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },

  /* Footer Note */
  footerNoteBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerNoteText: {
    textAlign: 'center',
    lineHeight: 16,
  },

  /* Bottom Bar */
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.appleSeparator,
    backgroundColor: '#000000',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
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
