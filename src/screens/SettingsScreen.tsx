import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  Bell,
  Moon,
  HardDrive,
  Download,
  ShieldCheck,
  Lock,
  Info,
  Sparkles,
  Trash2,
  Check,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { AppText } from '../components/common/AppText';

interface SettingsScreenProps {
  onBack: () => void;
  ticketCount: number;
  onExportTickets: () => void;
  onClearAllTickets: () => void;
  onViewOnboarding?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  ticketCount,
  onExportTickets,
  onClearAllTickets,
  onViewOnboarding,
}) => {
  const [journeyAlerts, setJourneyAlerts] = useState(true);

  const handleDeletePress = () => {
    Alert.alert(
      'Delete All Tickets',
      'Are you sure you want to remove all tickets from your local wallet? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onClearAllTickets },
      ]
    );
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Apple-style Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={Colors.appleLabel} />
        </TouchableOpacity>

        <AppText variant="bodyLg" weight="bold" color="primary">
          Settings
        </AppText>

        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= PREFERENCES ================= */}
        <AppText
          variant="micro"
          weight="bold"
          color="secondary"
          uppercase
          letterSpacing={0.8}
          style={styles.groupHeader}
        >
          PREFERENCES
        </AppText>

        <View style={styles.groupCard}>
          {/* Departure Reminders */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.appleDestructive }]}>
              <Bell size={16} color="#FFFFFF" />
            </View>
            <View style={styles.rowContent}>
              <AppText variant="body" weight="medium" color="primary">
                Departure Reminders
              </AppText>
              <AppText variant="tiny" color="secondary" style={styles.rowSubtitle}>
                Alerts 2 hours and 1 hour before departure
              </AppText>
            </View>
            <Switch
              value={journeyAlerts}
              onValueChange={setJourneyAlerts}
              trackColor={{ false: Colors.appleSecondaryBg, true: Colors.appleGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.separator} />

          {/* Appearance */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.appleIndigo }]}>
              <Moon size={16} color="#FFFFFF" />
            </View>
            <View style={styles.rowContent}>
              <AppText variant="body" weight="medium" color="primary">
                Appearance
              </AppText>
            </View>
            <AppText variant="body" color="secondary" style={{ marginRight: 6 }}>
              Dark
            </AppText>
          </View>
        </View>

        {/* ================= WALLET STORAGE ================= */}
        <AppText
          variant="micro"
          weight="bold"
          color="secondary"
          uppercase
          letterSpacing={0.8}
          style={styles.groupHeader}
        >
          WALLET STORAGE
        </AppText>

        <View style={styles.groupCard}>
          {/* Stored Tickets */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.appleBlue }]}>
              <HardDrive size={16} color="#FFFFFF" />
            </View>
            <View style={styles.rowContent}>
              <AppText variant="body" weight="medium" color="primary">
                Storage Engine
              </AppText>
              <AppText variant="tiny" color="secondary" style={styles.rowSubtitle}>
                Encrypted SQLite database on device
              </AppText>
            </View>
            <AppText variant="body" weight="medium" color="secondary">
              {`${ticketCount} ${ticketCount === 1 ? 'ticket' : 'tickets'}`}
            </AppText>
          </View>

          <View style={styles.separator} />

          {/* Export Tickets */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onExportTickets}
            style={styles.row}
          >
            <View style={[styles.iconBox, { backgroundColor: Colors.appleGreen }]}>
              <Download size={16} color="#FFFFFF" />
            </View>
            <View style={styles.rowContent}>
              <AppText variant="body" weight="medium" color="primary">
                Export Tickets (JSON)
              </AppText>
            </View>
            <ChevronRight size={18} color={Colors.appleTertiaryLabel} />
          </TouchableOpacity>
        </View>

        {/* ================= DATA & PRIVACY ================= */}
        <AppText
          variant="micro"
          weight="bold"
          color="secondary"
          uppercase
          letterSpacing={0.8}
          style={styles.groupHeader}
        >
          DATA & PRIVACY
        </AppText>

        <View style={styles.groupCard}>
          {/* Zero Cloud Tracking */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.appleTeal }]}>
              <ShieldCheck size={16} color="#FFFFFF" />
            </View>
            <View style={styles.rowContent}>
              <AppText variant="body" weight="medium" color="primary">
                100% Offline Storage
              </AppText>
              <AppText variant="tiny" color="secondary" style={styles.rowSubtitle}>
                No analytics, servers, or cloud transmission
              </AppText>
            </View>
            <View style={styles.activePill}>
              <Check size={14} color={Colors.appleGreen} strokeWidth={2.6} />
            </View>
          </View>

          <View style={styles.separator} />

          {/* Sensitive Permissions */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.appleOrange }]}>
              <Lock size={16} color="#FFFFFF" />
            </View>
            <View style={styles.rowContent}>
              <AppText variant="body" weight="medium" color="primary">
                Sensitive Permissions
              </AppText>
              <AppText variant="tiny" color="secondary" style={styles.rowSubtitle}>
                No SMS or notification access required
              </AppText>
            </View>
            <AppText variant="body" weight="medium" color="secondary">
              None
            </AppText>
          </View>
        </View>

        {/* ================= ABOUT NORA ================= */}
        <AppText
          variant="micro"
          weight="bold"
          color="secondary"
          uppercase
          letterSpacing={0.8}
          style={styles.groupHeader}
        >
          ABOUT
        </AppText>

        <View style={styles.groupCard}>
          {/* Version */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.appleSecondaryLabel }]}>
              <Info size={16} color="#FFFFFF" />
            </View>
            <View style={styles.rowContent}>
              <AppText variant="body" weight="medium" color="primary">
                Version
              </AppText>
            </View>
            <AppText variant="body" color="secondary">
              1.2.0 (Build 2026.10)
            </AppText>
          </View>

          {onViewOnboarding && (
            <>
              <View style={styles.separator} />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onViewOnboarding}
                style={styles.row}
              >
                <View style={[styles.iconBox, { backgroundColor: Colors.applePurple }]}>
                  <Sparkles size={16} color="#FFFFFF" />
                </View>
                <View style={styles.rowContent}>
                  <AppText variant="body" weight="medium" color="primary">
                    Replay Welcome Guide
                  </AppText>
                </View>
                <ChevronRight size={18} color={Colors.appleTertiaryLabel} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ================= DESTRUCTIVE SECTION ================= */}
        <View style={[styles.groupCard, styles.destructiveCard]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDeletePress}
            style={styles.row}
          >
            <View style={[styles.iconBox, { backgroundColor: Colors.appleDestructive }]}>
              <Trash2 size={16} color="#FFFFFF" />
            </View>
            <View style={styles.rowContent}>
              <AppText variant="body" weight="bold" color="orange" style={{ color: Colors.appleDestructive }}>
                Delete All Tickets
              </AppText>
            </View>
          </TouchableOpacity>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.appleSeparator,
  },
  backButton: {
    padding: 4,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 52,
    paddingVertical: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    marginRight: 8,
  },
  rowSubtitle: {
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.appleSeparator,
    marginLeft: 58,
  },
  activePill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveCard: {
    marginTop: 28,
  },
});
