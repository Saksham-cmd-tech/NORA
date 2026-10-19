import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {
  ArrowLeft,
  Share2,
  Calendar,
  Train,
  ShieldCheck,
  Check,
  ChevronRight,
  Radio,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { NormalizedTicket } from '../types/ticket';
import { AppText } from '../components/common/AppText';
import { TicketDetailsPass } from '../components/ticket/TicketDetailsPass';
import { NoraModal } from '../components/common/NoraModal';
import { getTrainName } from '../utils/stationLookup';
import { getDetailedDateString, parseTicketJourneyDate } from '../utils/dateUtils';
import { ShareTicketModal } from '../components/ticket/ShareTicketModal';
import { buildShareTicketData, ShareTicketData } from '../services/shareTicketService';

interface TicketDetailsScreenProps {
  ticket: NormalizedTicket;
  onBack: () => void;
  onOpenSettings?: () => void;
  onOpenTrainStatus?: (ticket: NormalizedTicket) => void;
  initialShareModalVisible?: boolean;
}

export const TicketDetailsScreen: React.FC<TicketDetailsScreenProps> = ({
  ticket,
  onBack,
  onOpenTrainStatus,
  initialShareModalVisible,
}) => {
  const [isAddedToCalendar, setIsAddedToCalendar] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(initialShareModalVisible ?? false);
  const [shareData, setShareData] = useState<ShareTicketData | null>(() =>
    initialShareModalVisible ? buildShareTicketData(ticket) : null
  );

  React.useEffect(() => {
    if (initialShareModalVisible) {
      setShareData(buildShareTicketData(ticket));
      setShareModalVisible(true);
    }
  }, [initialShareModalVisible, ticket]);

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    iconVariant?: 'orange' | 'green';
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
  } | null>(null);

  const effectiveTrainName =
    ticket.train.name &&
    ticket.train.name.trim().length > 0 &&
    !/^\d+$/.test(ticket.train.name.trim()) &&
    ticket.train.name.trim() !== ticket.train.number
      ? ticket.train.name
      : getTrainName(ticket.train.number) || 'Indian Railways Superfast';

  const trainLower = effectiveTrainName.toLowerCase();
  const trainCategory = trainLower.includes('vande bharat')
    ? 'Vande Bharat Express'
    : trainLower.includes('rajdhani')
    ? 'Rajdhani Express'
    : trainLower.includes('shatabdi')
    ? 'Shatabdi Express'
    : trainLower.includes('humsafar')
    ? 'Humsafar Express'
    : trainLower.includes('garib rath')
    ? 'Garib Rath Express'
    : 'Superfast Express';

  const detailedDate = getDetailedDateString(ticket.journey.date);

  const handleShare = () => {
    const data = buildShareTicketData(ticket);
    setShareData(data);
    setShareModalVisible(true);
  };

  const handleCalendar = () => {
    const parsedDate = parseTicketJourneyDate(ticket.journey.date);
    let dateQuery = '';
    if (parsedDate) {
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const d = String(parsedDate.getDate()).padStart(2, '0');
      dateQuery = `&dates=${y}${m}${d}/${y}${m}${d}`;
    }

    const title = encodeURIComponent(
      `🚆 Train ${ticket.train.number}: ${ticket.journey.from} to ${ticket.journey.to}`
    );
    const details = encodeURIComponent(
      `Train: ${ticket.train.number} · ${effectiveTrainName}\n` +
        `Coach: ${ticket.passenger.coach || '-'} · Seat: ${ticket.passenger.seat || '-'}\n` +
        `PNR: ${ticket.pnr}\n` +
        `Passenger: ${ticket.passenger.name || '-'}\n` +
        `Departure: ${ticket.journey.departure || 'Scheduled Time'}`
    );
    const location = encodeURIComponent(
      `${ticket.journey.fromName || ticket.journey.from} Railway Station`
    );
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}${dateQuery}`;

    setModalConfig({
      visible: true,
      title: 'Add to Calendar',
      subtitle: `Sync journey for Train ${ticket.train.number} departing on ${
        detailedDate || ticket.journey.date
      } to your Google Calendar.`,
      iconVariant: 'orange',
      primaryButtonText: 'OPEN CALENDAR',
      onPrimaryPress: async () => {
        setIsAddedToCalendar(true);
        setModalConfig(null);
        try {
          await Linking.openURL(calendarUrl);
        } catch (e) {
          console.log('Error opening calendar:', e);
        }
      },
    });
  };

  const isConfirmed = ticket.status === 'CONFIRMED' || !ticket.status;

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Apple-style Top Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={Colors.appleLabel} />
        </TouchableOpacity>

        <AppText variant="bodyLg" weight="bold" color="primary">
          Ticket Details
        </AppText>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleShare}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Share2 size={18} color={Colors.appleLabel} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Boarding Pass Card */}
        <TicketDetailsPass
          ticket={ticket}
          onCopyPNR={() => {
            setModalConfig({
              visible: true,
              title: 'PNR Copied',
              subtitle: `PNR reference ${ticket.pnr} copied to clipboard.`,
              iconVariant: 'orange',
              primaryButtonText: 'OK',
              onPrimaryPress: () => setModalConfig(null),
            });
          }}
        />

        {/* Action Row: Apple Inset Action Cards */}
        <View style={styles.actionsRow}>
          {/* Live Train Status */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onOpenTrainStatus?.(ticket)}
            style={styles.actionCard}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
              <Train size={18} color={Colors.appleBlue} />
            </View>
            <AppText variant="caption" weight="bold" color="primary" style={styles.actionTitle}>
              Live Status
            </AppText>
            <AppText variant="micro" color="secondary">
              Platform & Run
            </AppText>
          </TouchableOpacity>

          {/* Share Pass */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleShare}
            style={styles.actionCard}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
              <Share2 size={18} color={Colors.appleGreen} />
            </View>
            <AppText variant="caption" weight="bold" color="primary" style={styles.actionTitle}>
              Share Pass
            </AppText>
            <AppText variant="micro" color="secondary">
              Export Card
            </AppText>
          </TouchableOpacity>

          {/* Add to Calendar */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCalendar}
            style={styles.actionCard}
          >
            <View
              style={[
                styles.actionIconCircle,
                {
                  backgroundColor: isAddedToCalendar
                    ? 'rgba(48, 209, 88, 0.15)'
                    : 'rgba(255, 159, 10, 0.15)',
                },
              ]}
            >
              {isAddedToCalendar ? (
                <Check size={18} color={Colors.appleGreen} strokeWidth={2.4} />
              ) : (
                <Calendar size={18} color={Colors.appleOrange} />
              )}
            </View>
            <AppText
              variant="caption"
              weight="bold"
              color={isAddedToCalendar ? 'success' : 'primary'}
              style={styles.actionTitle}
            >
              Calendar
            </AppText>
            <AppText variant="micro" color={isAddedToCalendar ? 'success' : 'secondary'}>
              {isAddedToCalendar ? 'Synced ✓' : 'Add Event'}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Section 1: Journey & Schedule */}
        <AppText
          variant="micro"
          weight="bold"
          color="secondary"
          uppercase
          letterSpacing={0.8}
          style={styles.groupHeader}
        >
          JOURNEY SPECIFICATIONS
        </AppText>

        <View style={styles.groupCard}>
          {/* Train Service */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              Train Service
            </AppText>
            <AppText variant="body" weight="bold" color="primary" style={styles.rowValue} numberOfLines={1}>
              {ticket.train.number ? `${ticket.train.number} · ${effectiveTrainName}` : effectiveTrainName}
            </AppText>
          </View>

          <View style={styles.separator} />

          {/* Service Category */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              Service Type
            </AppText>
            <AppText variant="body" weight="medium" color="primary" style={styles.rowValue}>
              {trainCategory}
            </AppText>
          </View>

          <View style={styles.separator} />

          {/* Boarding Station */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              Boarding From
            </AppText>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText variant="body" weight="bold" color="primary">
                {ticket.journey.fromName || ticket.journey.from} ({ticket.journey.from})
              </AppText>
              {ticket.journey.departure ? (
                <AppText variant="micro" color="orange" weight="bold" style={{ marginTop: 2 }}>
                  Departs at {ticket.journey.departure}
                </AppText>
              ) : null}
            </View>
          </View>

          <View style={styles.separator} />

          {/* Destination */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              Destination
            </AppText>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText variant="body" weight="bold" color="primary">
                {ticket.journey.toName || ticket.journey.to} ({ticket.journey.to})
              </AppText>
              {ticket.journey.arrival ? (
                <AppText variant="micro" color="secondary" weight="medium" style={{ marginTop: 2 }}>
                  Arrives at {ticket.journey.arrival}
                </AppText>
              ) : null}
            </View>
          </View>

          <View style={styles.separator} />

          {/* Journey Duration */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              Duration
            </AppText>
            <AppText variant="body" weight="medium" color="primary" style={styles.rowValue}>
              {ticket.journey.duration ? `${ticket.journey.duration} · Direct Run` : 'Direct Scheduled Run'}
            </AppText>
          </View>

          <View style={styles.separator} />

          {/* Date */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              Journey Date
            </AppText>
            <AppText variant="body" weight="medium" color="primary" style={styles.rowValue}>
              {detailedDate || ticket.journey.date}
            </AppText>
          </View>
        </View>

        {/* Section 2: Reservation & Booking */}
        <AppText
          variant="micro"
          weight="bold"
          color="secondary"
          uppercase
          letterSpacing={0.8}
          style={styles.groupHeader}
        >
          RESERVATION & FARE
        </AppText>

        <View style={styles.groupCard}>
          {/* PNR */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              PNR Number
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText variant="body" weight="heavy" color="orange" letterSpacing={0.8}>
                {ticket.pnr}
              </AppText>
              <View style={styles.verifiedTag}>
                <AppText variant="micro" weight="bold" color="success">
                  VERIFIED
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Passenger Name */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              Passenger
            </AppText>
            <AppText variant="body" weight="bold" color="primary" style={styles.rowValue} numberOfLines={1}>
              {ticket.passenger.name && ticket.passenger.name !== '-' ? ticket.passenger.name : 'Passenger'}
            </AppText>
          </View>

          <View style={styles.separator} />

          {/* Booking Status */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              Booking Status
            </AppText>
            <View style={[styles.statusPill, isConfirmed ? styles.statusPillGreen : styles.statusPillOrange]}>
              <View style={[styles.statusDot, isConfirmed ? styles.statusDotGreen : styles.statusDotOrange]} />
              <AppText
                variant="micro"
                weight="bold"
                color={isConfirmed ? 'success' : 'orange'}
                uppercase
                letterSpacing={0.6}
              >
                {ticket.passenger.bookingStatus || ticket.status || 'CONFIRMED'}
              </AppText>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Coach & Seat */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              Coach & Seat
            </AppText>
            <AppText variant="body" weight="bold" color="primary" style={styles.rowValue}>
              {ticket.passenger.coach
                ? `Coach ${ticket.passenger.coach} · Seat ${ticket.passenger.seat || '-'}`
                : ticket.passenger.seat || 'Confirmed'}
            </AppText>
          </View>

          <View style={styles.separator} />

          {/* Travel Class */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              Travel Class
            </AppText>
            <AppText variant="body" weight="medium" color="primary" style={styles.rowValue}>
              {ticket.passenger.className || `${ticket.passenger.class || 'CC'} Class`}
            </AppText>
          </View>

          <View style={styles.separator} />

          {/* Total Fare */}
          <View style={styles.detailRow}>
            <AppText variant="body" color="secondary" style={styles.rowLabel}>
              Total Fare Paid
            </AppText>
            <AppText variant="bodyLg" weight="heavy" color="orange" style={styles.rowValue}>
              {ticket.fare?.total ? `₹${ticket.fare.total.toLocaleString('en-IN')}` : 'Fully Paid'}
            </AppText>
          </View>
        </View>

        {/* Section 3: Traveler Notice / Offline Pass Assurance */}
        <View style={styles.noticeCard}>
          <ShieldCheck size={20} color={Colors.appleGreen} style={styles.noticeIcon} />
          <View style={styles.noticeContent}>
            <AppText variant="caption" weight="bold" color="primary">
              Encrypted Offline Pass
            </AppText>
            <AppText variant="tiny" color="secondary" style={styles.noticeDesc}>
              This boarding pass is stored 100% offline on your device. Present this pass along with an original Government Photo ID (Aadhaar, Driving License, Passport) during ticket inspection by the TTE.
            </AppText>
          </View>
        </View>
      </ScrollView>

      {/* Modal */}
      {modalConfig && (
        <NoraModal
          visible={modalConfig.visible}
          title={modalConfig.title}
          subtitle={modalConfig.subtitle}
          iconVariant={modalConfig.iconVariant}
          primaryButtonText={modalConfig.primaryButtonText}
          onPrimaryPress={modalConfig.onPrimaryPress || (() => setModalConfig(null))}
          onClose={() => setModalConfig(null)}
        />
      )}

      {/* Share Pass Modal */}
      <ShareTicketModal
        visible={shareModalVisible}
        data={shareData}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.appleSeparator,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.appleGroupedBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 10,
    paddingBottom: 40,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    marginBottom: 2,
  },
  groupHeader: {
    marginLeft: 12,
    marginBottom: 6,
    marginTop: 20,
  },
  groupCard: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowLabel: {
    width: 120,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.appleSeparator,
    marginLeft: 16,
  },
  verifiedTag: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
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
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  noticeIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  noticeContent: {
    flex: 1,
  },
  noticeDesc: {
    marginTop: 4,
    lineHeight: 18,
  },
});
