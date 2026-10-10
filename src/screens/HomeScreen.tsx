import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { Ticket as TicketIcon, Bell, Plus, ShieldCheck, RefreshCw } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { NormalizedTicket } from '../types/ticket';
import { AppText } from '../components/common/AppText';
import { StatusBadge } from '../components/common/StatusBadge';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { SectionHeader } from '../components/common/SectionHeader';
import { AppButton } from '../components/common/AppButton';
import { TicketCard } from '../components/ticket/TicketCard';
import { PastJourneyCard } from '../components/ticket/PastJourneyCard';
import { NoraModal } from '../components/common/NoraModal';
import { isTicketValidAndUpcoming } from '../utils/dateUtils';
import { ShareTicketModal } from '../components/ticket/ShareTicketModal';
import { buildShareTicketData, ShareTicketData } from '../services/shareTicketService';

interface HomeScreenProps {
  tickets: NormalizedTicket[];
  onSelectTicket: (ticket: NormalizedTicket) => void;
  onNavigateAdd: () => void;
  onOpenSettings: () => void;
  onRefreshTickets?: () => Promise<void>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  tickets,
  onSelectTicket,
  onNavigateAdd,
  onOpenSettings,
  onRefreshTickets,
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareData, setShareData] = useState<ShareTicketData | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    iconVariant?: 'orange' | 'green';
    tickets?: NormalizedTicket[];
  } | null>(null);

  const upcomingTickets = tickets.filter(
    (t) =>
      isTicketValidAndUpcoming(t.journey?.date, t.status, t.journey?.departure) &&
      t.status !== 'COMPLETED' &&
      t.status !== 'CANCELLED'
  );
  const pastTickets = tickets.filter(
    (t) =>
      !isTicketValidAndUpcoming(t.journey?.date, t.status, t.journey?.departure) ||
      t.status === 'COMPLETED' ||
      t.status === 'CANCELLED'
  );

  const activeTicket = upcomingTickets[0];

  const handleCheckActiveTickets = async () => {
    if (onRefreshTickets) {
      await onRefreshTickets();
      return;
    }
    const currentUpcoming = tickets.filter(
      (t) =>
        isTicketValidAndUpcoming(t.journey?.date, t.status, t.journey?.departure) &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED'
    );
    if (currentUpcoming.length > 0) {
      setActiveTab('upcoming');
      setModalConfig({
        visible: true,
        title: `Active Tickets (${currentUpcoming.length})`,
        subtitle: `Found ${currentUpcoming.length} active journey(s) in your wallet. All details are saved offline.`,
        iconVariant: 'green',
        tickets: currentUpcoming,
      });
    } else {
      setModalConfig({
        visible: true,
        title: 'Check Active Tickets',
        subtitle: 'You have 0 active train tickets in your wallet.\n\nTickets booked via IRCTC or redRail will automatically appear here once notifications are received.',
        iconVariant: 'orange',
      });
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row with Active Badge & Check Active Button */}
        <View style={styles.headerRow}>
          <View>
            <AppText variant="tiny" weight="bold" color="orange" uppercase letterSpacing={1.5}>
              NORA
            </AppText>
            <AppText variant="title" weight="heavy" color="primary" style={styles.screenTitle}>
              My Tickets
            </AppText>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCheckActiveTickets}
              style={styles.headerCheckBtn}
            >
              <RefreshCw size={11} color={Colors.primary} style={{ marginRight: 4 }} />
              <AppText variant="micro" weight="bold" color="orange">
                CHECK
              </AppText>
            </TouchableOpacity>

            <StatusBadge
              label={`${upcomingTickets.length} ACTIVE`}
              variant="dark"
            />
          </View>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentWrapper}>
          <SegmentedControl
            options={[
              { value: 'upcoming', label: 'UPCOMING', count: upcomingTickets.length },
              { value: 'past', label: 'PAST', count: pastTickets.length },
            ]}
            selectedValue={activeTab}
            onSelect={(val) => setActiveTab(val as 'upcoming' | 'past')}
          />
        </View>

        {/* ================= UPCOMING TAB CONTENT ================= */}
        {activeTab === 'upcoming' && (
          <View>
            {activeTicket ? (
              <View>
                {upcomingTickets.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onPress={() => onSelectTicket(t)}
                    onShare={() => {
                      setShareData(buildShareTicketData(t));
                      setShareModalVisible(true);
                    }}
                    onAddToCalendar={async () => {
                      try {
                        const title = encodeURIComponent(`🚆 Train ${t.train.number}: ${t.journey.from} to ${t.journey.to}`);
                        const details = encodeURIComponent(
                          `Train: ${t.train.number} ${t.train.name || ''}\n` +
                          `Coach: ${t.passenger.coach || '-'} · Seat: ${t.passenger.seat || '-'}\n` +
                          `PNR: ${t.pnr}`
                        );
                        const location = encodeURIComponent(`${t.journey.fromName || t.journey.from} Railway Station`);
                        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
                        await Linking.openURL(calendarUrl);
                      } catch (e) {
                        console.log('Calendar error:', e);
                      }
                    }}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <TicketIcon size={32} color={Colors.primary} />
                </View>
                <AppText variant="subheading" weight="bold" color="primary" center style={styles.emptyTitle}>
                  Wallet is Empty
                </AppText>
                <AppText variant="caption" color="secondary" center style={styles.emptySubtitle}>
                  Train tickets booked via IRCTC or redRail will automatically appear here as digital boarding passes.
                </AppText>

                <View style={styles.emptyCtaWrapper}>
                  <AppButton
                    title="ADD TICKET / PASTE SMS"
                    variant="primary"
                    icon={<Plus size={16} color="#000000" />}
                    onPress={onNavigateAdd}
                  />
                </View>

                <View style={styles.emptyCheckActiveWrapper}>
                  <AppButton
                    title="CHECK CURRENT ACTIVE TICKETS"
                    variant="secondary"
                    icon={<TicketIcon size={16} color={Colors.primary} />}
                    onPress={handleCheckActiveTickets}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onOpenSettings}
                  style={styles.emptyListenerLink}
                >
                  <Bell size={13} color={Colors.textSecondary} style={{ marginRight: 6 }} />
                  <AppText variant="micro" weight="medium" color="secondary">
                    Check Notification Listener Permission
                  </AppText>
                </TouchableOpacity>
              </View>
            )}

            {/* Past Journeys Section below active pass */}
            {pastTickets.length > 0 && (
              <View style={styles.pastSectionMargin}>
                <SectionHeader
                  title="PAST JOURNEYS"
                  rightElement={
                    <AppText variant="tiny" color="muted">
                      {`${pastTickets.length} completed`}
                    </AppText>
                  }
                />
                {pastTickets.map((t) => (
                  <PastJourneyCard
                    key={t.id}
                    ticket={t}
                    onPress={() => onSelectTicket(t)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ================= PAST TAB CONTENT ================= */}
        {activeTab === 'past' && (
          <View>
            {pastTickets.length > 0 ? (
              <View>
                <SectionHeader
                  title="COMPLETED JOURNEYS"
                  rightElement={
                    <AppText variant="tiny" color="muted">
                      {`${pastTickets.length} trips`}
                    </AppText>
                  }
                />
                {pastTickets.map((t) => (
                  <PastJourneyCard
                    key={t.id}
                    ticket={t}
                    onPress={() => onSelectTicket(t)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <ShieldCheck size={32} color={Colors.textMuted} />
                </View>
                <AppText variant="subheading" weight="bold" color="primary" center style={styles.emptyTitle}>
                  No Past Journeys
                </AppText>
                <AppText variant="caption" color="secondary" center style={styles.emptySubtitle}>
                  Completed trips will be archived here for your travel history.
                </AppText>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {modalConfig ? (
        <NoraModal
          visible={modalConfig.visible}
          title={modalConfig.title}
          subtitle={modalConfig.subtitle}
          iconVariant={modalConfig.iconVariant}
          tickets={modalConfig.tickets}
          onClose={() => setModalConfig(null)}
          onPrimaryPress={() => setModalConfig(null)}
        />
      ) : null}

      {/* Share Ticket Image Modal */}
      <ShareTicketModal
        visible={shareModalVisible}
        data={shareData}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  screenTitle: {
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentWrapper: {
    marginBottom: 8,
  },
  emptyContainer: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: Spacing.borderRadiusLg,
    alignItems: 'center',
    marginVertical: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  emptyTitle: {
    marginBottom: 6,
  },
  emptySubtitle: {
    maxWidth: 280,
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyCtaWrapper: {
    width: '100%',
    maxWidth: 280,
    marginBottom: 12,
  },
  headerCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 86, 35, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Spacing.borderRadiusSm,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(242, 86, 35, 0.25)',
  },
  emptyCheckActiveWrapper: {
    width: '100%',
    maxWidth: 280,
    marginBottom: 14,
  },
  emptyListenerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pastSectionMargin: {
    marginTop: 18,
  },
});
