import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { AppText } from '../common/AppText';

interface StationRouteProps {
  fromCode: string;
  fromName?: string;
  departureTime?: string;
  toCode: string;
  toName?: string;
  arrivalTime?: string;
  duration?: string;
  compact?: boolean;
  style?: ViewStyle;
}

export const StationRoute: React.FC<StationRouteProps> = ({
  fromCode,
  fromName,
  departureTime,
  toCode,
  toName,
  arrivalTime,
  duration,
  compact = false,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Origin */}
      <View style={styles.stationBlockLeft}>
        <AppText variant={compact ? 'title' : 'stationCode'} weight="heavy" color="primary">
          {fromCode}
        </AppText>
        {fromName && (
          <AppText variant="tiny" color="secondary" numberOfLines={1}>
            {fromName}
          </AppText>
        )}
        {departureTime && (
          <AppText variant="bodyLg" weight="bold" color="orange" style={styles.timeMargin}>
            {departureTime}
          </AppText>
        )}
      </View>

      {/* Middle Track Indicator */}
      <View style={styles.middleTrack}>
        {duration && (
          <AppText variant="micro" weight="bold" color="secondary" style={styles.durationText}>
            {duration}
          </AppText>
        )}
        <View style={styles.trackLineContainer}>
          <View style={styles.dot} />
          <View style={styles.trackLine} />
          <AppText variant="tiny" color="orange" style={styles.arrowText}>
            →
          </AppText>
          <View style={styles.trackLine} />
          <View style={styles.dot} />
        </View>
        <AppText variant="micro" color="muted" uppercase letterSpacing={0.5} style={styles.directText}>
          DIRECT
        </AppText>
      </View>

      {/* Destination */}
      <View style={styles.stationBlockRight}>
        <AppText variant={compact ? 'title' : 'stationCode'} weight="heavy" color="primary">
          {toCode}
        </AppText>
        {toName && (
          <AppText variant="tiny" color="secondary" numberOfLines={1}>
            {toName}
          </AppText>
        )}
        {arrivalTime && (
          <AppText variant="bodyLg" weight="bold" color="primary" style={styles.timeMargin}>
            {arrivalTime}
          </AppText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  stationBlockLeft: {
    alignItems: 'flex-start',
    flex: 1,
  },
  stationBlockRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  middleTrack: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  durationText: {
    marginBottom: 4,
  },
  trackLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  trackLine: {
    width: 24,
    height: 1,
    backgroundColor: Colors.borderSubtle,
  },
  arrowText: {
    marginHorizontal: 4,
    fontSize: 12,
  },
  directText: {
    marginTop: 4,
  },
  timeMargin: {
    marginTop: 6,
  },
});
