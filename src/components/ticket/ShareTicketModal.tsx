import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { X, Share2, Copy, Check, Radio, Link2 } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { AppText } from '../common/AppText';
import { AppButton } from '../common/AppButton';
import { ShareTicketCard } from './ShareTicketCard';
import { ShareTicketData, shareTicketImage } from '../../services/shareTicketService';
import { shareTripLink } from '../../services/tripShareService';
import { NormalizedTicket } from '../../types/ticket';

interface ShareTicketModalProps {
  visible: boolean;
  data: ShareTicketData | null;
  ticket?: NormalizedTicket;
  onClose: () => void;
}

export const ShareTicketModal: React.FC<ShareTicketModalProps> = ({
  visible,
  data,
  ticket,
  onClose,
}) => {
  const [sharingImage, setSharingImage] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);
  const [includeBerth, setIncludeBerth] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!visible || !data) return null;

  const handleShareLiveLink = async () => {
    try {
      setSharingLink(true);
      const targetTicket: NormalizedTicket = ticket || {
        id: `ticket_${data.trainNumber}_${Date.now()}`,
        source: 'MANUAL',
        pnr: data.pnr,
        train: {
          number: data.trainNumber,
          name: data.trainName,
          type: data.trainType,
        },
        journey: {
          from: data.fromCode,
          to: data.toCode,
          date: 'Today',
          departure: data.fromTime,
          arrival: data.toTime,
        },
        passenger: {
          name: 'Passenger',
          coach: data.coach,
          seat: data.seat,
          class: data.coach?.startsWith('C') ? 'CC' : '3A',
          bookingStatus: data.status || 'CONFIRMED',
        },
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await shareTripLink(targetTicket, { includeBerth });
    } catch (e) {
      console.log('handleShareLiveLink error:', e);
    } finally {
      setSharingLink(false);
    }
  };

  const handleShareImage = async () => {
    try {
      setSharingImage(true);
      await shareTicketImage(data);
    } catch (e) {
      console.log('handleShareImage error:', e);
    } finally {
      setSharingImage(false);
    }
  };

  const handleCopyText = async () => {
    try {
      if (data.shareText) {
        Clipboard.setString(data.shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.log('handleCopyText error:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <AppText variant="subheading" weight="heavy" color="primary">
                Share Ticket
              </AppText>
              <AppText variant="micro" color="secondary" style={{ marginTop: 2 }}>
                High-Resolution Boarding Pass
              </AppText>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X size={18} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Ticket Card Preview */}
          <View style={styles.cardPreviewWrapper}>
            <ShareTicketCard data={data} />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Share Live Tracking Link Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleShareLiveLink}
              disabled={sharingLink}
              style={styles.liveTrackingBtn}
            >
              {sharingLink ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Radio size={16} color="#FFFFFF" style={styles.btnIcon} />
                  <AppText variant="caption" weight="heavy" color="primary" uppercase letterSpacing={0.5}>
                    SHARE LIVE TRACKING LINK
                  </AppText>
                </>
              )}
            </TouchableOpacity>

            {/* Privacy Berth Option Toggle */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIncludeBerth(!includeBerth)}
              style={styles.privacyToggleRow}
            >
              <View style={[styles.checkbox, includeBerth && styles.checkboxActive]}>
                {includeBerth && <Check size={11} color="#000000" />}
              </View>
              <AppText variant="micro" color={includeBerth ? 'primary' : 'secondary'}>
                Include Coach & Seat in Link ({data.coach || 'Coach'} · Seat {data.seat || ''})
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleShareImage}
              disabled={sharingImage}
              style={styles.primaryShareBtn}
            >
              {sharingImage ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Share2 size={16} color="#000000" style={styles.btnIcon} />
                  <AppText variant="caption" weight="heavy" color="dark" uppercase letterSpacing={0.5}>
                    SHARE TICKET IMAGE
                  </AppText>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCopyText}
              style={styles.secondaryCopyBtn}
            >
              {copied ? (
                <>
                  <Check size={16} color={Colors.success} style={styles.btnIcon} />
                  <AppText variant="caption" weight="heavy" color="success" uppercase letterSpacing={0.5}>
                    DETAILS COPIED!
                  </AppText>
                </>
              ) : (
                <>
                  <Copy size={16} color={Colors.textPrimary} style={styles.btnIcon} />
                  <AppText variant="caption" weight="heavy" color="primary" uppercase letterSpacing={0.5}>
                    COPY DETAILS AS TEXT
                  </AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPreviewWrapper: {
    marginBottom: 20,
  },
  actionsContainer: {
    gap: 10,
  },
  liveTrackingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  privacyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  primaryShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 12,
    paddingVertical: 13,
  },
  btnIcon: {
    marginRight: 8,
  },
});
