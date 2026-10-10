import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../../theme/colors';
import { AppText } from '../common/AppText';
import { ShareTicketData } from '../../services/shareTicketService';

interface ShareTicketCardProps {
  data: ShareTicketData;
}

export const ShareTicketCard: React.FC<ShareTicketCardProps> = ({ data }) => {
  return (
    <View style={styles.cardContainer}>
      {/* Top Orange Stripe */}
      <View style={styles.topStripe} />

      {/* Row 1: Train Type Badge, Train Name & Status Pill */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.trainTypeBadge}>
            <AppText variant="tiny" weight="heavy" color="orange" uppercase style={styles.trainTypeText}>
              {data.trainType || 'VANDE BHARAT'}
            </AppText>
          </View>
          <AppText
            variant="caption"
            weight="heavy"
            color="primary"
            numberOfLines={1}
            style={styles.trainTitleText}
          >
            {data.trainNumber} {data.trainName}
          </AppText>
        </View>

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <AppText variant="micro" weight="heavy" color="success">
            {data.isLive ? 'LIVE' : (data.status || 'CONFIRMED')}
          </AppText>
        </View>
      </View>

      {/* Row 2: Origin, Times, Arrow & Destination */}
      <View style={styles.routeRow}>
        <View style={styles.originCol}>
          <AppText variant="heading" weight="heavy" color="primary" style={styles.stationCode}>
            {data.fromCode}
          </AppText>
          <AppText variant="caption" weight="heavy" color="success" style={styles.stationTimeLeft}>
            {data.fromTime}
          </AppText>
        </View>

        <View style={styles.arrowContainer}>
          <View style={styles.dashLine} />
          <AppText variant="caption" weight="heavy" color="orange" style={styles.arrowGlyph}>
            →
          </AppText>
          <View style={styles.dashLine} />
        </View>

        <View style={styles.destCol}>
          <AppText variant="caption" weight="bold" color="secondary" style={styles.stationTimeRight}>
            {data.toTime}
          </AppText>
          <AppText variant="heading" weight="heavy" color="primary" style={styles.stationCode}>
            {data.toCode}
          </AppText>
        </View>
      </View>

      {/* Perforation Line with Circular Notches */}
      <View style={styles.perforationWrapper}>
        <View style={styles.notchLeft} />
        <View style={styles.dashedDivider} />
        <View style={styles.notchRight} />
      </View>

      {/* Row 3: Coach/Seat, Boarding Platform, PNR & Status */}
      <View style={styles.bottomRow}>
        {/* Scarlet Coach & Seat Pill */}
        <View style={styles.seatPill}>
          <AppText variant="body" weight="heavy" color="dark" style={styles.seatPillText}>
            {data.coach} • {data.seat}
          </AppText>
        </View>

        {/* Boarding Info Center */}
        <View style={styles.boardingCol}>
          <AppText variant="micro" weight="heavy" color="secondary" uppercase letterSpacing={1}>
            BOARDING
          </AppText>
          <AppText variant="caption" weight="heavy" color="primary" style={{ marginTop: 2 }}>
            Plat {data.platform || '5'} • #{data.pillar || '11'}
          </AppText>
        </View>

        {/* PNR & CNF Right */}
        <View style={styles.pnrCol}>
          <AppText variant="caption" weight="heavy" color="orange" letterSpacing={0.5}>
            {data.pnr}
          </AppText>
          <AppText variant="micro" weight="heavy" color="success" style={{ marginTop: 2 }}>
            {data.status || 'CNF'}
          </AppText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#151515',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
    paddingTop: 10,
    paddingBottom: 16,
    width: '100%',
  },
  topStripe: {
    height: 4,
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    borderRadius: 2,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  trainTypeBadge: {
    backgroundColor: '#38231C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  trainTypeText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  trainTitleText: {
    fontSize: 13,
    flexShrink: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12291E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 5,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  originCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  destCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stationCode: {
    fontSize: 22,
    letterSpacing: 0.5,
  },
  stationTimeLeft: {
    marginLeft: 8,
    fontSize: 13,
  },
  stationTimeRight: {
    marginRight: 8,
    fontSize: 13,
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dashLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#383630',
  },
  arrowGlyph: {
    marginHorizontal: 4,
    fontSize: 14,
  },
  perforationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notchLeft: {
    width: 12,
    height: 24,
    backgroundColor: Colors.background,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  notchRight: {
    width: 12,
    height: 24,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  dashedDivider: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#2E2D28',
    marginHorizontal: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  seatPill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  seatPillText: {
    fontSize: 15,
  },
  boardingCol: {
    alignItems: 'center',
  },
  pnrCol: {
    alignItems: 'flex-end',
  },
});
