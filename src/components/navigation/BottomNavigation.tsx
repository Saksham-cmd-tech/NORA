import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ticket, Plus, Settings } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { AppText } from '../common/AppText';
import { ScreenName } from '../../types/ticket';

interface BottomNavigationProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
  onAddPress: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onNavigate,
  onAddPress,
}) => {
  const isTicketsActive = currentScreen === 'Home' || currentScreen === 'TicketDetails';
  const isSettingsActive = currentScreen === 'Settings';

  return (
    <View style={styles.container}>
      {/* Tickets Tab */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onNavigate('Home')}
        style={styles.navItem}
      >
        <Ticket
          size={18}
          color={isTicketsActive ? Colors.primary : Colors.textMuted}
        />
        <AppText
          variant="micro"
          weight="bold"
          uppercase
          letterSpacing={0.8}
          color={isTicketsActive ? 'orange' : 'muted'}
          style={styles.navLabel}
        >
          TICKETS
        </AppText>
      </TouchableOpacity>

      {/* Center Floating Plus Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onAddPress}
        style={styles.addBtn}
      >
        <Plus size={22} color="#000000" strokeWidth={2.8} />
      </TouchableOpacity>

      {/* Settings Tab */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onNavigate('Settings')}
        style={styles.navItem}
      >
        <Settings
          size={18}
          color={isSettingsActive ? Colors.primary : Colors.textMuted}
        />
        <AppText
          variant="micro"
          weight="bold"
          uppercase
          letterSpacing={0.8}
          color={isSettingsActive ? 'orange' : 'muted'}
          style={styles.navLabel}
        >
          SETTINGS
        </AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 64,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navLabel: {
    marginTop: 4,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
    marginHorizontal: 16,
  },
});
