import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import {
  Check,
  X,
  Plus,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { NormalizedTicket, TicketStatus } from '../types/ticket';
import { AppText } from '../components/common/AppText';
import { ticketRepository } from '../database/repositories/ticketRepository';
import { getStationName, getTrainName } from '../utils/stationLookup';

interface AddTicketScreenProps {
  onBack: () => void;
  onProceedToVerify: (ticket: NormalizedTicket) => void;
  onCheckActiveTickets?: () => Promise<void>;
}

const CLASS_OPTIONS = ['CC', 'EC', '3A', '2A', '1A', 'SL', '3E', '2S'];
const STATUS_OPTIONS: TicketStatus[] = ['CONFIRMED', 'RAC', 'WAITLISTED'];

export const AddTicketScreen: React.FC<AddTicketScreenProps> = ({
  onBack,
  onProceedToVerify,
}) => {
  // Manual Entry Form State
  const [pnr, setPnr] = useState('');
  const [trainNo, setTrainNo] = useState('');
  const [trainName, setTrainName] = useState('');
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [date, setDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [travelClass, setTravelClass] = useState('CC');
  const [coach, setCoach] = useState('');
  const [seat, setSeat] = useState('');
  const [status, setStatus] = useState<TicketStatus>('CONFIRMED');
  const [fare, setFare] = useState('');

  // Keyboard avoidance and view preservation state
  const scrollRef = useRef<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Auto-scroll helper when inputs receive focus
  const scrollToInput = (offset: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offset, animated: true });
    }, 120);
  };

  const handleTrainNoChange = (text: string) => {
    setTrainNo(text);
    if (text.length === 5) {
      const detectedName = getTrainName(text);
      if (detectedName && !trainName) {
        setTrainName(detectedName);
      }
    }
  };

  // Quick date helper chips
  const applyQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    setDate(`${day} ${month} ${year}`);
  };

  // Check if form has unsaved edits
  const hasUnsavedChanges = Boolean(
    pnr || trainNo || trainName || fromStation || toStation || date || passengerName
  );

  // Validate form
  const isPnrValid = pnr.trim().length === 10;
  const isTrainNoValid = trainNo.trim().length >= 4;
  const isRouteValid = fromStation.trim().length >= 2 && toStation.trim().length >= 2;
  const isDateValid = date.trim().length >= 6;
  const canSubmit = isPnrValid && isTrainNoValid && isRouteValid && isDateValid;

  const handleCancelPress = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Discard Ticket?',
        'Any details you have entered will not be saved.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onBack },
        ]
      );
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    const cleanPnr = pnr.trim();
    if (cleanPnr.length !== 10) {
      Alert.alert('Invalid PNR', 'Please enter a complete 10-digit PNR number.');
      return;
    }
    if (!trainNo.trim()) {
      Alert.alert('Missing Train Number', 'Please enter the train number.');
      return;
    }
    if (!fromStation.trim() || !toStation.trim()) {
      Alert.alert('Missing Route', 'Please enter both Origin and Destination station codes.');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Missing Date', 'Please enter the journey date.');
      return;
    }

    const cleanFrom = fromStation.trim().toUpperCase();
    const cleanTo = toStation.trim().toUpperCase();
    const resolvedFromName = getStationName(cleanFrom) || `${cleanFrom} Station`;
    const resolvedToName = getStationName(cleanTo) || `${cleanTo} Station`;
    const finalTrainName = trainName.trim() || getTrainName(trainNo.trim()) || `Train ${trainNo.trim()}`;

    const newTicket: NormalizedTicket = {
      id: `ticket_${cleanPnr}`,
      source: 'MANUAL',
      pnr: cleanPnr,
      train: {
        number: trainNo.trim(),
        name: finalTrainName,
        type: `SUPERFAST ${trainNo.trim()}`,
      },
      journey: {
        from: cleanFrom,
        fromName: resolvedFromName,
        to: cleanTo,
        toName: resolvedToName,
        date: date.trim(),
        departure: departureTime.trim() || undefined,
      },
      passenger: {
        name: passengerName.trim() || 'Passenger',
        coach: coach.trim().toUpperCase() || undefined,
        seat: seat.trim() || undefined,
        class: travelClass,
        className: `${travelClass} Class`,
        bookingStatus: status,
      },
      fare: fare.trim() ? { total: parseFloat(fare.trim()) } : undefined,
      status: status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isUpcoming: true,
    };

    const isDup = await ticketRepository.isDuplicatePNR(cleanPnr);
    if (isDup) {
      Alert.alert(
        'Ticket Already in Wallet',
        `PNR ${cleanPnr} already exists in your wallet.\n\nProceeding will update your existing ticket with these new details.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update Existing',
            onPress: () => onProceedToVerify(newTicket),
          },
        ]
      );
      return;
    }

    onProceedToVerify(newTicket);
  };

  const fromResolvedName = fromStation.trim().length >= 2 ? getStationName(fromStation.trim()) : '';
  const toResolvedName = toStation.trim().length >= 2 ? getStationName(toStation.trim()) : '';

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Apple-style Modal Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleCancelPress}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AppText variant="body" color="primary" weight="medium">
            Cancel
          </AppText>
        </TouchableOpacity>

        <AppText variant="bodyLg" weight="bold" color="primary">
          New Ticket
        </AppText>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AppText
            variant="body"
            weight="bold"
            color={canSubmit ? 'orange' : 'muted'}
          >
            Add
          </AppText>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 60 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: JOURNEY & TRAIN */}
          <AppText
            variant="micro"
            weight="bold"
            color="secondary"
            uppercase
            letterSpacing={0.8}
            style={styles.groupHeader}
          >
            JOURNEY & TRAIN
          </AppText>

          <View style={styles.groupCard}>
            {/* PNR Number */}
            <View style={styles.inputRow}>
              <AppText variant="body" weight="medium" color="secondary" style={styles.rowLabel}>
                PNR
              </AppText>
              <TextInput
                value={pnr}
                onChangeText={setPnr}
                placeholder="10-digit PNR"
                placeholderTextColor={Colors.appleTertiaryLabel}
                keyboardType="number-pad"
                maxLength={10}
                style={styles.rowInput}
              />
              {pnr.length === 10 ? (
                <View style={styles.validCheck}>
                  <Check size={16} color={Colors.appleGreen} strokeWidth={2.6} />
                </View>
              ) : pnr.length > 0 ? (
                <TouchableOpacity onPress={() => setPnr('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={15} color={Colors.appleTertiaryLabel} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.separator} />

            {/* Train Number */}
            <View style={styles.inputRow}>
              <AppText variant="body" weight="medium" color="secondary" style={styles.rowLabel}>
                Train No.
              </AppText>
              <TextInput
                value={trainNo}
                onChangeText={handleTrainNoChange}
                placeholder="5 digits, e.g. 26101"
                placeholderTextColor={Colors.appleTertiaryLabel}
                keyboardType="number-pad"
                maxLength={5}
                style={styles.rowInput}
              />
            </View>

            <View style={styles.separator} />

            {/* Train Name */}
            <View style={styles.inputRow}>
              <AppText variant="body" weight="medium" color="secondary" style={styles.rowLabel}>
                Train Name
              </AppText>
              <TextInput
                value={trainName}
                onChangeText={setTrainName}
                placeholder="Optional name"
                placeholderTextColor={Colors.appleTertiaryLabel}
                autoCapitalize="words"
                style={styles.rowInput}
              />
            </View>
          </View>

          {/* Section 2: ROUTE & SCHEDULE */}
          <AppText
            variant="micro"
            weight="bold"
            color="secondary"
            uppercase
            letterSpacing={0.8}
            style={styles.groupHeader}
          >
            ROUTE & SCHEDULE
          </AppText>

          <View style={styles.groupCard}>
            {/* From Station */}
            <View style={styles.inputRow}>
              <AppText variant="body" weight="medium" color="secondary" style={styles.rowLabel}>
                From
              </AppText>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={fromStation}
                  onChangeText={setFromStation}
                  onFocus={() => scrollToInput(120)}
                  placeholder="Station code, e.g. PUNE"
                  placeholderTextColor={Colors.appleTertiaryLabel}
                  autoCapitalize="characters"
                  maxLength={5}
                  style={styles.rowInputInline}
                />
                {fromResolvedName ? (
                  <AppText variant="micro" color="secondary" style={styles.stationHint}>
                    {fromResolvedName}
                  </AppText>
                ) : null}
              </View>
            </View>

            <View style={styles.separator} />

            {/* To Station */}
            <View style={styles.inputRow}>
              <AppText variant="body" weight="medium" color="secondary" style={styles.rowLabel}>
                To
              </AppText>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={toStation}
                  onChangeText={setToStation}
                  onFocus={() => scrollToInput(160)}
                  placeholder="Station code, e.g. SBC"
                  placeholderTextColor={Colors.appleTertiaryLabel}
                  autoCapitalize="characters"
                  maxLength={5}
                  style={styles.rowInputInline}
                />
                {toResolvedName ? (
                  <AppText variant="micro" color="secondary" style={styles.stationHint}>
                    {toResolvedName}
                  </AppText>
                ) : null}
              </View>
            </View>

            <View style={styles.separator} />

            {/* Journey Date */}
            <View style={styles.inputRow}>
              <AppText variant="body" weight="medium" color="secondary" style={styles.rowLabel}>
                Date
              </AppText>
              <TextInput
                value={date}
                onChangeText={setDate}
                onFocus={() => scrollToInput(220)}
                placeholder="e.g. 28 Oct 2026"
                placeholderTextColor={Colors.appleTertiaryLabel}
                style={styles.rowInput}
              />
            </View>

            {/* Quick Date Helper Chips */}
            <View style={styles.quickDateRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => applyQuickDate(0)}
                style={styles.quickDateChip}
              >
                <AppText variant="tiny" weight="medium" color="primary">
                  Today
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => applyQuickDate(1)}
                style={styles.quickDateChip}
              >
                <AppText variant="tiny" weight="medium" color="primary">
                  Tomorrow
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => applyQuickDate(7)}
                style={styles.quickDateChip}
              >
                <AppText variant="tiny" weight="medium" color="primary">
                  Next Week
                </AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.separator} />

            {/* Departure Time */}
            <View style={styles.inputRow}>
              <AppText variant="body" weight="medium" color="secondary" style={styles.rowLabel}>
                Departure
              </AppText>
              <TextInput
                value={departureTime}
                onChangeText={setDepartureTime}
                onFocus={() => scrollToInput(280)}
                placeholder="Optional, e.g. 06:25 AM"
                placeholderTextColor={Colors.appleTertiaryLabel}
                style={styles.rowInput}
              />
            </View>
          </View>

          {/* Section 3: PASSENGER & BERTH */}
          <AppText
            variant="micro"
            weight="bold"
            color="secondary"
            uppercase
            letterSpacing={0.8}
            style={styles.groupHeader}
          >
            PASSENGER & BERTH
          </AppText>

          <View style={styles.groupCard}>
            {/* Passenger Name */}
            <View style={styles.inputRow}>
              <AppText variant="body" weight="medium" color="secondary" style={styles.rowLabel}>
                Passenger
              </AppText>
              <TextInput
                value={passengerName}
                onChangeText={setPassengerName}
                onFocus={() => scrollToInput(360)}
                placeholder="Passenger name"
                placeholderTextColor={Colors.appleTertiaryLabel}
                autoCapitalize="words"
                style={styles.rowInput}
              />
            </View>

            <View style={styles.separator} />

            {/* Travel Class Selector */}
            <View style={styles.classSelectorRow}>
              <AppText variant="body" weight="medium" color="secondary" style={styles.rowLabel}>
                Class
              </AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.classPillList}
              >
                {CLASS_OPTIONS.map((cls) => {
                  const isSelected = travelClass === cls;
                  return (
                    <TouchableOpacity
                      key={cls}
                      activeOpacity={0.8}
                      onPress={() => setTravelClass(cls)}
                      style={[styles.classPill, isSelected && styles.classPillActive]}
                    >
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={isSelected ? 'dark' : 'primary'}
                      >
                        {cls}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.separator} />

            {/* Coach & Seat */}
            <View style={styles.coachSeatRow}>
              <View style={styles.halfCol}>
                <AppText variant="body" weight="medium" color="secondary" style={styles.halfLabel}>
                  Coach
                </AppText>
                <TextInput
                  value={coach}
                  onChangeText={setCoach}
                  onFocus={() => scrollToInput(480)}
                  placeholder="e.g. B1"
                  placeholderTextColor={Colors.appleTertiaryLabel}
                  autoCapitalize="characters"
                  style={styles.halfInput}
                />
              </View>

              <View style={styles.verticalSeparator} />

              <View style={styles.halfCol}>
                <AppText variant="body" weight="medium" color="secondary" style={styles.halfLabel}>
                  Seat / Berth
                </AppText>
                <TextInput
                  value={seat}
                  onChangeText={setSeat}
                  onFocus={() => scrollToInput(480)}
                  placeholder="e.g. 22"
                  placeholderTextColor={Colors.appleTertiaryLabel}
                  style={styles.halfInput}
                />
              </View>
            </View>
          </View>

          {/* Section 4: STATUS & FARE (Optional) */}
          <AppText
            variant="micro"
            weight="bold"
            color="secondary"
            uppercase
            letterSpacing={0.8}
            style={styles.groupHeader}
          >
            STATUS & FARE
          </AppText>

          <View style={styles.groupCard}>
            <View style={styles.statusRow}>
              <AppText variant="body" weight="medium" color="secondary" style={styles.rowLabel}>
                Status
              </AppText>
              <View style={styles.statusPillGroup}>
                {STATUS_OPTIONS.map((st) => {
                  const isSelected = status === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      activeOpacity={0.8}
                      onPress={() => setStatus(st)}
                      style={[styles.statusPill, isSelected && styles.statusPillActive]}
                    >
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={isSelected ? 'dark' : 'secondary'}
                      >
                        {st}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.inputRow}>
              <AppText variant="body" weight="medium" color="secondary" style={styles.rowLabel}>
                Fare (₹)
              </AppText>
              <TextInput
                value={fare}
                onChangeText={setFare}
                onFocus={() => scrollToInput(600)}
                placeholder="Optional fare amount"
                placeholderTextColor={Colors.appleTertiaryLabel}
                keyboardType="number-pad"
                style={styles.rowInput}
              />
            </View>
          </View>

          {/* Primary Action Button */}
          <View style={styles.submitSection}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            >
              <Plus size={18} color={canSubmit ? '#000000' : Colors.appleSecondaryLabel} strokeWidth={2.4} style={{ marginRight: 6 }} />
              <AppText
                variant="bodyLg"
                weight="heavy"
                color={canSubmit ? 'dark' : 'secondary'}
              >
                Add to Wallet
              </AppText>
            </TouchableOpacity>

            {!canSubmit && (
              <AppText variant="tiny" color="secondary" center style={styles.helperText}>
                {!isPnrValid
                  ? 'Enter a valid 10-digit PNR to continue'
                  : !isTrainNoValid
                  ? 'Enter train number'
                  : !isRouteValid
                  ? 'Enter station codes'
                  : 'Enter journey date'}
              </AppText>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerButton: {
    minWidth: 60,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 40,
  },
  groupHeader: {
    marginLeft: 12,
    marginBottom: 6,
    marginTop: 18,
  },
  groupCard: {
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 48,
  },
  rowLabel: {
    width: 90,
  },
  rowInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.appleLabel,
    paddingVertical: 12,
  },
  rowInputInline: {
    fontSize: 16,
    color: Colors.appleLabel,
    paddingVertical: 8,
  },
  stationHint: {
    marginTop: -4,
    marginBottom: 6,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.appleSeparator,
    marginLeft: 16,
  },
  validCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(48, 209, 88, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDateRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  quickDateChip: {
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  classSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  classPillList: {
    flexDirection: 'row',
    gap: 6,
  },
  classPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.appleSecondaryBg,
  },
  classPillActive: {
    backgroundColor: Colors.primary,
  },
  coachSeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  halfCol: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  halfLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  halfInput: {
    fontSize: 16,
    color: Colors.appleLabel,
    paddingVertical: 4,
  },
  verticalSeparator: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: Colors.appleSeparator,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusPillGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.appleSecondaryBg,
  },
  statusPillActive: {
    backgroundColor: Colors.primary,
  },
  submitSection: {
    marginTop: 28,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 26,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.appleSecondaryBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  helperText: {
    marginTop: 10,
  },
});
