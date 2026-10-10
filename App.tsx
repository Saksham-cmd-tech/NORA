import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Linking } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from './src/theme/colors';
import { NormalizedTicket, ScreenName } from './src/types/ticket';
import { ticketRepository } from './src/database/repositories/ticketRepository';
import {
  subscribeToNotificationEvents,
  scanSmsForTickets,
} from './src/services/notificationService';
import {
  scheduleJourneyReminders,
  cancelJourneyReminders,
  showTicketDetectedNotification,
  getInitialNotificationAction,
  subscribeToNotificationActions,
  NotificationActionPayload,
  dismissLiveJourneyNotification,
} from './src/services/reminderNotificationService';
import { isTicketValidAndUpcoming } from './src/utils/dateUtils';
import { updateActiveTicketWidget } from './src/services/widgetService';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TicketDetailsScreen } from './src/screens/TicketDetailsScreen';
import { TrainStatusScreen } from './src/screens/TrainStatusScreen';
import { AddTicketScreen } from './src/screens/AddTicketScreen';
import { VerifyDetailsScreen } from './src/screens/VerifyDetailsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BottomNavigation } from './src/components/navigation/BottomNavigation';
import { NoraModal } from './src/components/common/NoraModal';

export default function App() {
  const [tickets, setTickets] = useState<NormalizedTicket[]>([]);
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Onboarding');
  const [selectedTicket, setSelectedTicket] = useState<NormalizedTicket | null>(null);
  const [pendingTicket, setPendingTicket] = useState<NormalizedTicket | null>(null);
  const [autoOpenShareModal, setAutoOpenShareModal] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // App-wide dark styled modal matching NORA aesthetic
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    iconVariant?: 'orange' | 'green';
    tickets?: NormalizedTicket[];
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
  } | null>(null);

  useEffect(() => {
    bootstrap();

    // Check if app was launched via a notification action button (cold start)
    getInitialNotificationAction().then((action) => {
      if (action) {
        handleNotificationAction(action);
      }
    });

    // Listen for notification action clicks while app is open or in background (warm start)
    const unsubActions = subscribeToNotificationActions((action) => {
      handleNotificationAction(action);
    });

    // Subscribe to Android NotificationListenerService events (incoming SMS / push)
    const unsubscribe = subscribeToNotificationEvents(async (detected) => {
      // 1. Post rich system notification to Android shade with contextual action buttons
      await showTicketDetectedNotification(detected);

      // 2. Schedule 2h and 1h exact pre-departure reminders
      await scheduleJourneyReminders(detected);

      // 3. Prompt user inside app if foregrounded
      setPendingTicket(detected);
      setCurrentScreen('VerifyDetails');
      setModalConfig({
        visible: true,
        title: 'New Booking Detected!',
        subtitle: `Detected a booking notification from ${detected.source} for Train ${detected.train.number}. Review and confirm details below to save it to your wallet.`,
        iconVariant: 'orange',
        primaryButtonText: 'REVIEW DETAILS',
        onPrimaryPress: () => setModalConfig(null),
      });
    });

    return () => {
      unsubscribe();
      unsubActions();
    };
  }, []);

  const bootstrap = async () => {
    try {
      await ticketRepository.init();
      const hasCompleted = await ticketRepository.hasCompletedOnboarding();
      if (hasCompleted) {
        setCurrentScreen('Home');
      } else {
        setCurrentScreen('Onboarding');
      }
      await loadTickets();
    } catch (e) {
      console.log('[NORA App] Bootstrap error:', e);
      setCurrentScreen('Home');
    } finally {
      setIsReady(true);
    }
  };

  const handleNotificationAction = async (payload: NotificationActionPayload) => {
    if (!payload || !payload.actionType) return;
    if (payload.actionType === 'DISMISS_LIVE_ACTIVITY') {
      await dismissLiveJourneyNotification();
      return;
    }
    if (payload.actionType === 'OPEN_WALLET') {
      setCurrentScreen('Home');
      return;
    }
    const pnr = (payload.pnr || '').trim();
    let ticketToOpen: NormalizedTicket | null = null;
    if (pnr) {
      ticketToOpen = await ticketRepository.findTicketByPNR(pnr);
    }
    if (!ticketToOpen) {
      const all = await ticketRepository.getTickets();
      ticketToOpen =
        all.find((t) => t.train.number === payload.trainNumber || t.pnr === pnr) ||
        all[0] ||
        null;
    }

    if (ticketToOpen) {
      setSelectedTicket(ticketToOpen);
      switch (payload.actionType) {
        case 'TRAIN_STATUS':
        case 'COACH_POSITION':
          setAutoOpenShareModal(false);
          setCurrentScreen('TrainStatus');
          break;
        case 'SHARE_TRIP':
          setAutoOpenShareModal(true);
          setCurrentScreen('TicketDetails');
          break;
        case 'OPEN_ACTIVE_TICKET':
        case 'VIEW_TICKET':
        case 'CHECK_STATUS':
        default:
          setAutoOpenShareModal(false);
          setCurrentScreen('TicketDetails');
          break;
      }
    } else {
      setCurrentScreen('Home');
    }
  };

  const loadTickets = async () => {
    try {
      const all = await ticketRepository.getTickets();
      // Pass all tickets to state so HomeScreen can accurately display both UPCOMING and PAST tabs
      setTickets(all);

      // Keep journey reminders scheduled in Android AlarmManager
      const validUpcoming = all.filter(
        (t) =>
          isTicketValidAndUpcoming(t.journey?.date, t.status, t.journey?.departure) &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED'
      );
      for (const t of validUpcoming) {
        scheduleJourneyReminders(t).catch(() => {});
      }

      // Sync current active ticket to Android Home Screen Widget (or "No Active Ticket" if empty)
      const currentActive = validUpcoming[0] || null;
      await updateActiveTicketWidget(currentActive);
    } catch (e) {
      console.log('[NORA App] loadTickets error:', e);
    }
  };

  /**
   * Scans SMS inbox directly on physical phone, filters only valid upcoming tickets,
   * prunes expired tickets, schedules reminders, and prevents duplicates.
   */
  const handleScanAndCheckActiveTickets = async () => {
    try {
      const scanResult = await scanSmsForTickets();
      const detectedFromSms = Array.isArray(scanResult?.tickets) ? scanResult.tickets : [];
      let newlyDetectedCount = 0;

      for (const t of detectedFromSms) {
        if (isTicketValidAndUpcoming(t.journey?.date, t.status, t.journey?.departure)) {
          const { ticket: saved, isDuplicate } = await ticketRepository.saveOrMergeTicket(t);
          await scheduleJourneyReminders(saved);
          if (!isDuplicate) {
            await showTicketDetectedNotification(saved);
          }
          newlyDetectedCount++;
        }
      }

      const currentList = await ticketRepository.getTickets();
      setTickets(currentList);

      const activeValidList = currentList.filter(
        (t) =>
          isTicketValidAndUpcoming(t.journey?.date, t.status, t.journey?.departure) &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED'
      );
      const activeTickets = activeValidList;

      if (newlyDetectedCount > 0) {
        setCurrentScreen('Home');
        setModalConfig({
          visible: true,
          title: 'Tickets Detected from SMS!',
          subtitle: `Found and imported ${newlyDetectedCount} active train booking(s) directly from your SMS messages. Stored safely in your wallet without duplicates.`,
          iconVariant: 'orange',
          tickets: activeTickets,
          primaryButtonText: 'VIEW IN WALLET',
          onPrimaryPress: () => {
            setModalConfig(null);
            setCurrentScreen('Home');
          },
        });
      } else if (activeTickets.length > 0) {
        setCurrentScreen('Home');
        setModalConfig({
          visible: true,
          title: `Active Tickets (${activeTickets.length})`,
          subtitle: `Scanned your SMS inbox. You have ${activeTickets.length} active upcoming train journey(s) in your wallet.`,
          iconVariant: 'green',
          tickets: activeTickets,
          primaryButtonText: 'VIEW TICKETS',
          onPrimaryPress: () => {
            setModalConfig(null);
            setCurrentScreen('Home');
          },
        });
      } else {
        setModalConfig({
          visible: true,
          title: 'No Upcoming Tickets Found',
          subtitle: 'Scanned your SMS messages, but no IRCTC or redRail booking SMS was found. When a booking SMS arrives, it will automatically appear here.',
          iconVariant: 'orange',
          primaryButtonText: 'GOT IT',
          onPrimaryPress: () => setModalConfig(null),
        });
      }
    } catch (err) {
      console.log('[NORA App] handleScanAndCheckActiveTickets error:', err);
    }
  };

  const handleCompleteOnboarding = async () => {
    await ticketRepository.setOnboardingStatus(true);
    setCurrentScreen('Home');
  };

  const handleSelectTicket = (t: NormalizedTicket) => {
    setAutoOpenShareModal(false);
    setSelectedTicket(t);
    setCurrentScreen('TicketDetails');
  };

  const handleProceedToVerify = (t: NormalizedTicket) => {
    setPendingTicket(t);
    setCurrentScreen('VerifyDetails');
  };

  const handleSaveToWallet = async (t: NormalizedTicket) => {
    const { ticket: savedTicket, isDuplicate } = await ticketRepository.saveOrMergeTicket(t);
    await loadTickets();
    await scheduleJourneyReminders(savedTicket);
    if (!isDuplicate) {
      await showTicketDetectedNotification(savedTicket);
    }
    setSelectedTicket(savedTicket);
    setCurrentScreen('Home');
    if (isDuplicate) {
      setModalConfig({
        visible: true,
        title: 'Ticket Updated',
        subtitle: `Ticket with PNR ${savedTicket.pnr} is already in your wallet. The existing ticket was updated with new details instead of creating a duplicate.`,
        iconVariant: 'green',
        primaryButtonText: 'VIEW IN WALLET',
        onPrimaryPress: () => setModalConfig(null),
      });
    } else {
      setModalConfig({
        visible: true,
        title: 'Added to Wallet!',
        subtitle: `Ticket with PNR ${savedTicket.pnr} has been confirmed and saved to your personal offline wallet!`,
        iconVariant: 'green',
        primaryButtonText: 'VIEW TICKET',
        onPrimaryPress: () => {
          setModalConfig(null);
          setSelectedTicket(savedTicket);
          setCurrentScreen('TicketDetails');
        },
      });
    }
  };

  const handleExportTickets = () => {
    setModalConfig({
      visible: true,
      title: 'Export Complete',
      subtitle: `Exported ${tickets.length} tickets to local storage JSON.`,
      iconVariant: 'green',
      primaryButtonText: 'OK',
      onPrimaryPress: () => setModalConfig(null),
    });
  };

  const handleClearAllTickets = async () => {
    for (const t of tickets) {
      cancelJourneyReminders(t.pnr).catch(() => {});
    }
    await ticketRepository.clearAllTickets();
    await loadTickets();
    setSelectedTicket(null);
    setCurrentScreen('Home');
    setModalConfig({
      visible: true,
      title: 'Wallet Cleared',
      subtitle: 'All tickets have been removed from your local wallet.',
      iconVariant: 'orange',
      primaryButtonText: 'OK',
      onPrimaryPress: () => setModalConfig(null),
    });
  };

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" />

        <View style={styles.screenArea}>
          {currentScreen === 'Onboarding' && (
            <OnboardingScreen onComplete={handleCompleteOnboarding} />
          )}

          {currentScreen === 'Home' && (
            <HomeScreen
              tickets={tickets}
              onSelectTicket={handleSelectTicket}
              onNavigateAdd={() => setCurrentScreen('AddTicket')}
              onOpenSettings={() => setCurrentScreen('Settings')}
              onRefreshTickets={handleScanAndCheckActiveTickets}
            />
          )}

          {currentScreen === 'TicketDetails' && selectedTicket && (
            <TicketDetailsScreen
              ticket={selectedTicket}
              initialShareModalVisible={autoOpenShareModal}
              onBack={() => {
                setAutoOpenShareModal(false);
                setCurrentScreen('Home');
              }}
              onOpenSettings={() => setCurrentScreen('Settings')}
              onOpenTrainStatus={(t) => {
                setAutoOpenShareModal(false);
                setSelectedTicket(t);
                setCurrentScreen('TrainStatus');
              }}
            />
          )}

          {currentScreen === 'TrainStatus' && selectedTicket && (
            <TrainStatusScreen
              ticket={selectedTicket}
              onBack={() => setCurrentScreen('TicketDetails')}
            />
          )}

          {currentScreen === 'AddTicket' && (
            <AddTicketScreen
              onBack={() => setCurrentScreen('Home')}
              onProceedToVerify={handleProceedToVerify}
              onCheckActiveTickets={handleScanAndCheckActiveTickets}
            />
          )}

          {currentScreen === 'VerifyDetails' && pendingTicket && (
            <VerifyDetailsScreen
              initialTicket={pendingTicket}
              onBack={() => setCurrentScreen('AddTicket')}
              onSaveToWallet={handleSaveToWallet}
            />
          )}

          {currentScreen === 'Settings' && (
            <SettingsScreen
              onBack={() => setCurrentScreen('Home')}
              ticketCount={tickets.length}
              onExportTickets={handleExportTickets}
              onClearAllTickets={handleClearAllTickets}
              onViewOnboarding={() => setCurrentScreen('Onboarding')}
            />
          )}
        </View>

        {/* Persistent Bottom Navigation (Shown on Home and Settings only) */}
        {(currentScreen === 'Home' || currentScreen === 'Settings') && (
          <BottomNavigation
            currentScreen={currentScreen}
            onNavigate={(screen) => setCurrentScreen(screen)}
            onAddPress={() => setCurrentScreen('AddTicket')}
          />
        )}

        {/* App-wide custom matching NoraModal */}
        {modalConfig ? (
          <NoraModal
            visible={modalConfig.visible}
            title={modalConfig.title}
            subtitle={modalConfig.subtitle}
            iconVariant={modalConfig.iconVariant}
            tickets={modalConfig.tickets}
            primaryButtonText={modalConfig.primaryButtonText}
            onPrimaryPress={modalConfig.onPrimaryPress}
            onClose={() => setModalConfig(null)}
          />
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenArea: {
    flex: 1,
  },
});
