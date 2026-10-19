import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Copy, Check } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Colors } from '../../theme/colors';
import { NormalizedTicket } from '../../types/ticket';
import { AppText } from '../common/AppText';
import { StationRoute } from './StationRoute';
import { getTrainName } from '../../utils/stationLookup';

interface TicketDetailsPassProps {
  ticket: NormalizedTicket;
  onCopyPNR?: () => void;
}

export const TicketDetailsPass: React.FC<TicketDetailsPassProps> = ({
  ticket,
  onCopyPNR,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(ticket.pnr);
    setCopied(true);
    if (onCopyPNR) onCopyPNR();
    setTimeout(() => setCopied(false), 2000);
  };

  // Format PNR with clean spaces: e.g. 4341  568  676
  const formattedPNR = ticket.pnr.replace(/(\d{4})(\d{3})(\d{3})/, '$1  $2  $3');

  // Compute clean train name and train category
  const effectiveTrainName =
    ticket.train.name &&
    ticket.train.name.trim().length > 0 &&
    !/^\d+$/.test(ticket.train.name.trim()) &&
    ticket.train.name.trim() !== ticket.train.number
      ? ticket.train.name
      : getTrainName(ticket.train.number) || 'Indian Railways Superfast';

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

  return (
    <View style={styles.cardContainer}>
      {/* ================= UPPER SECTION ================= */}
      <View style={styles.upperSection}>
        {/* Header Row: Service Number and Status Badge */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.servicePill}>
              <AppText variant="micro" weight="bold" color="primary">
                {ticket.train.number ? `TRAIN ${ticket.train.number}` : 'TRAIN'}
              </AppText>
            </View>
            <AppText
              variant="micro"
              weight="bold"
              color="secondary"
              uppercase
              letterSpacing={0.6}
              style={{ marginLeft: 6 }}
            >
              {trainCategory}
            </AppText>
          </View>

          {/*<View style={[styles.statusPill, isConfirmed ? styles.statusPillGreen : styles.statusPillOrange]}>
            <View style={[styles.statusDot, isConfirmed ? styles.statusDotGreen : styles.statusDotOrange]} />
            <AppText
              variant="micro"
              weight="bold"
              color={isConfirmed ? 'success' : 'orange'}
              uppercase
              letterSpacing={0.6}
            >
              {ticket.status || 'CONFIRMED'}
            </AppText>
          </View>*/}
        </View>

        {/* Large Train Name */}
        <AppText variant="heading" weight="heavy" color="primary" numberOfLines={1} style={styles.trainName}>
          {effectiveTrainName}
        </AppText>

        {/* Station Route Section */}
        <StationRoute
          fromCode={ticket.journey.from}
          fromName={ticket.journey.fromName}
          departureTime={ticket.journey.departure}
          toCode={ticket.journey.to}
          toName={ticket.journey.toName}
          arrivalTime={ticket.journey.arrival}
          duration={ticket.journey.duration}
          style={styles.routePadding}
        />

        <View style={styles.divider} />

        {/* Passenger & Seat Details Grid */}
        <View style={styles.detailsGrid}>
          {/* Row 1: 4 Key Columns */}
          <View style={styles.gridRow}>
            <View style={[styles.gridCol, { flex: 1.25 }]}>
              <AppText variant="micro" uppercase color="secondary" weight="medium" letterSpacing={0.6}>
                DATE
              </AppText>
              <AppText variant="body" weight="bold" color="primary" style={styles.valMargin} numberOfLines={1}>
                {ticket.journey.date}
              </AppText>
            </View>

            <View style={[styles.gridCol, { flex: 0.8 }]}>
              <AppText variant="micro" uppercase color="secondary" weight="medium" letterSpacing={0.6}>
                COACH
              </AppText>
              <AppText variant="body" weight="bold" color="orange" style={styles.valMargin}>
                {ticket.passenger.coach && ticket.passenger.coach !== '-' ? ticket.passenger.coach : '—'}
              </AppText>
            </View>

            <View style={[styles.gridCol, { flex: 1.15 }]}>
              <AppText variant="micro" uppercase color="secondary" weight="medium" letterSpacing={0.6}>
                SEAT
              </AppText>
              <AppText variant="body" weight="bold" color="primary" style={styles.valMargin} numberOfLines={1}>
                {ticket.passenger.seat && ticket.passenger.seat !== 'CONFIRMED'
                  ? ticket.passenger.seat
                  : 'CNF'}
              </AppText>
            </View>

            <View style={[styles.gridCol, { flex: 0.8, alignItems: 'flex-end' }]}>
              <AppText variant="micro" uppercase color="secondary" weight="medium" letterSpacing={0.6}>
                CLASS
              </AppText>
              <AppText variant="body" weight="bold" color="primary" style={styles.valMargin}>
                {ticket.passenger.class || 'CC'}
              </AppText>
            </View>
          </View>

          {/* Row 2: Passenger Name */}
          <View style={styles.passengerRow}>
            <AppText variant="micro" uppercase color="secondary" weight="medium" letterSpacing={0.6}>
              PASSENGER
            </AppText>
            <AppText variant="body" weight="bold" color="primary" style={styles.valMargin} numberOfLines={1}>
              {ticket.passenger.name && ticket.passenger.name !== '-' ? ticket.passenger.name : 'Passenger'}
            </AppText>
          </View>
        </View>
      </View>

      {/* ================= PERFORATION NOTCH DIVIDER ================= */}
      <View style={styles.notchDividerContainer}>
        {/* Left circular cutout notch */}
        <View style={styles.notchLeft} />
        {/* Dashed line */}
        <View style={styles.dashedLine} />
        {/* Right circular cutout notch */}
        <View style={styles.notchRight} />
      </View>

      {/* ================= APPLE WALLET PNR & BARCODE STUB ================= */}
      <View style={styles.stubContainer}>
        {/* Top Header Row of Stub */}
        <View style={styles.stubHeader}>
          <AppText variant="micro" uppercase weight="bold" color="secondary" letterSpacing={0.8}>
            PNR REFERENCE
          </AppText>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCopy}
            style={styles.copyBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {copied ? (
              <Check size={12} color={Colors.appleGreen} strokeWidth={2.4} />
            ) : (
              <Copy size={12} color={Colors.appleSecondaryLabel} />
            )}
            <AppText
              variant="micro"
              weight="bold"
              color={copied ? 'success' : 'secondary'}
              uppercase
              style={styles.copyText}
            >
              {copied ? 'Copied' : 'Copy'}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Prominent PNR Display */}
        <AppText variant="title" weight="heavy" color="primary" letterSpacing={2} style={styles.pnrNumber}>
          {formattedPNR}
        </AppText>

        {/* Realistic Barcode Visual Pattern */}
        <View style={styles.barcodeBox}>
          <View style={styles.barcodeBars}>
            {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2].map(
              (w, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.barcodeBar,
                    { width: w, marginRight: idx % 3 === 0 ? 3 : 2 },
                  ]}
                />
              )
            )}
          </View>
        </View>

        {/* Stub Footer */}
        <View style={styles.stubFooter}>
          <AppText variant="micro" weight="medium" color="secondary" uppercase letterSpacing={0.5}>
            DIGITAL BOARDING PASS
          </AppText>
          <AppText variant="micro" weight="medium" color="secondary" uppercase letterSpacing={0.5}>
            SHOW TO TTE ON TRAIN
          </AppText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 12,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: Colors.appleGroupedBg,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  upperSection: {
    padding: 18,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  servicePill: {
    backgroundColor: Colors.appleSecondaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
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
  trainName: {
    fontSize: 20,
    marginTop: 2,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  routePadding: {
    paddingVertical: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.appleSeparator,
    marginVertical: 12,
  },
  detailsGrid: {
    paddingTop: 2,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridCol: {
    flex: 1,
  },
  passengerRow: {
    marginTop: 12,
  },
  valMargin: {
    marginTop: 3,
  },

  // Perforation Divider & Notches
  notchDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    position: 'relative',
  },
  notchLeft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginLeft: -12,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginRight: -12,
  },

  // Apple Wallet PNR & Barcode Stub
  stubContainer: {
    backgroundColor: '#161618',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  stubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.appleSecondaryBg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  copyText: {
    marginLeft: 4,
    fontSize: 11,
  },
  pnrNumber: {
    fontSize: 24,
    marginVertical: 10,
    textAlign: 'center',
  },
  barcodeBox: {
    backgroundColor: '#0A0A0C',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  barcodeBars: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
  },
  barcodeBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  stubFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.appleSeparator,
  },
});
