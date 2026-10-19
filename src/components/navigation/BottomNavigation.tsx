import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ticket, Settings } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { AppText } from '../common/AppText';
import { ScreenName } from '../../types/ticket';

interface BottomNavigationProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
  onAddPress?: () => void;
}

/**
 * Filled Ticket Icon for focused/active state
 */
const FilledTicketIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = Colors.primary,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
      fill={color}
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M13 5v2" stroke="#0D0D0E" strokeWidth={2} strokeLinecap="round" />
    <Path d="M13 11v2" stroke="#0D0D0E" strokeWidth={2} strokeLinecap="round" />
    <Path d="M13 17v2" stroke="#0D0D0E" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

/**
 * Filled Settings Gear Icon for focused/active state
 */
const FilledSettingsIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = Colors.primary,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
      fill={color}
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="3.2" fill="#0D0D0E" stroke={color} strokeWidth={1.2} />
  </Svg>
);

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onNavigate,
}) => {
  const isTicketsActive = currentScreen === 'Home' || currentScreen === 'TicketDetails';
  const isSettingsActive = currentScreen === 'Settings';

  return (
    <View style={styles.container}>
      {/* Tickets / Wallet Tab */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onNavigate('Home')}
        style={styles.navItem}
        hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
        accessibilityRole="tab"
        accessibilityState={{ selected: isTicketsActive }}
        accessibilityLabel="Tickets"
      >
        <View style={styles.iconWrapper}>
          {isTicketsActive ? (
            <FilledTicketIcon size={24} color={Colors.primary} />
          ) : (
            <Ticket size={24} color={Colors.textMuted} strokeWidth={1.8} />
          )}
        </View>
        <AppText
          variant="tiny"
          weight={isTicketsActive ? 'bold' : 'medium'}
          color={isTicketsActive ? 'scarlet' : 'muted'}
          letterSpacing={0.2}
          style={styles.navLabel}
        >
          Tickets
        </AppText>
      </TouchableOpacity>

      {/* Settings Tab */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onNavigate('Settings')}
        style={styles.navItem}
        hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
        accessibilityRole="tab"
        accessibilityState={{ selected: isSettingsActive }}
        accessibilityLabel="Settings"
      >
        <View style={styles.iconWrapper}>
          {isSettingsActive ? (
            <FilledSettingsIcon size={24} color={Colors.primary} />
          ) : (
            <Settings size={24} color={Colors.textMuted} strokeWidth={1.8} />
          )}
        </View>
        <AppText
          variant="tiny"
          weight={isSettingsActive ? 'bold' : 'medium'}
          color={isSettingsActive ? 'scarlet' : 'muted'}
          letterSpacing={0.2}
          style={styles.navLabel}
        >
          Settings
        </AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D0D0E',
    borderTopWidth: 0.8,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingHorizontal: 54,
    minHeight: 66,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
    paddingVertical: 2,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  navLabel: {
    marginTop: 3,
    fontSize: 11,
  },
});
