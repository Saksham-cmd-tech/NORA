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
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Access for Ticket Detection',
        message: 'NORA requires SMS read permission to automatically detect train tickets from IRCTC and redRail.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.log('[NORA] Error requesting SMS permission:', err);
    return false;
  }
}

export async function scanSmsForTickets(): Promise<ScanSmsResult> {
  if (Platform.OS !== 'android' || !NoraNotificationModule) {
    return { permissionGranted: true, tickets: [], messagesScanned: 0 };
  }

  try {
    const hasPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    let granted = hasPerm;
    if (!granted) {
      granted = await requestSmsPermission();
    }

    if (!granted) {
      return { permissionGranted: false, tickets: [], messagesScanned: 0 };
    }

    if (!NoraNotificationModule.scanSmsInbox) {
      return { permissionGranted: true, tickets: [], messagesScanned: 0 };
    }

    const rawMessages: Array<{ address: string; body: string; date: number }> =
      await NoraNotificationModule.scanSmsInbox();

    const ticketMap = new Map<string, NormalizedTicket>();

    for (const msg of rawMessages) {
      if (!msg.body) continue;
      const parsed = parseBookingNotification(msg.body, msg.address);
      if (parsed && parsed.pnr) {
        // Strict upcoming and validity check: reject cancelled, completed, past, or dateless tickets
        const isValid = isTicketValidAndUpcoming(
          parsed.journey?.date,
          parsed.status,
          parsed.journey?.departure
        );

        if (!isValid || parsed.status === 'CANCELLED' || parsed.status === 'COMPLETED') {
          continue;
        }

        const cleanPnr = parsed.pnr.replace(/[\s-]+/g, '').trim().toUpperCase();
        const existing = ticketMap.get(cleanPnr);
        if (existing) {
          const merged = mergeTickets(existing, parsed);
          if (
            isTicketValidAndUpcoming(
              merged.journey?.date,
              merged.status,
              merged.journey?.departure
            )
          ) {
            ticketMap.set(cleanPnr, merged);
          }
        } else {
          ticketMap.set(cleanPnr, parsed);
        }
      }
    }

    const detectedTickets = Array.from(ticketMap.values()).filter(
      (t) =>
        isTicketValidAndUpcoming(t.journey?.date, t.status, t.journey?.departure) &&
        t.status !== 'CANCELLED' &&
        t.status !== 'COMPLETED'
    );

    return {
      permissionGranted: true,
      tickets: detectedTickets,
      messagesScanned: rawMessages.length,
    };
  } catch (err) {
    console.log('[NORA] Error scanning SMS inbox:', err);
    return { permissionGranted: true, tickets: [], messagesScanned: 0 };
  }
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
