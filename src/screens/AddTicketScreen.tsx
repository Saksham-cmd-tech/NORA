import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  HelpCircle,
  Zap,
  Edit3,
  ShieldCheck,
  RefreshCw,
  Clipboard as ClipboardIcon,
  Sparkles,
  Lock,
  ArrowRight,
  User,
  Ticket as TicketIcon,
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { NormalizedTicket } from '../types/ticket';
import { AppText } from '../components/common/AppText';
import { AppButton } from '../components/common/AppButton';
import { StatusBadge } from '../components/common/StatusBadge';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { parseBookingNotification } from '../parsers/notificationParser';
import { ticketRepository } from '../database/repositories/ticketRepository';
import { isTicketValidAndUpcoming } from '../utils/dateUtils';

interface AddTicketScreenProps {
  onBack: () => void;
  onProceedToVerify: (ticket: NormalizedTicket) => void;
  onCheckActiveTickets?: () => Promise<void>;
}

export const AddTicketScreen: React.FC<AddTicketScreenProps> = ({
  onBack,
  onProceedToVerify,
  onCheckActiveTickets,
}) => {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [detectedTicket, setDetectedTicket] = useState<NormalizedTicket | null>(null);
  const [isDuplicateTicket, setIsDuplicateTicket] = useState(false);
  const [rawSmsInput, setRawSmsInput] = useState<string>('');

  // Manual Entry Form State
  const [manualPnr, setManualPnr] = useState('');
  const [manualTrainNo, setManualTrainNo] = useState('');
  const [manualTrainName, setManualTrainName] = useState('');
  const [manualFrom, setManualFrom] = useState('');
  const [manualTo, setManualTo] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualPassenger, setManualPassenger] = useState('');
  const [manualCoach, setManualCoach] = useState('');
  const [manualSeat, setManualSeat] = useState('');
  const [manualClass, setManualClass] = useState('CC');
  const [manualFare, setManualFare] = useState('');

  const handleCheckActiveTickets = async () => {
    if (onCheckActiveTickets) {
      await onCheckActiveTickets();
      return;
    }
    const list = await ticketRepository.getTickets();
    const activeTickets = list.filter(
      (t) =>
        isTicketValidAndUpcoming(t.journey?.date, t.status, t.journey?.departure) &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED'
    );
    if (activeTickets.length > 0) {
      Alert.alert(
        `Active Tickets (${activeTickets.length})`,
        `You have ${activeTickets.length} active ticket(s) in your wallet:\n\n${activeTickets
          .map(
            (t, i) =>
              `${i + 1}. Train ${t.train.number} ${t.train.name || ''}\n   Route: ${t.journey.from} → ${t.journey.to} (${t.journey.date})\n   PNR: ${t.pnr}`
          )
          .join('\n\n')}`,
        [
          { text: 'View in Wallet', onPress: onBack },
          { text: 'Close', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        'Check Active Tickets',
        'You have 0 active train tickets in your wallet.\n\nPaste an IRCTC or redRail booking SMS above, or enter details manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getString();
      if (text && text.trim().length > 0) {
        setRawSmsInput(text);
        const result = parseBookingNotification(text);
        if (result) {
          const isDup = await ticketRepository.isDuplicatePNR(result.pnr);
          setIsDuplicateTicket(isDup);
          setDetectedTicket(result);
          if (isDup) {
            Alert.alert(
              'Ticket Already in Wallet',
              `Found booking for PNR ${result.pnr}.\n\nThis ticket is already in your wallet. Reviewing details will update/merge the existing ticket without adding a duplicate.`
            );
          } else {
            Alert.alert('SMS Detected', `Found booking for PNR ${result.pnr} from ${result.source}!`);
          }
        }
      } else {
        Alert.alert('Clipboard Empty', 'No text found in clipboard to paste.');
      }
    } catch {
      Alert.alert('Clipboard', 'Could not read from clipboard.');
    }
  };

  const handleExtractFromText = async () => {
    if (!rawSmsInput.trim()) {
      Alert.alert('Empty Input', 'Please paste a booking SMS or notification text first.');
      return;
    }
    const result = parseBookingNotification(rawSmsInput);
    if (result) {
      const isDup = await ticketRepository.isDuplicatePNR(result.pnr);
      setIsDuplicateTicket(isDup);
      setDetectedTicket(result);
      if (isDup) {
        Alert.alert(
          'Ticket Already in Wallet',
          `Ticket PNR ${result.pnr} is already in your wallet.\n\nReviewing details will update the existing ticket without creating a duplicate.`
        );
      } else {
        Alert.alert('Ticket Extracted', `Successfully parsed PNR ${result.pnr} from ${result.source}!`);
      }
    } else {
      Alert.alert(
        'Parse Notice',
        'Could not automatically detect IRCTC or redRail booking structure. You can enter details using Manual Entry.'
      );
    }
  };

  const handleManualProceed = async () => {
    if (!manualPnr.trim() || manualPnr.trim().length < 10) {
      Alert.alert('Invalid PNR', 'Please enter a valid 10-digit PNR number.');
      return;
    }
    if (!manualTrainNo.trim()) {
      Alert.alert('Missing Train Number', 'Please enter the 5-digit train number.');
      return;
    }

    const isDup = await ticketRepository.isDuplicatePNR(manualPnr.trim());

    const manualTicket: NormalizedTicket = {
      id: `ticket_${manualPnr.trim()}`,
      source: 'MANUAL',
      pnr: manualPnr.trim(),
      train: {
        number: manualTrainNo.trim(),
        name: manualTrainName.trim() || `Train ${manualTrainNo.trim()}`,
        type: `SUPERFAST ${manualTrainNo.trim()}`,
      },
      journey: {
        from: manualFrom.trim().toUpperCase() || 'ORIGIN',
        to: manualTo.trim().toUpperCase() || 'DEST',
        date: manualDate.trim() || 'Journey Date',
      },
      passenger: {
        name: manualPassenger.trim() || 'Passenger',
        coach: manualCoach.trim(),
        seat: manualSeat.trim(),
        class: manualClass,
        className: `${manualClass} Class`,
        bookingStatus: 'CONFIRMED',
      },
      fare: manualFare ? { total: parseFloat(manualFare) } : undefined,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isUpcoming: true,
    };

    if (isDup) {
      Alert.alert(
        'Ticket Already in Wallet',
        `PNR ${manualPnr.trim()} already exists in your wallet.\n\nProceeding will update the existing ticket details instead of adding a duplicate.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update Existing',
            onPress: () => onProceedToVerify(manualTicket),
          },
        ]
      );
      return;
    }

    onProceedToVerify(manualTicket);
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
          ADD TICKET
        </AppText>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              'Add Ticket Guide',
              'NORA automatically reads booking notifications from IRCTC and redRail. You can also paste SMS text manually.'
            );
          }}
          style={styles.helpBtn}
        >
          <HelpCircle size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Auto Detect vs Manual Segmented Control */}
        <View style={styles.toggleWrapper}>
          <SegmentedControl
            options={[
              { value: 'auto', label: 'AUTO-DETECT' },
              { value: 'manual', label: 'MANUAL ENTRY' },
            ]}
            selectedValue={mode}
            onSelect={(val) => setMode(val as 'auto' | 'manual')}
          />
        </View>

        {/* ================= AUTO DETECT MODE ================= */}
        {mode === 'auto' && (
          <View>
            {detectedTicket ? (
              <View>
                {/* Step Indicator */}
                <View style={styles.stepHeader}>
                  <AppText variant="micro" uppercase weight="bold" color="muted" letterSpacing={0.8}>
                    STEP 1 OF 2 · READY TO IMPORT
                  </AppText>
                  <StatusBadge label="Ticket Detected" variant="orange" dot />
                </View>

                {/* Detected Ticket Preview Card */}
                <View style={styles.detectedCard}>
                  <View style={styles.detectedCardHeader}>
                    <StatusBadge
                      label={detectedTicket.train.name ? detectedTicket.train.name.toUpperCase() : `TRAIN ${detectedTicket.train.number}`}
                      variant="dark"
                    />
                    <StatusBadge
                      label={detectedTicket.passenger.seat ? `${detectedTicket.passenger.class || 'CC'} · ${detectedTicket.passenger.seat}` : (detectedTicket.passenger.class || 'CC')}
                      variant="orange"
                    />
                  </View>

                  {/* Route Display */}
                  <View style={styles.routeRow}>
                    <View style={styles.stationBlockLeft}>
                      <AppText variant="heading" weight="heavy" color="primary">
                        {detectedTicket.journey.from}
                      </AppText>
                      {detectedTicket.journey.fromName && (
                        <AppText variant="micro" color="secondary" numberOfLines={1}>
                          {detectedTicket.journey.fromName}
                        </AppText>
                      )}
                    </View>

                    <View style={styles.arrowBetween}>
                      {detectedTicket.journey.departure && (
                        <AppText variant="tiny" color="orange" weight="bold">
                          {detectedTicket.journey.departure}
                        </AppText>
                      )}
                      <AppText variant="tiny" color="secondary">
                        →
                      </AppText>
                    </View>

                    <View style={styles.stationBlockRight}>
                      <AppText variant="heading" weight="heavy" color="primary">
                        {detectedTicket.journey.to}
                      </AppText>
                      {detectedTicket.journey.toName && (
                        <AppText variant="micro" color="secondary" numberOfLines={1}>
                          {detectedTicket.journey.toName}
                        </AppText>
                      )}
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  {/* Passenger & PNR Row */}
                  <View style={styles.passengerPnrRow}>
                    <View style={styles.passengerInline}>
                      <AppText variant="caption" weight="bold" color="primary" numberOfLines={1}>
                        {detectedTicket.passenger.name || 'Passenger'}
                      </AppText>
                    </View>

                    <AppText variant="caption" weight="bold" color="orange">
                      {`PNR ${detectedTicket.pnr}`}
                    </AppText>
                  </View>

                  <View style={styles.sourceRow}>
                    <View style={styles.sourceBadge}>
                      <ShieldCheck size={12} color={Colors.success} style={{ marginRight: 4 }} />
                      <AppText variant="micro" weight="medium" color="secondary">
                        {`Parsed from ${detectedTicket.source}`}
                      </AppText>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => onProceedToVerify(detectedTicket)}
                    >
                      <AppText variant="micro" weight="bold" color="orange">
                        Review Details →
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                {isDuplicateTicket && (
                  <View style={styles.duplicateWarningBox}>
                    <ShieldCheck size={13} color={Colors.warning} style={{ marginRight: 6 }} />
                    <AppText variant="micro" weight="bold" color="warning">
                      ALREADY IN WALLET · UPDATE MODE (NO DUPLICATE)
                    </AppText>
                  </View>
                )}

                {/* Primary CTA Button */}
                <View style={styles.ctaWrapper}>
                  <AppButton
                    title={
                      isDuplicateTicket
                        ? `REVIEW & UPDATE TICKET (PNR ${detectedTicket.pnr})`
                        : 'REVIEW & CONFIRM DETAILS'
                    }
                    variant="primary"
                    icon={<ArrowRight size={16} color="#000000" />}
                    onPress={() => onProceedToVerify(detectedTicket)}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.listenCard}>
                <View style={styles.listenIconCircle}>
                  <Sparkles size={28} color={Colors.primary} />
                </View>
                <AppText variant="subheading" weight="bold" color="primary" center style={styles.listenTitle}>
                  Auto-Detecting Bookings
                </AppText>
                <AppText variant="caption" color="secondary" center style={styles.listenSubtitle}>
                  NORA runs a background NotificationListenerService to intercept train booking notifications from IRCTC and redRail.
                </AppText>
              </View>
            )}

            {/* Read-only SMS Parser Box */}
            <View style={styles.smsBox}>
              <View style={styles.smsBoxHeader}>
                <View style={styles.smsBoxHeaderLeft}>
                  <Lock size={13} color={Colors.textSecondary} style={{ marginRight: 6 }} />
                  <AppText variant="micro" weight="bold" color="secondary" uppercase>
                    PASTE SMS / NOTIFICATION TEXT
                  </AppText>
                </View>

                <TouchableOpacity activeOpacity={0.8} onPress={handlePaste} style={styles.pasteIconBtn}>
                  <ClipboardIcon size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                  <AppText variant="micro" weight="bold" color="orange">
                    PASTE
                  </AppText>
                </TouchableOpacity>
              </View>

              <TextInput
                value={rawSmsInput}
                onChangeText={setRawSmsInput}
                placeholder="Paste IRCTC or redRail booking SMS text here..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                style={styles.smsTextInput}
              />

              <View style={styles.extractBtnWrapper}>
                <AppButton
                  title="PARSE TICKET FROM TEXT"
                  variant="secondary"
                  onPress={handleExtractFromText}
                />
              </View>

              {/* Check Current Active Tickets Button */}
              <View style={styles.checkActiveBtnWrapper}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleCheckActiveTickets}
                  style={styles.checkActiveBtn}
                >
                  <TicketIcon size={14} color={Colors.primary} style={{ marginRight: 8 }} />
                  <AppText variant="micro" weight="bold" color="orange" uppercase letterSpacing={0.8}>
                    CHECK CURRENT ACTIVE TICKETS
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ================= MANUAL ENTRY MODE ================= */}
        {mode === 'manual' && (
          <View style={styles.manualForm}>
            <View style={styles.inputGroup}>
              <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
                PNR NUMBER (10 DIGITS) *
              </AppText>
              <TextInput
                value={manualPnr}
                onChangeText={setManualPnr}
                placeholder="e.g. 8354766445"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                style={styles.manualInput}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfCol}>
                <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
                  TRAIN NUMBER *
                </AppText>
                <TextInput
                  value={manualTrainNo}
                  onChangeText={setManualTrainNo}
                  placeholder="e.g. 26101"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={5}
                  style={styles.manualInput}
                />
              </View>
              <View style={styles.colSpacing} />
              <View style={styles.halfCol}>
                <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
                  TRAIN NAME
                </AppText>
                <TextInput
                  value={manualTrainName}
                  onChangeText={setManualTrainName}
                  placeholder="e.g. Vande Bharat"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.manualInput}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfCol}>
                <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
                  FROM STATION *
                </AppText>
                <TextInput
                  value={manualFrom}
                  onChangeText={setManualFrom}
                  placeholder="e.g. PUNE"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  maxLength={5}
                  style={styles.manualInput}
                />
              </View>
              <View style={styles.colSpacing} />
              <View style={styles.halfCol}>
                <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
                  TO STATION *
                </AppText>
                <TextInput
                  value={manualTo}
                  onChangeText={setManualTo}
                  placeholder="e.g. BD"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  maxLength={5}
                  style={styles.manualInput}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
                JOURNEY DATE *
              </AppText>
              <TextInput
                value={manualDate}
                onChangeText={setManualDate}
                placeholder="e.g. 08 Oct 2026"
                placeholderTextColor={Colors.textMuted}
                style={styles.manualInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
                PASSENGER NAME *
              </AppText>
              <TextInput
                value={manualPassenger}
                onChangeText={setManualPassenger}
                placeholder="e.g. Saksham Tale"
                placeholderTextColor={Colors.textMuted}
                style={styles.manualInput}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfCol}>
                <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
                  COACH
                </AppText>
                <TextInput
                  value={manualCoach}
                  onChangeText={setManualCoach}
                  placeholder="e.g. C5"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  style={styles.manualInput}
                />
              </View>
              <View style={styles.colSpacing} />
              <View style={styles.halfCol}>
                <AppText variant="micro" uppercase color="muted" weight="bold" style={styles.inputLabel}>
                  SEAT NUMBER
                </AppText>
                <TextInput
                  value={manualSeat}
                  onChangeText={setManualSeat}
                  placeholder="e.g. 64"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.manualInput}
                />
              </View>
            </View>

            <View style={styles.ctaWrapper}>
              <AppButton
                title="CONTINUE TO REVIEW"
                variant="primary"
                onPress={handleManualProceed}
              />
            </View>
          </View>
        )}
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
  helpBtn: {
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
    paddingBottom: 32,
  },
  toggleWrapper: {
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detectedCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadiusLg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 16,
  },
  detectedCardHeader: {
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
  stationBlockLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  stationBlockRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  arrowBetween: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 12,
  },
  passengerPnrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  passengerInline: {
    flex: 1,
    marginRight: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listenCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadiusLg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 16,
  },
  listenIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(242, 86, 35, 0.2)',
  },
  listenTitle: {
    marginBottom: 6,
  },
  listenSubtitle: {
    maxWidth: 280,
    lineHeight: 18,
  },
  smsBox: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadiusLg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 20,
  },
  smsBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  smsBoxHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pasteIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 86, 35, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  smsTextInput: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Spacing.borderRadiusMd,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  extractBtnWrapper: {
    marginTop: 12,
  },
  duplicateWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: Spacing.borderRadiusSm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    marginTop: 10,
  },
  checkActiveBtnWrapper: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    alignItems: 'center',
  },
  checkActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242, 86, 35, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: 'rgba(242, 86, 35, 0.25)',
    width: '100%',
  },
  manualForm: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadiusLg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    marginBottom: 6,
  },
  manualInput: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Spacing.borderRadiusMd,
    paddingHorizontal: 14,
    height: 48,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  halfCol: {
    flex: 1,
  },
  colSpacing: {
    width: 12,
  },
  ctaWrapper: {
    marginTop: 10,
    marginBottom: 16,
  },
});
