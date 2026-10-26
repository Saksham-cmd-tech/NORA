import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
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
  Clock,
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
import { isEarlyJourney as isEarlyJourneyCheck } from '../utils/dateUtils';

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
  const isEarlyJourney = isEarlyJourneyCheck(
    sharedTrip.dateOfJourney,
    sharedTrip.departureTime
  );

  const [earlyNoticeVisible, setEarlyNoticeVisible] = useState(isEarlyJourney);
  const [liveData, setLiveData] = useState<LiveTrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedTicket, setSavedTicket] = useState<NormalizedTicket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkIfAlreadySaved();
    if (!isEarlyJourney) {
      fetchLiveStatus(true);
    } else {
      setLoading(false);
    }
  }, [sharedTrip.trainNumber, isEarlyJourney]);

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

  // Real active station where train is or has just departed (prioritize NTES currentLocation)
  const currentStationName =
    liveData?.currentLocation?.stationName ||
    liveData?.previousHalt?.stationName ||
    lastPassedHalt?.stationName ||
    sharedTrip.fromStationName ||
    getStationName(sharedTrip.fromStation) ||
    sharedTrip.fromStation;

  const currentStationCode =
    liveData?.currentLocation?.stationCode ||
    liveData?.previousHalt?.stationCode ||
    lastPassedHalt?.stationCode ||
    sharedTrip.fromStation;

  let currentStationTimeDisplay = '';
  if (
    liveData?.currentLocation?.status &&
    liveData.currentLocation.status.toLowerCase().includes('departed')
  ) {
    const match = liveData.currentLocation.status.match(/at\s+([\d:]+\s*(?:[A-Za-z0-9\-]+)?)/i);
    currentStationTimeDisplay = match ? `Departed at ${match[1]}` : liveData.currentLocation.status;
  } else if (liveData?.previousHalt?.departureTime) {
    currentStationTimeDisplay = `Departed ${liveData.previousHalt.departureTime}`;
  } else if (lastPassedHalt?.actualDeparture || lastPassedHalt?.scheduledDeparture) {
    currentStationTimeDisplay = `Departed ${lastPassedHalt.actualDeparture || lastPassedHalt.scheduledDeparture}`;
  } else if (sharedTrip.departureTime) {
    currentStationTimeDisplay = `Scheduled ${sharedTrip.departureTime}`;
  }

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
            {isEarlyJourney ? (
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: 'rgba(255, 159, 10, 0.12)',
                    borderColor: 'rgba(255, 159, 10, 0.3)',
                  },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: '#FF9F0A' }]} />
                <AppText variant="micro" weight="heavy" style={{ color: '#FF9F0A' }}>
                  TRACKING INACTIVE
                </AppText>
              </View>
            ) : (
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
            )}

            {liveData?.currentLocation?.speedKmh && !isEarlyJourney ? (
              <AppText variant="micro" color="secondary" weight="semibold">
                {`Speed ~${liveData.currentLocation.speedKmh} km/h`}
              </AppText>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => fetchLiveStatus(true)}
              style={styles.heroCheckStatusBtn}
              disabled={loading || refreshing}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4, transform: [{ scale: 0.65 }] }} />
              ) : (
                <RefreshCw size={11} color={Colors.appleLabel} style={{ marginRight: 4 }} />
              )}
              <AppText variant="micro" weight="heavy" color="primary">
                {refreshing ? 'Updating...' : 'Check Status'}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Current & Next Station Columns */}
          <View style={styles.stationsRow}>
            {/* CURRENT / ORIGIN STATION */}
            <View style={styles.stationColLeft}>
              <View style={styles.sectionHeaderBadge}>
                <AppText variant="micro" weight="heavy" color="secondary" style={styles.colHeaderLabel}>
                  {isEarlyJourney ? 'ORIGIN STATION' : 'CURRENT STATION'}
                </AppText>
              </View>
              <AppText
                variant="heading"
                weight="heavy"
                color="primary"
                numberOfLines={1}
                style={styles.stationNameHeading}
              >
                {isEarlyJourney ? (sharedTrip.fromStationName || sharedTrip.fromStation) : currentStationName}
              </AppText>
              <AppText variant="caption" weight="medium" color="secondary" style={styles.stationTimeDetail}>
                {isEarlyJourney ? `Departure scheduled at ${sharedTrip.departureTime || '--:--'}` : (currentStationTimeDisplay || `${currentStationCode}`)}
              </AppText>
            </View>

            {/* NEXT / DESTINATION STATION */}
            <View style={styles.stationColRight}>
              <View style={styles.nextStationBadge}>
                <Radio size={10} color={isEarlyJourney ? Colors.appleSecondaryLabel : Colors.primary} style={{ marginRight: 4 }} />
                <AppText variant="micro" weight="heavy" color="primary" style={styles.nextLabelText}>
                  {isEarlyJourney ? 'DESTINATION' : 'NEXT STATION'}
                </AppText>
              </View>
              <AppText
                variant="heading"
                weight="heavy"
                color="primary"
                numberOfLines={1}
                style={styles.stationNameHeading}
              >
                {isEarlyJourney ? (sharedTrip.toStationName || sharedTrip.toStation) : nextStationName}
              </AppText>
              <AppText variant="caption" weight="heavy" color="primary" style={styles.stationTimeDetail}>
                {isEarlyJourney
                  ? `Expected ${sharedTrip.arrivalTime || '--:--'}`
                  : nextStationEta
                  ? `ETA ${nextStationEta}${nextStationPlatform ? ` · Platform ${nextStationPlatform}` : ''}`
                  : 'Arriving soon'}
              </AppText>
            </View>
          </View>

          {isEarlyJourney && (
            <View style={styles.earlyNoticeBanner}>
              <Clock size={14} color="#FF9F0A" style={{ marginRight: 8, marginTop: 1 }} />
              <AppText variant="micro" weight="medium" style={{ color: '#FFD60A', flex: 1, lineHeight: 17 }}>
                {`You can track this journey 1 hour before departure (${sharedTrip.dateOfJourney || 'Scheduled'} at ${sharedTrip.departureTime || '--:--'}).`}
              </AppText>
            </View>
          )}

          {/* Progress bar connecting Current Station -> Next Station */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: isEarlyJourney ? '0%' : isCompleted ? '100%' : `${Math.max(12, routeProgressPercent)}%` },
                ]}
              />
            </View>
            <View style={styles.progressFooterRow}>
              <AppText variant="micro" color="secondary">
                {currentStationCode}
              </AppText>
              <AppText variant="micro" color="secondary" weight="semibold">
                {isEarlyJourney
                  ? `Departure in ${sharedTrip.dateOfJourney || "future"}`
                  : isCompleted
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

        {/* ================= 3. STATION TIMELINE (ACCENT FOR COVERED, GRAY FOR OTHERS, HIGHLIGHT CURRENT) ================= */}
        {route.length > 0 && (
          <View style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <AppText variant="caption" weight="heavy" color="secondary" letterSpacing={0.6}>
                ROUTE HALTS & SCHEDULE
              </AppText>
              <AppText variant="micro" color="secondary">
                {`${passedHalts.length} of ${route.length} covered`}
              </AppText>
            </View>

            {route.map((stn: StationHalt, idx: number) => {
              const isPassed = stn.status === 'departed' || stn.status === 'arrived';
              // The current station on the halts list is the most recent passed station
              const isCurrentStation =
                lastPassedHalt && stn.stationCode === lastPassedHalt.stationCode;

              return (
                <View key={idx} style={styles.timelineRow}>
                  {/* Timeline left indicator */}
                  <View style={styles.timelineNodeCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        isCurrentStation
                          ? styles.timelineDotCurrent
                          : isPassed
                          ? styles.timelineDotCovered
                          : styles.timelineDotUpcoming,
                      ]}
                    >
                      {isCurrentStation ? (
                        <View style={styles.innerGlowingDot} />
                      ) : isPassed ? (
                        <Check size={8} color="#FFFFFF" />
                      ) : null}
                    </View>
                    {idx < route.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          isPassed ? styles.timelineLineCovered : styles.timelineLineUpcoming,
                        ]}
                      />
                    )}
                  </View>

                  {/* Station info */}
                  <View style={styles.timelineContentCol}>
                    <View style={styles.timelineStationTitleRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <AppText
                          variant="body"
                          weight={isCurrentStation ? 'heavy' : isPassed ? 'bold' : 'medium'}
                          numberOfLines={1}
                          style={{
                            color: isCurrentStation
                              ? '#FFFFFF'
                              : isPassed
                              ? Colors.primary // ACCENT COLOR FOR COVERED STATIONS
                              : Colors.appleTertiaryLabel, // GRAY FOR OTHER STATIONS
                          }}
                        >
                          {stn.stationName}
                        </AppText>
                        {isCurrentStation ? (
                          <View style={styles.currentStationPill}>
                            <Radio size={9} color={Colors.primary} style={{ marginRight: 3 }} />
                            <AppText
                              variant="micro"
                              weight="heavy"
                              color="primary"
                              style={styles.currentStationPillText}
                            >
                              CURRENT
                            </AppText>
                          </View>
                        ) : null}
                      </View>

                      {stn.platform ? (
                        <View
                          style={[
                            styles.platformBadge,
                            isPassed ? styles.platformBadgeCovered : styles.platformBadgeUpcoming,
                          ]}
                        >
                          <AppText
                            variant="micro"
                            weight="bold"
                            style={{
                              color: isPassed ? Colors.primary : Colors.appleTertiaryLabel,
                            }}
                          >
                            {`PF ${stn.platform}`}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.timelineTimeRow}>
                      <AppText
                        variant="micro"
                        style={{
                          color: isPassed ? 'rgba(255, 255, 255, 0.75)' : Colors.appleTertiaryLabel,
                        }}
                      >
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
      {/* ================= 5. EARLY JOURNEY POP-UP MODAL ================= */}
      <Modal
        visible={earlyNoticeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEarlyNoticeVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.earlyModalCard}>
            <View style={styles.earlyModalIconBadge}>
              <Clock size={28} color="#FF9F0A" />
            </View>

            <AppText variant="title" weight="heavy" color="primary" style={styles.earlyModalTitle}>
              Live Tracking Ahead
            </AppText>

            <AppText variant="body" color="secondary" style={styles.earlyModalDesc}>
              You can use live tracking <AppText weight="heavy" color="primary">1 hour before departure</AppText>. Real-time satellite radar and station telemetry will turn on automatically then.
            </AppText>

            <View style={styles.earlyModalSchedulePill}>
              <Calendar size={13} color="#FF9F0A" style={{ marginRight: 6 }} />
              <AppText variant="caption" weight="heavy" color="primary">
                {`${sharedTrip.dateOfJourney || 'Upcoming'} at ${sharedTrip.departureTime || '--:--'}`}
              </AppText>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setEarlyNoticeVisible(false)}
              style={styles.earlyModalBtn}
            >
              <AppText variant="body" weight="heavy" color="primary">
                View Boarding Pass
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  heroCheckStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
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
  timelineDotCovered: {
    backgroundColor: Colors.primary,
  },
  timelineDotCurrent: {
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  innerGlowingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  timelineDotUpcoming: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1.5,
    borderColor: '#48484A',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  timelineLineCovered: {
    backgroundColor: Colors.primary,
  },
  timelineLineUpcoming: {
    backgroundColor: '#38383A',
  },
  timelineContentCol: {
    flex: 1,
    paddingBottom: 12,
  },
  timelineStationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentStationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 51, 44, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 51, 44, 0.35)',
    marginLeft: 6,
  },
  currentStationPillText: {
    fontSize: 9,
    letterSpacing: 0.6,
  },
  platformBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  platformBadgeCovered: {
    backgroundColor: 'rgba(245, 51, 44, 0.12)',
    borderColor: 'rgba(245, 51, 44, 0.25)',
  },
  platformBadgeUpcoming: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
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

  /* Early Journey Notice & Modal */
  earlyNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.25)',
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  earlyModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 10,
  },
  earlyModalIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 159, 10, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  earlyModalTitle: {
    fontSize: 19,
    textAlign: 'center',
    marginBottom: 8,
  },
  earlyModalDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: Colors.appleSecondaryLabel,
    marginBottom: 16,
  },
  earlyModalSchedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 22,
  },
  earlyModalBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
