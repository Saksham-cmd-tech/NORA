import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import {
  Bell,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Check,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { AppText } from '../components/common/AppText';
import { AppButton } from '../components/common/AppButton';
import { openNotificationSettings, checkNotificationAccess } from '../services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface SlideItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  icon: (color: string) => React.ReactNode;
}

const SLIDES: SlideItem[] = [
  {
    id: 'detect',
    tag: 'AUTOMATIC DETECTION',
    title: 'Zero-Effort Ticket Wallet',
    description:
      'NORA listens for incoming booking notifications and SMS from IRCTC and redRail, extracting your journey details automatically.',
    icon: (c) => <Bell size={38} color={c} />,
  },
  {
    id: 'boarding_pass',
    tag: 'DIGITAL BOARDING PASS',
    title: 'Designed for Railway Travel',
    description:
      'Experience your tickets as digital boarding passes with prominent station codes, departure times, coach and seat allocation.',
    icon: (c) => <Sparkles size={38} color={c} />,
  },
  {
    id: 'privacy',
    tag: '100% PRIVATE & OFFLINE',
    title: 'On-Device SQLite Storage',
    description:
      'No cloud sync, no tracking, and no account required. Your tickets and PNRs are encrypted and stored solely on your device.',
    icon: (c) => <ShieldCheck size={38} color={c} />,
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [notificationGranted, setNotificationGranted] = useState(false);

  const currentSlide = SLIDES[currentSlideIndex];
  const isLastSlide = currentSlideIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handleGrantNotification = async () => {
    await openNotificationSettings();
    setTimeout(async () => {
      const granted = await checkNotificationAccess();
      setNotificationGranted(granted);
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Branding Header */}
      <View style={styles.topHeader}>
        <View style={styles.logoRow}>
          <AppText variant="tiny" weight="heavy" color="orange" uppercase letterSpacing={2}>
            NORA
          </AppText>
          <View style={styles.logoDot} />
          <AppText variant="micro" weight="bold" color="muted" uppercase letterSpacing={1}>
            RAIL WALLET
          </AppText>
        </View>

        {!isLastSlide && (
          <TouchableOpacity activeOpacity={0.7} onPress={onComplete} style={styles.skipBtn}>
            <AppText variant="caption" weight="medium" color="muted">
              Skip
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Slide Card Container */}
      <View style={styles.slideContent}>
        {/* Animated Icon Circle */}
        <View style={styles.iconCircleWrapper}>
          <View style={styles.iconCircleOuter}>
            <View style={styles.iconCircleInner}>
              {currentSlide.icon(Colors.primary)}
            </View>
          </View>
        </View>

        {/* Tag Badge */}
        <View style={styles.tagBadge}>
          <AppText variant="micro" weight="heavy" color="orange" uppercase letterSpacing={1.2}>
            {currentSlide.tag}
          </AppText>
        </View>

        {/* Title */}
        <AppText variant="title" weight="heavy" color="primary" center style={styles.title}>
          {currentSlide.title}
        </AppText>

        {/* Description */}
        <AppText variant="body" color="secondary" center style={styles.description}>
          {currentSlide.description}
        </AppText>

        {/* Onboarding Notification Helper on Slide 1 */}
        {currentSlide.id === 'detect' && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGrantNotification}
            style={styles.permissionActionCard}
          >
            <View style={styles.permissionLeft}>
              <View style={[styles.permDot, notificationGranted && styles.permDotActive]} />
              <AppText variant="caption" weight="bold" color={notificationGranted ? 'success' : 'primary'}>
                {notificationGranted ? 'Notification Listener Enabled' : 'Enable Notification Access'}
              </AppText>
            </View>
            {notificationGranted ? (
              <Check size={16} color={Colors.success} />
            ) : (
              <ArrowRight size={14} color={Colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Navigation & Controls */}
      <View style={styles.bottomBar}>
        {/* Step Indicator Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((slide, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <TouchableOpacity
                key={slide.id}
                onPress={() => setCurrentSlideIndex(idx)}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>

        {/* CTA Button */}
        <View style={styles.ctaWrapper}>
          <AppButton
            title={isLastSlide ? 'GET STARTED' : 'CONTINUE'}
            variant="primary"
            icon={<ArrowRight size={16} color="#000000" />}
            onPress={handleNext}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Platform.OS === 'android' ? 44 : 16,
    paddingBottom: 28,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginHorizontal: 8,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  iconCircleWrapper: {
    marginBottom: 28,
  },
  iconCircleOuter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(242, 86, 35, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(242, 86, 35, 0.2)',
  },
  iconCircleInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  tagBadge: {
    backgroundColor: 'rgba(242, 86, 35, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(242, 86, 35, 0.3)',
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
    lineHeight: 32,
  },
  description: {
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 24,
  },
  permissionActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadiusMd,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    width: '100%',
    maxWidth: 340,
    marginTop: 8,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  permDotActive: {
    backgroundColor: Colors.success,
  },
  bottomBar: {
    paddingTop: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.surfaceHigh,
  },
  ctaWrapper: {
    width: '100%',
  },
});
