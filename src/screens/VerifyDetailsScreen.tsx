import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Switch,
} from 'react-native';
import {
  ArrowLeft,
  Sparkles,
  Calendar,
  Clock,
  User,
  Wallet,
  Check,
  ShieldCheck,
  Bell,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { NormalizedTicket } from '../types/ticket';
import { AppText } from '../components/common/AppText';
import { StatusBadge } from '../components/common/StatusBadge';
import { SectionHeader } from '../components/common/SectionHeader';
import { AppButton } from '../components/common/AppButton';
import { ticketRepository } from '../database/repositories/ticketRepository';

interface VerifyDetailsScreenProps {
  initialTicket: NormalizedTicket;
  onBack: () => void;
  onSaveToWallet: (ticket: NormalizedTicket) => void;
}

const TRAVEL_CLASSES = [
  { code: 'CC', label: 'AC Chair' },
  { code: 'EC', label: 'Exec Chair' },
  { code: '1A', label: 'First AC' },
  { code: '2A', label: '2-Tier AC' },
  { code: '3A', label: '3-Tier AC' },
  { code: 'SL', label: 'Sleeper' },
];

export const VerifyDetailsScreen: React.FC<VerifyDetailsScreenProps> = ({
  initialTicket,
  onBack,
  onSaveToWallet,
}) => {
  const [passengerName, setPassengerName] = useState(
    initialTicket.passenger?.name && initialTicket.passenger.name !== '-' ? initialTicket.passenger.name : ''
  );
  const [trainName, setTrainName] = useState(
    initialTicket.train.name
      ? `${initialTicket.train.number} · ${initialTicket.train.name}`
      : `${initialTicket.train.number}`
  );
  const [coach, setCoach] = useState(initialTicket.passenger.coach || '');
  const [seat, setSeat] = useState(initialTicket.passenger.seat || '');
  const [selectedClass, setSelectedClass] = useState(initialTicket.passenger.class || 'CC');
  const [tripAlerts, setTripAlerts] = useState(true);
  const [isExistingTicket, setIsExistingTicket] = useState(false);

  useEffect(() => {
    const checkDuplicate = async () => {
      if (initialTicket.pnr) {
        const exists = await ticketRepository.isDuplicatePNR(initialTicket.pnr);
        setIsExistingTicket(exists);
      }
    };
    checkDuplicate();
  }, [initialTicket.pnr]);

  const handleConfirmAndSave = () => {
    const cleanTrainName = trainName.replace(/^\d+\s*·\s*/, '').trim();
    const updatedTicket: NormalizedTicket = {
      ...initialTicket,
      train: {
        ...initialTicket.train,
        name: cleanTrainName || initialTicket.train.name || 'Express',
      },
      passenger: {
        ...initialTicket.passenger,
        name: passengerName.trim() || 'PASSENGER',
        coach: coach.trim().toUpperCase(),
        seat: seat.trim(),
        class: selectedClass,
        className: `${selectedClass} Class`,
      },
      updatedAt: new Date().toISOString(),
    };

    onSaveToWallet(updatedTicket);
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
          VERIFY DETAILS
        </AppText>

        <StatusBadge label="STEP 2 OF 2" variant="orange" dot />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Detection Source Banner */}
        <View style={styles.detectionBanner}>
          <View style={styles.detectionBannerLeft}>
            <Sparkles size={14} color={Colors.primary} style={{ marginRight: 6 }} />
            <AppText variant="micro" weight="bold" color="orange" uppercase letterSpacing={0.5}>
              {`DETECTED FROM ${initialTicket.source}`}
            </AppText>
          </View>
          <StatusBadge
            label={`PNR #${initialTicket.pnr}`}
            variant="success"
          />
        </View>

        {/* Notice if ticket already exists in wallet */}
        {isExistingTicket && (
          <View style={styles.existingTicketBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <ShieldCheck size={14} color={Colors.warning} style={{ marginRight: 6 }} />
              <AppText variant="tiny" weight="bold" color="warning" uppercase letterSpacing={0.5}>
                ALREADY IN WALLET · UPDATE MODE
              </AppText>
            </View>
            <AppText variant="micro" color="secondary">
              Ticket PNR #{initialTicket.pnr} already exists in your wallet. Confirming will update the existing pass without creating a duplicate.
            </AppText>
          </View>
        )}

        {/* Route Summary Card */}
        <View style={styles.routeSummaryCard}>
          <View style={styles.routeCardTop}>
            <StatusBadge label={initialTicket.train.type || 'EXPRESS'} variant="dark" />
            <StatusBadge label={`TRAIN ${initialTicket.train.number}`} variant="orange" />
          </View>

          <View style={styles.routeRow}>
            <View style={styles.routeColLeft}>
              <AppText variant="heading" weight="heavy" color="primary">
                {initialTicket.journey.from}
              </AppText>
              {initialTicket.journey.fromName && (
                <AppText variant="tiny" color="secondary" numberOfLines={1}>
                  {initialTicket.journey.fromName}
                </AppText>
              )}
            </View>

            <View style={styles.routeDurationCenter}>
              {initialTicket.journey.departure && (
                <AppText variant="micro" weight="bold" color="secondary">
                  {initialTicket.journey.departure}
                </AppText>
              )}
              <AppText variant="caption" color="orange">
                →
              </AppText>
            </View>

            <View style={styles.routeColRight}>
              <AppText variant="heading" weight="heavy" color="primary">
                {initialTicket.journey.to}
              </AppText>
              {initialTicket.journey.toName && (
                <AppText variant="tiny" color="secondary" numberOfLines={1}>
                  {initialTicket.journey.toName}
                </AppText>
              )}
            </View>
          </View>

          <View style={styles.routeCardBottom}>
            <View style={styles.metaItem}>
              <Calendar size={13} color={Colors.textSecondary} style={{ marginRight: 5 }} />
              <AppText variant="tiny" weight="bold" color="primary">
                {initialTicket.journey.date}
              </AppText>
            </View>
            {initialTicket.journey.departure && (
              <View style={styles.metaItem}>
                <Clock size={13} color={Colors.textSecondary} style={{ marginRight: 5 }} />
                <AppText variant="tiny" weight="bold" color="primary">
                  {initialTicket.journey.departure}
                </AppText>
              </View>
            )}
          </View>
        </View>

        {/* ================= SECTION: PASSENGER & BOOKING ================= */}
        <SectionHeader title="PASSENGER & BOOKING" />

        <View style={styles.inputGroup}>
          <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
            PASSENGER NAME
          </AppText>
          <View style={styles.textInputBox}>
            <User size={16} color={Colors.textSecondary} style={{ marginRight: 10 }} />
            <TextInput
              value={passengerName}
              onChangeText={setPassengerName}
              placeholder="Passenger Name"
              placeholderTextColor={Colors.textMuted}
              style={styles.textInput}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
            TRAIN NUMBER & NAME
          </AppText>
          <View style={styles.textInputBox}>
            <TextInput
              value={trainName}
              onChangeText={setTrainName}
              placeholder="e.g. 26101 Ajni Vande Bharat"
              placeholderTextColor={Colors.textMuted}
              style={styles.textInput}
            />
          </View>
        </View>

        {/* ================= SECTION: TRAVEL CLASS ================= */}
        <SectionHeader
          title="TRAVEL CLASS"
          rightElement={
            <AppText variant="micro" color="orange" weight="bold">
              {selectedClass}
            </AppText>
          }
        />

        <View style={styles.classGrid}>
          {TRAVEL_CLASSES.map((cls) => {
            const isSelected = selectedClass === cls.code;
            return (
              <TouchableOpacity
                key={cls.code}
                activeOpacity={0.8}
                onPress={() => setSelectedClass(cls.code)}
                style={[
                  styles.classCard,
                  isSelected && styles.classCardSelected,
                ]}
              >
                {isSelected && (
                  <View style={styles.checkCorner}>
                    <Check size={10} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
                <AppText
                  variant="caption"
                  weight="bold"
                  color={isSelected ? 'white' : 'primary'}
                >
                  {cls.code}
                </AppText>
                <AppText
                  variant="micro"
                  color={isSelected ? 'white' : 'muted'}
                  style={{ marginTop: 2 }}
                >
                  {cls.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================= SECTION: COACH & SEAT ================= */}
        <SectionHeader title="COACH & SEAT ALLOCATION" />

        <View style={styles.coachSeatRow}>
          <View style={styles.coachCol}>
            <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
              COACH
            </AppText>
            <TextInput
              value={coach}
              onChangeText={setCoach}
              placeholder="e.g. C5"
              placeholderTextColor={Colors.textMuted}
              style={styles.coachSeatInput}
            />
          </View>

          <View style={styles.coachColSpacing} />

          <View style={styles.coachCol}>
            <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
              SEAT NUMBER
            </AppText>
            <TextInput
              value={seat}
              onChangeText={setSeat}
              keyboardType="number-pad"
              placeholder="e.g. 64"
              placeholderTextColor={Colors.textMuted}
              style={styles.coachSeatInput}
            />
          </View>
        </View>

        {/* ================= SECTION: FARE BREAKDOWN ================= */}
        {initialTicket.fare?.total && (
          <View>
            <SectionHeader title="FARE BREAKDOWN" />
            <View style={styles.fareCard}>
              <View style={styles.fareRow}>
                <AppText variant="caption" color="secondary">
                  Base Ticket Fare
                </AppText>
                <AppText variant="caption" weight="bold" color="primary">
                  {`₹${initialTicket.fare.base || initialTicket.fare.total}`}
                </AppText>
              </View>

              {initialTicket.fare.convenienceFee !== undefined && (
                <View style={[styles.fareRow, { marginTop: 6 }]}>
                  <AppText variant="caption" color="secondary">
                    IRCTC Convenience Fee
                  </AppText>
                  <AppText variant="caption" color="secondary">
                    {`₹${initialTicket.fare.convenienceFee}`}
                  </AppText>
                </View>
              )}

              <View style={styles.fareDivider} />

              <View style={styles.fareRow}>
                <AppText variant="body" weight="heavy" color="primary">
                  Total Fare Paid
                </AppText>
                <AppText variant="title" weight="heavy" color="orange">
                  {`₹${initialTicket.fare.total.toLocaleString('en-IN')}`}
                </AppText>
              </View>
            </View>
          </View>
        )}

        {/* Travel Notifications Toggle */}
        <View style={styles.alertsCard}>
          <View style={styles.alertsLeft}>
            <View style={styles.bellIconBox}>
              <Bell size={16} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <AppText variant="caption" weight="bold" color="primary">
                JOURNEY REMINDERS
              </AppText>
              <AppText variant="tiny" color="secondary" style={{ marginTop: 2 }}>
                Receive departure alerts on journey date
              </AppText>
            </View>
          </View>

          <Switch
            value={tripAlerts}
            onValueChange={setTripAlerts}
            trackColor={{ false: Colors.surfaceHighest, true: Colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Primary CTA Button */}
        <View style={styles.ctaWrapper}>
          <AppButton
            title={
              isExistingTicket
                ? `UPDATE EXISTING TICKET (PNR ${initialTicket.pnr})`
                : 'CONFIRM & ADD TO WALLET'
            }
            variant="primary"
            onPress={handleConfirmAndSave}
          />
        </View>
      </ScrollView>
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
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 14,
    paddingBottom: 36,
  },
  detectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Spacing.borderRadiusMd,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(242, 86, 35, 0.25)',
    marginBottom: 12,
  },
  detectionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeSummaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadiusLg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 16,
  },
  routeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeColLeft: {
    flex: 1,
  },
  routeDurationCenter: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  routeColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  routeCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    marginBottom: 6,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 14,
    height: 48,
  },
  textInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 14,
  },
  classCard: {
    width: '31%',
    marginHorizontal: '1.16%',
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadiusMd,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    position: 'relative',
  },
  classCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkCorner: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachSeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  coachCol: {
    flex: 1,
  },
  coachColSpacing: {
    width: 12,
  },
  coachSeatInput: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 14,
    height: 48,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  fareCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadiusMd,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 16,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 10,
  },
  alertsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadiusMd,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 20,
  },
  existingTicketBanner: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: Spacing.borderRadiusMd,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    marginBottom: 12,
  },
  alertsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bellIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(242, 86, 35, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ctaWrapper: {
    marginBottom: 24,
  },
});
