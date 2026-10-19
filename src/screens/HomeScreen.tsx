import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import {
  Ticket as TicketIcon,
  Plus,
  Settings as SettingsIcon,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { NormalizedTicket } from '../types/ticket';
import { AppText } from '../components/common/AppText';
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
  const [refreshing, setRefreshing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareData, setShareData] = useState<ShareTicketData | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    iconVariant?: 'orange' | 'green';
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

  const handleRefresh = async () => {
    if (!onRefreshTickets) return;
    setRefreshing(true);
    try {
      await onRefreshTickets();
    } finally {
      setRefreshing(false);
    }
  };

  // Apple-style formatted date e.g. "MONDAY, 19 OCTOBER"
  const formattedToday = new Date()
    .toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .toUpperCase();

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Apple-style Top Navigation Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppText variant="tiny" weight="bold" color="secondary" style={styles.headerDate}>
            {formattedToday}
          </AppText>
          <AppText variant="huge" weight="heavy" color="primary" style={styles.largeTitle}>
            Wallet
          </AppText>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onNavigateAdd}
            style={styles.navButton}
            accessibilityLabel="Add Ticket"
          >
            <Plus size={20} color={Colors.appleLabel} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Apple-style Segmented Picker */}
      <View style={styles.segmentedContainer}>
        <View style={styles.segmentedTrack}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('upcoming')}
            style={[styles.segmentTab, activeTab === 'upcoming' && styles.segmentTabActive]}
          >
            <AppText
              variant="caption"
              weight="bold"
              color={activeTab === 'upcoming' ? 'primary' : 'secondary'}
            >
              {`Upcoming${upcomingTickets.length > 0 ? ` (${upcomingTickets.length})` : ''}`}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('past')}
            style={[styles.segmentTab, activeTab === 'past' && styles.segmentTabActive]}
          >
            <AppText
              variant="caption"
              weight="bold"
              color={activeTab === 'past' ? 'primary' : 'secondary'}
            >
              {`Past${pastTickets.length > 0 ? ` (${pastTickets.length})` : ''}`}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefreshTickets ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          ) : undefined
        }
      >
        {/* ================= UPCOMING TAB ================= */}
        {activeTab === 'upcoming' && (
          <View>
            {upcomingTickets.length > 0 ? (
              <View style={styles.ticketList}>
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
                        const title = encodeURIComponent(
                          `🚆 Train ${t.train.number}: ${t.journey.from} to ${t.journey.to}`
                        );
                        const details = encodeURIComponent(
                          `Train: ${t.train.number} ${t.train.name || ''}\n` +
                            `Coach: ${t.passenger.coach || '-'} · Seat: ${t.passenger.seat || '-'}\n` +
                            `PNR: ${t.pnr}`
                        );
                        const location = encodeURIComponent(
                          `${t.journey.fromName || t.journey.from} Railway Station`
                        );
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
              /* Apple Wallet Minimal Empty State */
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <TicketIcon size={32} color={Colors.primary} strokeWidth={1.8} />
                </View>

                <AppText variant="heading" weight="bold" color="primary" center style={styles.emptyTitle}>
                  No Upcoming Journeys
                </AppText>

                <AppText variant="body" color="secondary" center style={styles.emptySubtitle}>
                  Your saved train passes will appear here with departure times, platform, and coach layout.
                </AppText>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onNavigateAdd}
                  style={styles.emptyAddButton}
                >
                  <Plus size={18} color="#000000" strokeWidth={2.6} style={{ marginRight: 6 }} />
                  <AppText variant="body" weight="heavy" color="dark">
                    Add Ticket
                  </AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ================= PAST TAB ================= */}
        {activeTab === 'past' && (
          <View>
            {pastTickets.length > 0 ? (
              <View style={styles.pastSection}>
                <AppText
                  variant="micro"
                  weight="bold"
                  color="secondary"
                  uppercase
                  letterSpacing={0.8}
                  style={styles.sectionHeader}
                >
                  ARCHIVED JOURNEYS
                </AppText>
                <View style={styles.pastCardGroup}>
                  {pastTickets.map((t) => (
                    <PastJourneyCard
                      key={t.id}
                      ticket={t}
                      onPress={() => onSelectTicket(t)}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Clock size={30} color={Colors.appleSecondaryLabel} strokeWidth={1.8} />
                </View>

                <AppText variant="heading" weight="bold" color="primary" center style={styles.emptyTitle}>
                  No Past Journeys
                </AppText>

                <AppText variant="body" color="secondary" center style={styles.emptySubtitle}>
                  Completed train trips will be archived here for your travel history.
                </AppText>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {modalConfig && (
        <NoraModal
          visible={modalConfig.visible}
          title={modalConfig.title}
          subtitle={modalConfig.subtitle}
          iconVariant={modalConfig.iconVariant}
          onClose={() => setModalConfig(null)}
          onPrimaryPress={() => setModalConfig(null)}
        />
      )}

      {/* Share Pass Image Modal */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerDate: {
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  largeTitle: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.appleGroupedBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  segmentedContainer: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 12,
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: Colors.appleGroupedBg,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: Colors.appleSecondaryBg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 32,
  },
  ticketList: {
    paddingTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.appleGroupedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.appleSeparator,
  },
  emptyTitle: {
    fontSize: 20,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    maxWidth: 290,
    lineHeight: 21,
    marginBottom: 28,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pastSection: {
    paddingTop: 6,
  },
  sectionHeader: {
    marginBottom: 10,
    marginLeft: 4,
  },
  pastCardGroup: {
    gap: 8,
  },
});
