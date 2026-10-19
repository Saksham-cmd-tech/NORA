import { NativeModules, NativeEventEmitter, Platform, Linking, PermissionsAndroid } from 'react-native';
import { NormalizedTicket } from '../types/ticket';
import { parseBookingNotification } from '../parsers/notificationParser';
import { mergeTickets } from '../parsers/merger';
import { isTicketValidAndUpcoming } from '../utils/dateUtils';

const { NoraNotificationModule } = NativeModules;

export interface ScanSmsResult {
  permissionGranted: boolean;
  tickets: NormalizedTicket[];
  messagesScanned: number;
}

export async function requestSmsPermission(): Promise<boolean> {
  return true;
}

export async function scanSmsForTickets(): Promise<ScanSmsResult> {
  return { permissionGranted: true, tickets: [], messagesScanned: 0 };
}



export async function checkNotificationAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    if (NoraNotificationModule && NoraNotificationModule.isNotificationAccessGranted) {
      return await NoraNotificationModule.isNotificationAccessGranted();
    }
  } catch (err) {
    console.log('[NORA] Error checking notification access:', err);
  }
  return false;
}

export async function openNotificationSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      if (NoraNotificationModule && NoraNotificationModule.openNotificationAccessSettings) {
        await NoraNotificationModule.openNotificationAccessSettings();
        return;
      }
    } catch (err) {
      console.log('[NORA] Error opening notification settings:', err);
    }
    // Fallback
    try {
      await Linking.openSettings();
    } catch {}
  }
}

export function subscribeToNotificationEvents(
  onDetected: (ticket: NormalizedTicket) => void
): () => void {
  if (Platform.OS !== 'android' || !NoraNotificationModule) {
    return () => {};
  }

  const emitter = new NativeEventEmitter(NoraNotificationModule);
  const subscription = emitter.addListener('onNotificationReceived', (event: any) => {
    try {
      const text = event.text || event.title || '';
      const pkg = event.packageName || '';
      const parsed = parseBookingNotification(text, pkg);
      if (parsed) {
        onDetected(parsed);
      }
    } catch (err) {
      console.log('[NORA] Notification processing error:', err);
    }
  });

  return () => {
    subscription.remove();
  };
}
