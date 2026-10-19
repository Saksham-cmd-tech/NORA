import { NativeModules, NativeEventEmitter, Platform, AppState, AppStateStatus } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { NormalizedTicket } from '../types/ticket';
import { parseBookingNotification } from '../parsers/notificationParser';
import { ticketRepository } from '../database/repositories/ticketRepository';

const { NoraNotificationModule } = NativeModules;

export interface ShareOrClipboardDetectionCallback {
  (ticket: NormalizedTicket, source: 'share' | 'clipboard'): void;
}

let lastProcessedClipboardText = '';

/**
 * Parses shared text or clipboard text into a NormalizedTicket.
 * Handles:
 * 1. Full IRCTC SMS or push notification text.
 * 2. redRail SMS / booking text.
 * 3. Raw 10-digit Indian Railways PNR string (e.g. "8354766445" or "PNR: 8354766445").
 */
export function parseSharedOrClipboardText(
  rawText: string,
  source: 'share' | 'clipboard'
): NormalizedTicket | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const clean = rawText.trim();
  if (clean.length < 5) return null;

  // 1. First attempt full structured parser (handles IRCTC, redRail, CRIS formats)
  const parsed = parseBookingNotification(clean);
  if (parsed && parsed.pnr) {
    return parsed;
  }

  // 2. Check for 10-digit Indian Railways PNR
  // Valid Indian Railways PNRs start with digits 2-9 and are 10 digits long
  const pnrRegex = /(?:PNR[:\s-]*)?([2-9]\d{9})\b/i;
  const match = clean.match(pnrRegex);

  if (match && match[1]) {
    const pnr = match[1];

    // Optional: Extract 5-digit train number if present in text
    const trainMatch = clean.match(/\b([012]\d{4})\b/);
    const trainNo = trainMatch ? trainMatch[1] : '';

    const ticketStub: NormalizedTicket = {
      id: `ticket_${pnr}`,
      source: source === 'share' ? 'SHARE' : 'CLIPBOARD',
      pnr,
      train: {
        number: trainNo,
        name: trainNo ? `Train ${trainNo}` : 'Train Booking',
        type: trainNo ? `SUPERFAST ${trainNo}` : 'EXPRESS',
      },
      journey: {
        from: 'ORIGIN',
        to: 'DEST',
        date: '',
      },
      passenger: {
        name: 'Passenger',
        class: 'CC',
        className: 'Chair Car',
        bookingStatus: 'CONFIRMED',
      },
      status: 'CONFIRMED',
      rawMessage: clean,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isUpcoming: true,
    };

    return ticketStub;
  }

  return null;
}

/**
 * Checks if there is pending shared text from an Android Share Sheet launch intent.
 */
export async function getInitialSharedText(): Promise<string | null> {
  if (Platform.OS !== 'android' || !NoraNotificationModule?.getInitialSharedText) {
    return null;
  }
  try {
    return await NoraNotificationModule.getInitialSharedText();
  } catch (err) {
    console.log('[ShareService] Error fetching initial shared text:', err);
    return null;
  }
}

/**
 * Checks clipboard for booking or PNR text.
 * Prevents triggering repeatedly for identical text or already saved tickets.
 */
export async function checkClipboardForTicket(
  force: boolean = false
): Promise<NormalizedTicket | null> {
  try {
    const text = await Clipboard.getString();
    if (!text || text.trim().length === 0) return null;

    const clean = text.trim();
    if (!force && clean === lastProcessedClipboardText) {
      return null;
    }

    const ticket = parseSharedOrClipboardText(clean, 'clipboard');
    if (!ticket) return null;

    // Avoid prompting user if this PNR is already saved in their wallet
    if (ticket.pnr) {
      const isDuplicate = await ticketRepository.isDuplicatePNR(ticket.pnr);
      if (isDuplicate) {
        lastProcessedClipboardText = clean;
        return null;
      }
    }

    lastProcessedClipboardText = clean;
    return ticket;
  } catch (err) {
    console.log('[ClipboardService] Error reading clipboard:', err);
    return null;
  }
}

/**
 * Reset tracked clipboard content so user can re-trigger detection if needed.
 */
export function resetLastClipboardText(): void {
  lastProcessedClipboardText = '';
}

/**
 * Initializes listeners for both:
 * 1. Android Share Sheet (ACTION_SEND text/plain)
 * 2. Clipboard auto-detection on app launch & resume (AppState change)
 */
export function initShareAndClipboardListeners(
  onTicketDetected: ShareOrClipboardDetectionCallback
): () => void {
  let isMounted = true;

  // 1. Check cold start shared text (when app launched via Share Sheet)
  getInitialSharedText().then((shared) => {
    if (!isMounted || !shared) return;
    const ticket = parseSharedOrClipboardText(shared, 'share');
    if (ticket) {
      onTicketDetected(ticket, 'share');
    }
  });

  // 2. Listen for warm start shared text (when app was already open / backgrounded)
  let sharedSub: { remove: () => void } | null = null;
  if (Platform.OS === 'android' && NoraNotificationModule) {
    try {
      const emitter = new NativeEventEmitter(NoraNotificationModule);
      sharedSub = emitter.addListener('onSharedTextReceived', (event: { text?: string }) => {
        if (!isMounted || !event?.text) return;
        const ticket = parseSharedOrClipboardText(event.text, 'share');
        if (ticket) {
          onTicketDetected(ticket, 'share');
        }
      });
    } catch (e) {
      console.log('[ShareService] Could not register onSharedTextReceived listener:', e);
    }
  }

  // 3. Auto-detect from clipboard on cold start / app launch
  checkClipboardForTicket(false).then((ticket) => {
    if (!isMounted || !ticket) return;
    onTicketDetected(ticket, 'clipboard');
  });

  // 4. Auto-detect from clipboard on warm resume (whenever app comes back to foreground)
  const appStateSub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (!isMounted) return;
    if (nextAppState === 'active') {
      checkClipboardForTicket(false).then((ticket) => {
        if (!isMounted || !ticket) return;
        onTicketDetected(ticket, 'clipboard');
      });
    }
  });

  return () => {
    isMounted = false;
    sharedSub?.remove();
    appStateSub.remove();
  };
}
