import React, { useState, useEffect } from 'react';
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
  Bell,
  Shield,
  Layers,
  HardDrive,
  Download,
  Trash2,
  Info,
  ExternalLink,
  CheckCircle,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { AppText } from '../components/common/AppText';
import { StatusBadge } from '../components/common/StatusBadge';
import { SectionHeader } from '../components/common/SectionHeader';
import { checkNotificationAccess, openNotificationSettings } from '../services/notificationService';

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
  const [hasNotificationAccess, setHasNotificationAccess] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const granted = await checkNotificationAccess();
    setHasNotificationAccess(granted);
  };

  const handleOpenSettings = async () => {
    await openNotificationSettings();
    setTimeout(() => {
      checkStatus();
    }, 1000);
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onBack}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>

        <AppText variant="subheading" weight="heavy" uppercase letterSpacing={1} color="primary">
          SETTINGS
        </AppText>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= NOTIFICATION ACCESS ================= */}
        <SectionHeader title="PERMISSIONS & LISTENER" />

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Bell size={18} color={hasNotificationAccess ? Colors.success : Colors.primary} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <AppText variant="body" weight="bold" color="primary">
                Notification Access
              </AppText>
              <AppText variant="tiny" color="secondary" style={{ marginTop: 2 }}>
                Enables automatic background detection of train booking notifications
              </AppText>
            </View>
            <StatusBadge
              label={hasNotificationAccess ? 'ACTIVE' : 'ACTION NEEDED'}
              variant={hasNotificationAccess ? 'success' : 'orange'}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenSettings}
            style={styles.actionRowBtn}
          >
            <AppText variant="caption" weight="bold" color="orange">
              {hasNotificationAccess ? 'Review Android Settings' : 'Grant Notification Access →'}
            </AppText>
            <ExternalLink size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ================= AUTOMATIC DETECTION ================= */}
        <SectionHeader title="DETECTION PREFERENCES" />

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Shield size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="bold" color="primary">
                Automatic Detection
              </AppText>
              <AppText variant="tiny" color="secondary" style={{ marginTop: 2 }}>
                Prompt to verify tickets upon booking SMS arrival
              </AppText>
            </View>
            <Switch
              value={autoDetect}
              onValueChange={setAutoDetect}
              trackColor={{ false: Colors.surfaceHighest, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ================= SUPPORTED SOURCES ================= */}
        <SectionHeader title="SUPPORTED BOOKING SOURCES" />

        <View style={styles.settingCard}>
          <View style={styles.sourceItem}>
            <View style={styles.sourceItemLeft}>
              <CheckCircle size={16} color={Colors.success} style={{ marginRight: 8 }} />
              <View>
                <AppText variant="body" weight="bold" color="primary">
                  IRCTC Official SMS & Notifications
                </AppText>
                <AppText variant="tiny" color="secondary">
                  PNR, Train Number, Coach, Seat, Fare, Boarding Point
                </AppText>
              </View>
            </View>
            <StatusBadge label="READY" variant="success" />
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.sourceItem}>
            <View style={styles.sourceItemLeft}>
              <CheckCircle size={16} color={Colors.success} style={{ marginRight: 8 }} />
              <View>
                <AppText variant="body" weight="bold" color="primary">
                  redRail by redBus
                </AppText>
                <AppText variant="tiny" color="secondary">
                  Booking ID, PNR, Train Name, Passenger Name, Route
                </AppText>
              </View>
            </View>
            <StatusBadge label="READY" variant="success" />
          </View>
        </View>

        {/* ================= LOCAL DATA ================= */}
        <SectionHeader title="LOCAL WALLET DATA" />

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <HardDrive size={18} color={Colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="bold" color="primary">
                SQLite Storage
              </AppText>
              <AppText variant="tiny" color="secondary" style={{ marginTop: 2 }}>
                {`${ticketCount} total tickets stored locally on device`}
              </AppText>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onExportTickets}
            style={styles.settingBtnRow}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Download size={16} color={Colors.textPrimary} style={{ marginRight: 8 }} />
              <AppText variant="caption" weight="medium" color="primary">
                Export Tickets (JSON)
              </AppText>
            </View>
          </TouchableOpacity>

          <View style={styles.cardDivider} />

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert(
                'Delete All Tickets',
                'Are you sure you want to delete all tickets from your local wallet? This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: onClearAllTickets },
                ]
              );
            }}
            style={styles.settingBtnRow}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Trash2 size={16} color={Colors.error} style={{ marginRight: 8 }} />
              <AppText variant="caption" weight="medium" color="orange">
                Delete All Tickets
              </AppText>
            </View>
          </TouchableOpacity>
        </View>

        {/* ================= ABOUT NORA ================= */}
        <SectionHeader title="ABOUT NORA" />

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Info size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="bold" color="primary">
                NORA · Version 1.0.0
              </AppText>
              <AppText variant="tiny" color="secondary" style={{ marginTop: 2 }}>
                Personal Train Ticket Wallet · Zero Cloud Tracking · 100% Offline
              </AppText>
            </View>
          </View>

          {onViewOnboarding && (
            <View>
              <View style={styles.cardDivider} />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onViewOnboarding}
                style={styles.settingBtnRow}
              >
                <AppText variant="caption" weight="medium" color="orange">
                  Replay App Onboarding →
                </AppText>
              </TouchableOpacity>
            </View>
          )}
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
    paddingTop: 8,
    paddingBottom: 36,
  },
  settingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadiusMd,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Spacing.borderRadiusSm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sourceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 10,
  },
  settingBtnRow: {
    paddingVertical: 6,
  },
});
