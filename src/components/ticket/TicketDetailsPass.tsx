import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Copy, Check, Train, Calendar } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { NormalizedTicket } from '../../types/ticket';
import { AppText } from '../common/AppText';
import { StatusBadge } from '../common/StatusBadge';
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

  // Format PNR with spaces: e.g. 8354 766 445
  const formattedPNR = ticket.pnr.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');

  // Compute clean train name and train category
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

  return (
    <View style={styles.cardContainer}>
      {/* ================= UPPER SECTION ================= */}
      <View style={styles.upperSection}>
        {/* Header Row: Status Badge & Journey Date */}
        <View style={styles.headerRow}>
          <StatusBadge
            label={`${ticket.source || 'IRCTC'} ${ticket.status || 'CONFIRMED'}`}
            variant={ticket.status === 'WAITLISTED' || ticket.status === 'RAC' ? 'orange' : 'success'}
            dot
          />
          <View style={styles.dateBadge}>
            <Calendar size={12} color={Colors.textSecondary} style={styles.dateIcon} />
            <AppText variant="tiny" weight="bold" color="secondary" uppercase>
              {ticket.journey.date}
            </AppText>
          </View>
        </View>

        {/* Dedicated Prominent Train Banner */}
        <View style={styles.trainBanner}>
          <View style={styles.trainIconBox}>
            <Train size={18} color={Colors.primary} />
          </View>
          <View style={styles.trainInfoCol}>
            <View style={styles.trainTopRow}>
              <View style={styles.trainPill}>
                <AppText variant="micro" weight="heavy" color="orange" letterSpacing={0.8}>
                  {ticket.train.number ? `TRAIN ${ticket.train.number}` : 'TRAIN'}
                </AppText>
              </View>
              <AppText variant="micro" weight="heavy" color="muted" uppercase letterSpacing={0.6}>
                {trainCategory}
              </AppText>
            </View>
            <AppText variant="bodyLg" weight="heavy" color="primary" numberOfLines={1} style={styles.trainName}>
              {effectiveTrainName}
            </AppText>
          </View>
        </View>

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

        {/* Passenger & Seat Details Grid (100% Genuine SMS Data) */}
        <View style={styles.detailsGrid}>
          {/* Row 1: Passenger Name and Travel Class */}
          <View style={styles.gridRow}>
            <View style={styles.gridColLeft}>
              <AppText variant="micro" uppercase color="muted" weight="bold">
                PASSENGER
              </AppText>
              <AppText variant="body" weight="bold" color="primary" style={styles.valMargin} numberOfLines={1}>
                {ticket.passenger.name && ticket.passenger.name !== '-' ? ticket.passenger.name : '-'}
              </AppText>
              <AppText variant="tiny" color="secondary" style={styles.subLabelMargin}>
                Status: {ticket.passenger.bookingStatus || 'CONFIRMED'}
              </AppText>
            </View>

            <View style={styles.gridColRight}>
              <AppText variant="micro" uppercase color="muted" weight="bold">
                TRAVEL CLASS
              </AppText>
              <AppText variant="body" weight="bold" color="primary" style={styles.valMargin} numberOfLines={1}>
                {ticket.passenger.className || ticket.passenger.class || 'CC'}
              </AppText>
              <AppText variant="tiny" color="secondary" style={styles.subLabelMargin}>
                Class Code: {ticket.passenger.class || 'CC'}
              </AppText>
            </View>
          </View>

          {/* Row 2: Coach and Seat */}
          <View style={[styles.gridRow, styles.gridRowSpacing]}>
            <View style={styles.gridColLeft}>
              <AppText variant="micro" uppercase color="muted" weight="bold">
                COACH
              </AppText>
              <AppText variant="heading" weight="heavy" color="orange" style={styles.valMargin}>
                {ticket.passenger.coach || '-'}
              </AppText>
            </View>

            <View style={styles.gridColRight}>
              <AppText variant="micro" uppercase color="muted" weight="bold">
                SEAT NUMBER
              </AppText>
              <AppText variant="heading" weight="heavy" color="primary" style={styles.valMargin}>
                {ticket.passenger.seat || '-'}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      {/* ================= PERFORATION NOTCH DIVIDER ================= */}
      <View style={styles.notchDividerContainer}>
        {/* Left circular cutout notch */}
        <View style={styles.notchLeft} />
        {/* Dashed line */}
        <View style={styles.perforationLineContainer}>
          <View style={styles.perforationLine} />
        </View>
        {/* Right circular cutout notch */}
        <View style={styles.notchRight} />
      </View>

      {/* ================= ORANGE PNR STUB ================= */}
      <View style={styles.orangeStub}>
        {/* Top Header Row of Stub */}
        <View style={styles.stubHeader}>
          <AppText variant="micro" uppercase weight="heavy" color="dark" letterSpacing={0.8}>
            PNR REFERENCE
          </AppText>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCopy}
            style={styles.copyBtn}
          >
            {copied ? (
              <Check size={12} color="#0E0E0F" />
            ) : (
              <Copy size={12} color="#0E0E0F" />
            )}
            <AppText variant="micro" weight="bold" color="dark" uppercase style={styles.copyText}>
              {copied ? 'COPIED' : 'COPY'}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Prominent PNR Display */}
        <AppText variant="title" weight="heavy" color="dark" letterSpacing={1.2} style={styles.pnrNumber}>
          {formattedPNR}
        </AppText>

        {/* Realistic Barcode Visual Pattern */}
        <View style={styles.barcodeBox}>
          <View style={styles.barcodeBars}>
            {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2].map((w, idx) => (
              <View
                key={idx}
                style={[
                  styles.barcodeBar,
                  { width: w, marginRight: (idx % 3 === 0 ? 3 : 2) },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Stub Footer */}
        <View style={styles.stubFooter}>
          <AppText variant="micro" weight="bold" color="dark" uppercase letterSpacing={0.5}>
            {ticket.bookingId ? `PASS ${ticket.bookingId}` : 'DIGITAL BOARDING PASS'}
          </AppText>
          {ticket.fare?.total ? (
            <AppText variant="micro" weight="heavy" color="dark" uppercase letterSpacing={0.5}>
              {`₹${ticket.fare.total.toLocaleString('en-IN')} FARE PAID`}
            </AppText>
          ) : (
            <AppText variant="micro" weight="heavy" color="dark" uppercase letterSpacing={0.5}>
              IRCTC OFFICIAL
            </AppText>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  upperSection: {
    padding: Spacing.lg,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateIcon: {
    marginRight: 4,
  },
  trainBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  trainIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trainInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  trainTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  trainPill: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginRight: 8,
  },
  trainName: {
    marginTop: 1,
    letterSpacing: 0.3,
  },
  routePadding: {
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 12,
  },
  detailsGrid: {
    paddingTop: 4,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  gridRowSpacing: {
    marginTop: 14,
  },
  gridColLeft: {
    flex: 1,
    marginRight: 12,
  },
  gridColRight: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  valMargin: {
    marginTop: 4,
  },
  subLabelMargin: {
    marginTop: 2,
  },

  // Perforation Divider & Notches
  notchDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    backgroundColor: 'transparent',
    overflow: 'visible',
    position: 'relative',
  },
  notchLeft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginLeft: -12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderLeftWidth: 0,
    zIndex: 10,
  },
  perforationLineContainer: {
    flex: 1,
    height: 1,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  perforationLine: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    height: 0,
  },
  notchRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginRight: -12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRightWidth: 0,
    zIndex: 10,
  },

  // Orange PNR Stub
  orangeStub: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: 16,
    paddingBottom: 20,
  },
  stubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  copyText: {
    marginLeft: 4,
    fontSize: 10,
  },
  pnrNumber: {
    marginTop: 6,
    marginBottom: 12,
  },
  barcodeBox: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeBars: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
  },
  barcodeBar: {
    height: '100%',
    backgroundColor: Colors.creme,
    borderRadius: 1,
  },
  stubFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
  },
});
