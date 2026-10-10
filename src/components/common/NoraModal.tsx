import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ticket, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { NormalizedTicket } from '../../types/ticket';
import { getTrainName } from '../../utils/stationLookup';

export interface NoraModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconVariant?: 'orange' | 'green' | 'blue';
  tickets?: NormalizedTicket[];
  primaryButtonText?: string;
  onPrimaryPress?: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
}

export const NoraModal: React.FC<NoraModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  iconVariant = 'orange',
  tickets,
  primaryButtonText = 'GOT IT',
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
}) => {
  const getIconBg = () => {
    switch (iconVariant) {
      case 'green':
        return {
          bg: 'rgba(74, 222, 128, 0.12)',
          border: 'rgba(74, 222, 128, 0.28)',
          color: Colors.success,
        };
      case 'orange':
      default:
        return {
          bg: 'rgba(245, 51, 44, 0.12)',
          border: 'rgba(245, 51, 44, 0.32)',
          color: Colors.primary,
        };
    }
  };

  const iconStyle = getIconBg();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalCard}>
              {/* Header Icon */}
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: iconStyle.bg,
                    borderColor: iconStyle.border,
                  },
                ]}
              >
                {icon ? (
                  icon
                ) : iconVariant === 'green' ? (
                  <CheckCircle2 size={26} color={iconStyle.color} />
                ) : (
                  <Ticket size={26} color={iconStyle.color} />
                )}
              </View>

              {/* Title */}
              <AppText
                variant="heading"
                weight="heavy"
                color="primary"
                style={styles.title}
              >
                {title}
              </AppText>

              {/* Subtitle */}
              {subtitle ? (
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.subtitle}
                >
                  {subtitle}
                </AppText>
              ) : null}

              {/* Ticket Preview List if present */}
              {tickets && tickets.length > 0 ? (
                <View style={styles.ticketList}>
                  {tickets.map((t) => {
                    const cleanName =
                      !t.train.name || /^\d+$/.test(t.train.name.trim())
                        ? getTrainName(t.train.number) || 'Express'
                        : t.train.name;
                    return (
                      <View key={t.id || t.pnr} style={styles.ticketItem}>
                        <View style={styles.ticketItemTop}>
                          <AppText
                            variant="caption"
                            weight="heavy"
                            color="orange"
                            numberOfLines={1}
                            style={styles.trainNumber}
                          >
                            {t.train.number} · {cleanName}
                          </AppText>
                          <AppText variant="micro" weight="bold" color="muted">
                            {t.journey.date}
                          </AppText>
                        </View>
                        <View style={styles.ticketItemBottom}>
                          <AppText variant="micro" color="secondary">
                            {t.journey.from} → {t.journey.to}
                          </AppText>
                          <AppText variant="micro" weight="heavy" color="primary">
                            PNR {t.pnr}
                          </AppText>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {/* Actions */}
              <View style={styles.actionsBox}>
                <AppButton
                  title={primaryButtonText}
                  variant="primary"
                  onPress={onPrimaryPress || onClose}
                />
                {secondaryButtonText ? (
                  <AppButton
                    title={secondaryButtonText}
                    variant="ghost"
                    style={styles.secondaryBtn}
                    onPress={onSecondaryPress || onClose}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  ticketList: {
    width: '100%',
    marginBottom: 16,
  },
  ticketItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 12,
    marginBottom: 8,
  },
  ticketItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  trainNumber: {
    flex: 1,
    marginRight: 8,
  },
  ticketItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsBox: {
    width: '100%',
    marginTop: 4,
  },
  secondaryBtn: {
    marginTop: 8,
  },
});
