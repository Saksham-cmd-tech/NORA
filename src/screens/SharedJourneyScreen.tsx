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
  Train,
  Calendar,
  Check,
  Plus,
  RefreshCw,
  AlertCircle,
  Navigation,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { AppText } from '../components/common/AppText';
import { SharedTripData, convertSharedTripToTicket } from '../services/tripShareService';
import { getLiveTrainStatus, LiveTrainData, StationHalt } from '../services/railService';
import { NormalizedTicket } from '../types/ticket';
import { ticketRepository } from '../database/repositories/ticketRepository';

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

  // Check if this journey is already saved in SQLite wallet
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

  // Determine delay and badge styling
  const delayMinutes = liveData?.delayMinutes ?? 0;
  const isDelayed = delayMinutes > 5;
  const delayText = isDelayed
    ? `Delayed by ${delayMinutes} min`
    : liveData?.status === 'running'
    ? 'Running on time'
    : liveData?.status === 'completed'
    ? 'Arrived at Destination'
    : 'Scheduled Run';

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
        {/* Main Boarding Pass Card */}
        <View style={styles.passCard}>
          <View style={styles.passHeader}>
            <View style={styles.trainInfoCol}>
              <View style={styles.trainNumberRow}>
                <AppText variant="subheading" weight="heavy" color="primary">
                  {sharedTrip.trainNumber}
                </AppText>
                <View style={styles.typeBadge}>
                  <AppText variant="micro" weight="bold" color="dark">
                    {sharedTrip.trainType || 'SUPERFAST'}
                  </AppText>
                </View>
              </View>
              <AppText variant="caption" color="secondary" numberOfLines={1}>
                {sharedTrip.trainName || liveData?.trainName || 'Express'}
              </AppText>
            </View>

            <View style={styles.datePill}>
              <Calendar size={12} color={Colors.textSecondary} style={{ marginRight: 4 }} />
              <AppText variant="micro" color="secondary">
                {sharedTrip.dateOfJourney || 'Today'}
              </AppText>
            </View>
          </View>

          {/* Route Section */}
          <View style={styles.routeRow}>
            <View style={styles.stationBlock}>
              <AppText variant="title" weight="heavy" color="primary">
                {sharedTrip.fromStation}
              </AppText>
              <AppText variant="micro" color="secondary" numberOfLines={1}>
                {sharedTrip.fromStationName || sharedTrip.fromStation}
              </AppText>
              <AppText variant="caption" weight="bold" color="primary" style={{ marginTop: 4 }}>
                {sharedTrip.departureTime || '--:--'}
              </AppText>
            </View>

            <View style={styles.routeDividerCol}>
              <Train size={16} color={Colors.primary} />
              <View style={styles.routeLine} />
              <ArrowLeft size={12} color={Colors.textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
            </View>

            <View style={[styles.stationBlock, { alignItems: 'flex-end' }]}>
              <AppText variant="title" weight="heavy" color="primary">
                {sharedTrip.toStation}
              </AppText>
              <AppText variant="micro" color="secondary" numberOfLines={1}>
                {sharedTrip.toStationName || sharedTrip.toStation}
              </AppText>
              <AppText variant="caption" weight="bold" color="primary" style={{ marginTop: 4 }}>
                {sharedTrip.arrivalTime || '--:--'}
              </AppText>
            </View>
          </View>

          {/* Coach & Seat allocation if shared */}
          {(sharedTrip.coach || sharedTrip.seat) && (
            <View style={styles.berthDetailsRow}>
              {sharedTrip.coach && (
                <View style={styles.berthBadge}>
                  <AppText variant="micro" color="secondary">COACH</AppText>
                  <AppText variant="body" weight="heavy" color="primary">{sharedTrip.coach}</AppText>
                </View>
              )}
              {sharedTrip.seat && (
                <View style={styles.berthBadge}>
                  <AppText variant="micro" color="secondary">SEAT</AppText>
                  <AppText variant="body" weight="heavy" color="primary">{sharedTrip.seat}</AppText>
                </View>
              )}
              {sharedTrip.berthType && (
                <View style={styles.berthBadge}>
                  <AppText variant="micro" color="secondary">BERTH</AppText>
                  <AppText variant="body" weight="heavy" color="primary">{sharedTrip.berthType}</AppText>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Real-time Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusHeaderLeft}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isDelayed ? Colors.warning : Colors.success },
                ]}
              />
              <AppText variant="body" weight="bold" color="primary">
                {delayText}
              </AppText>
            </View>

            {liveData?.nextHalt?.platform && (
              <View style={styles.platformBadge}>
                <AppText variant="micro" weight="bold" color="primary">
                  PF {liveData.nextHalt.platform}
                </AppText>
              </View>
            )}
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
              {/* Current / Next Location */}
              <View style={styles.locationContainer}>
                <View style={styles.locationIconCircle}>
                  <Navigation size={16} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="micro" color="secondary">
                    {liveData?.nextHalt ? 'NEXT UPCOMING HALT' : 'CURRENT POSITION'}
                  </AppText>
                  <AppText variant="body" weight="bold" color="primary">
                    {liveData?.nextHalt?.stationName ||
                      liveData?.currentLocation?.stationName ||
                      liveData?.status ||
                      'En route'}
                  </AppText>
                </View>
              </View>

              {liveData?.fullUpdate ? (
                <View style={styles.fullUpdateBox}>
                  <AppText variant="micro" color="secondary" style={styles.fullUpdateText}>
                    {liveData.fullUpdate}
                  </AppText>
                </View>
              ) : null}

              {/* Station Halts List Preview */}
              {Array.isArray(liveData?.route) && liveData.route.length > 0 && (
                <View style={styles.timelineSection}>
                  <AppText variant="caption" weight="bold" color="secondary" style={styles.timelineTitle}>
                    SCHEDULED HALTS & TIMINGS
                  </AppText>

                  {liveData.route.slice(0, 8).map((stn: StationHalt, idx: number) => {
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
                          {idx < Math.min(liveData.route.length, 8) - 1 && <View style={styles.timelineConnector} />}
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

      {/* Persistent Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {isSaved ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => savedTicket && onViewInWallet && onViewInWallet(savedTicket)}
            style={styles.savedButton}
          >
            <Check size={18} color={Colors.success} style={{ marginRight: 8 }} />
            <AppText variant="body" weight="bold" color="success">
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
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.success,
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
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  passCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 18,
    marginBottom: 16,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  trainInfoCol: {
    flex: 1,
  },
  trainNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  typeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  stationBlock: {
    flex: 1,
  },
  routeDividerCol: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  routeLine: {
    width: 28,
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: 4,
  },
  berthDetailsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  berthBadge: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 18,
    marginBottom: 16,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    borderRadius: 8,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  locationIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fullUpdateBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  fullUpdateText: {
    lineHeight: 16,
  },
  timelineSection: {
    marginTop: 8,
  },
  timelineTitle: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timelineLeftCol: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  timelineDotPassed: {
    backgroundColor: Colors.textMuted,
  },
  timelineDotActive: {
    backgroundColor: Colors.primary,
  },
  timelineConnector: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderSubtle,
    marginTop: 2,
  },
  timelineStationDetails: {
    flex: 1,
    marginLeft: 10,
  },
  privacyNoteBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  savedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: 14,
    paddingVertical: 14,
  },
});
