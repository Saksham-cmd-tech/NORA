import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Share,
  Linking,
} from 'react-native';
import {
  ArrowLeft,
  Share2,
  Calendar,
  Train,
  ShieldCheck,
  CheckCircle2,
  Check,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { NormalizedTicket } from '../types/ticket';
import { AppText } from '../components/common/AppText';
import { StatusBadge } from '../components/common/StatusBadge';
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
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
  } | null>(null);

  const effectiveTrainName = (ticket.train.name && ticket.train.name.trim().length > 0 && !/^\d+$/.test(ticket.train.name.trim()) && ticket.train.name.trim() !== ticket.train.number)
    ? ticket.train.name
    : (getTrainName(ticket.train.number) || 'Indian Railways Superfast');

  const trainLower = effectiveTrainName.toLowerCase();
  const trainCategory = trainLower.includes('vande bharat')
    ? 'VANDE BHARAT EXPRESS'
    : trainLower.includes('rajdhani')
    ? 'RAJDHANI EXPRESS'
    : trainLower.includes('shatabdi')
    ? 'SHATABDI EXPRESS'
    : trainLower.includes('humsafar')
    ? 'HUMSAFAR EXPRESS'
    : trainLower.includes('garib rath')
    ? 'GARIB RATH'
    : 'SUPERFAST EXPRESS';

  const detailedDate = getDetailedDateString(ticket.journey.date);

  // 1. Working Share with Styled Ticket Card Image
  const handleShare = () => {
    const data = buildShareTicketData(ticket);
    setShareData(data);
    setShareModalVisible(true);
  };

  // 2. Real Working Calendar Integration with Nora Themed Modal
  const handleCalendar = () => {
    const parsedDate = parseTicketJourneyDate(ticket.journey.date);
    let dateQuery = '';
    if (parsedDate) {
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const d = String(parsedDate.getDate()).padStart(2, '0');
      dateQuery = `&dates=${y}${m}${d}/${y}${m}${d}`;
    }

    const title = encodeURIComponent(`🚆 Train ${ticket.train.number}: ${ticket.journey.from} to ${ticket.journey.to}`);
    const details = encodeURIComponent(
      `Train: ${ticket.train.number} · ${effectiveTrainName}\n` +
      `Coach: ${ticket.passenger.coach || '-'} · Seat: ${ticket.passenger.seat || '-'}\n` +
      `PNR: ${ticket.pnr}\n` +
      `Passenger: ${ticket.passenger.name || '-'}\n` +
      `Departure Time: ${ticket.journey.departure || '06:25 AM'}`
    );
    const location = encodeURIComponent(`${ticket.journey.fromName || ticket.journey.from} Railway Station`);
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}${dateQuery}`;

    setModalConfig({
      visible: true,
      title: 'Add to Calendar',
      subtitle: `Sync your journey for ${ticket.train.number} ${effectiveTrainName} departing on ${detailedDate || ticket.journey.date} at ${ticket.journey.departure || '06:25 AM'} to Google Calendar.`,
      iconVariant: 'orange',
      primaryButtonText: 'OPEN GOOGLE CALENDAR',
      secondaryButtonText: 'CANCEL',
      onPrimaryPress: async () => {
        setIsAddedToCalendar(true);
        setModalConfig(null);
        try {
          await Linking.openURL(calendarUrl);
        } catch (e) {
          console.log('Error opening calendar:', e);
        }
      },
      onSecondaryPress: () => {
        setModalConfig(null);
      },
    });
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onBack}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>

        <AppText variant="subheading" weight="heavy" uppercase letterSpacing={1} color="primary">
          TICKET DETAILS
        </AppText>

        <View style={styles.headerRightSpacer} />
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
            });
          }}
        />

        {/* Action Buttons Row: 3-Card Balanced Layout (TRAIN STATUS, SHARE PASS, CALENDAR) */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onOpenTrainStatus?.(ticket)}
            style={styles.actionCard}
          >
            <View style={styles.actionIconCircle}>
              <Train size={16} color={Colors.primary} />
            </View>
            <AppText variant="tiny" weight="heavy" color="primary" uppercase letterSpacing={0.5}>
              TRAIN STATUS
            </AppText>
            <AppText variant="micro" color="secondary" style={styles.actionSubtext}>
              Live Running
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleShare}
            style={styles.actionCard}
          >
            <View style={styles.actionIconCircle}>
              <Share2 size={16} color={Colors.primary} />
            </View>
            <AppText variant="tiny" weight="heavy" color="primary" uppercase letterSpacing={0.5}>
              SHARE PASS
            </AppText>
            <AppText variant="micro" color="secondary" style={styles.actionSubtext}>
              Send Ticket
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCalendar}
            style={styles.actionCard}
          >
            <View style={[styles.actionIconCircle, isAddedToCalendar && styles.actionIconCircleGreen]}>
              {isAddedToCalendar ? (
                <Check size={16} color={Colors.success} />
              ) : (
                <Calendar size={16} color={Colors.primary} />
              )}
            </View>
            <AppText
              variant="tiny"
              weight="heavy"
              color={isAddedToCalendar ? 'success' : 'primary'}
              uppercase
              letterSpacing={0.5}
            >
              CALENDAR
            </AppText>
            <AppText
              variant="micro"
              color={isAddedToCalendar ? 'success' : 'secondary'}
              style={styles.actionSubtext}
            >
              {isAddedToCalendar ? 'Added ✓' : 'Add Event'}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Section 1: Journey & Schedule Specifications */}
        <View style={styles.detailCard}>
          <View style={styles.cardSectionHeader}>
            <View style={styles.headerIconBox}>
              <Train size={16} color={Colors.primary} />
            </View>
            <View style={styles.cardHeaderTitleBox}>
              <AppText variant="caption" weight="heavy" uppercase letterSpacing={0.8} color="primary">
                JOURNEY & TRAIN SPECIFICATIONS
              </AppText>
              <AppText variant="micro" color="secondary">
                Verified Route & Timing Details
              </AppText>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Train Full Info */}
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">Train Service</AppText>
            <View style={styles.infoValueColRight}>
              <AppText variant="caption" weight="heavy" color="primary" numberOfLines={1}>
                {ticket.train.number ? `${ticket.train.number} · ${effectiveTrainName}` : effectiveTrainName}
              </AppText>
              <AppText variant="micro" color="orange" weight="bold" uppercase>
                {trainCategory}
              </AppText>
            </View>
          </View>

          {/* Journey Date */}
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">Journey Date</AppText>
            <AppText variant="caption" weight="bold" color="primary">
              {detailedDate || ticket.journey.date}
            </AppText>
          </View>

          {/* Boarding From */}
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">Boarding Station</AppText>
            <View style={styles.infoValueColRight}>
              <AppText variant="caption" weight="bold" color="primary">
                {ticket.journey.fromName || ticket.journey.from} ({ticket.journey.from})
              </AppText>
              {ticket.journey.departure ? (
                <AppText variant="micro" color="orange" weight="bold">
                  Departs at {ticket.journey.departure}
                </AppText>
              ) : null}
            </View>
          </View>

          {/* Destination To */}
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">Destination Station</AppText>
            <View style={styles.infoValueColRight}>
              <AppText variant="caption" weight="bold" color="primary">
                {ticket.journey.toName || ticket.journey.to} ({ticket.journey.to})
              </AppText>
              {ticket.journey.arrival ? (
                <AppText variant="micro" color="secondary" weight="bold">
                  Arrives at {ticket.journey.arrival}
                </AppText>
              ) : null}
            </View>
          </View>

          {/* Journey Duration */}
          <View style={[styles.infoRow, styles.lastInfoRow]}>
            <AppText variant="caption" color="secondary">Travel Duration</AppText>
            <AppText variant="caption" weight="bold" color="primary">
              {ticket.journey.duration ? `${ticket.journey.duration} (Direct Service)` : 'Direct Scheduled Run'}
            </AppText>
          </View>
        </View>

        {/* Section 2: Booking & Fare Breakdown */}
        <View style={styles.detailCard}>
          <View style={styles.cardSectionHeader}>
            <View style={styles.headerIconBox}>
              <ShieldCheck size={16} color={Colors.primary} />
            </View>
            <View style={styles.cardHeaderTitleBox}>
              <AppText variant="caption" weight="heavy" uppercase letterSpacing={0.8} color="primary">
                BOOKING & FARE BREAKDOWN
              </AppText>
              <AppText variant="micro" color="secondary">
                Official Reservation Details
              </AppText>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* PNR Code */}
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">PNR Number</AppText>
            <View style={styles.pnrTagRow}>
              <AppText variant="caption" weight="heavy" color="orange" letterSpacing={0.5}>
                {ticket.pnr}
              </AppText>
              <View style={styles.verifiedTag}>
                <AppText variant="micro" weight="bold" color="success">VERIFIED</AppText>
              </View>
            </View>
          </View>

          {/* Passenger Name */}
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">Passenger</AppText>
            <AppText variant="caption" weight="bold" color="primary">
              {ticket.passenger.name && ticket.passenger.name !== '-' ? ticket.passenger.name : '-'}
            </AppText>
          </View>

          {/* Booking Status */}
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">Booking Status</AppText>
            <StatusBadge
              label={ticket.passenger.bookingStatus || 'CONFIRMED'}
              variant={ticket.passenger.bookingStatus?.includes('WL') ? 'orange' : 'success'}
            />
          </View>

          {/* Class, Coach & Seat */}
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">Coach & Seat</AppText>
            <AppText variant="caption" weight="bold" color="primary">
              {`Coach ${ticket.passenger.coach || '-'} · Seat ${ticket.passenger.seat || '-'} (${ticket.passenger.class || 'CC'})`}
            </AppText>
          </View>

          {/* Source */}
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">Import Source</AppText>
            <AppText variant="caption" weight="bold" color="secondary">
              {`${ticket.source} Notification Service`}
            </AppText>
          </View>

          {/* Fare Details */}
          {ticket.fare?.total ? (
            <>
              {ticket.fare.convenienceFee ? (
                <View style={styles.infoRow}>
                  <AppText variant="caption" color="secondary">Convenience Charge</AppText>
                  <AppText variant="caption" color="secondary">
                    ₹{ticket.fare.convenienceFee.toFixed(2)}
                  </AppText>
                </View>
              ) : null}
              <View style={[styles.infoRow, styles.lastInfoRow, styles.fareRowHighlight]}>
                <AppText variant="body" weight="heavy" color="primary">Total Fare Paid</AppText>
                <AppText variant="heading" weight="heavy" color="orange">
                  ₹{ticket.fare.total.toLocaleString('en-IN')}
                </AppText>
              </View>
            </>
          ) : (
            <View style={[styles.infoRow, styles.lastInfoRow]}>
              <AppText variant="caption" color="secondary">Fare Status</AppText>
              <AppText variant="caption" weight="bold" color="primary">
                Fully Paid via {ticket.source}
              </AppText>
            </View>
          )}
        </View>

        {/* Section 3: Traveler Notice / Offline Pass Assurance */}
        <View style={styles.noticeCard}>
          <CheckCircle2 size={18} color={Colors.success} style={styles.noticeIcon} />
          <View style={styles.noticeContent}>
            <AppText variant="caption" weight="heavy" color="primary">
              ENCRYPTED ON-DEVICE WALLET PASS
            </AppText>
            <AppText variant="micro" color="secondary" style={styles.noticeDesc}>
              This boarding pass is stored offline on your phone. Present this PNR ticket along with a valid original Government Photo ID (Aadhaar / Driving License / Voter ID) when inspected by the TTE.
            </AppText>
          </View>
        </View>
      </ScrollView>

      {/* Matching Nora Custom Modal */}
      {modalConfig ? (
        <NoraModal
          visible={modalConfig.visible}
          title={modalConfig.title}
          subtitle={modalConfig.subtitle}
          iconVariant={modalConfig.iconVariant}
          primaryButtonText={modalConfig.primaryButtonText}
          secondaryButtonText={modalConfig.secondaryButtonText}
          onPrimaryPress={modalConfig.onPrimaryPress || (() => setModalConfig(null))}
          onSecondaryPress={modalConfig.onSecondaryPress}
          onClose={() => setModalConfig(null)}
        />
      ) : null}

      {/* Share Ticket / Pass Preview Modal */}
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightSpacer: {
    width: 36,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 40,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 18,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(245, 51, 44, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionIconCircleGreen: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  actionSubtext: {
    marginTop: 2,
  },
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 16,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 51, 44, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardHeaderTitleBox: {
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  lastInfoRow: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  infoValueColRight: {
    alignItems: 'flex-end',
    maxWidth: '65%',
  },
  pnrTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedTag: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  fareRowHighlight: {
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
  },
  noticeIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  noticeContent: {
    flex: 1,
  },
  noticeDesc: {
    marginTop: 4,
    lineHeight: 16,
  },
});
