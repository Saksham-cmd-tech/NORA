import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { NormalizedTicket } from '../types/ticket';
import { parseTicketJourneyDate } from '../utils/dateUtils';

const getNotificationModule = () => NativeModules.NoraNotificationModule;

export interface NotificationActionPayload {
  actionType: 'VIEW_TICKET' | 'TRAIN_STATUS' | 'SHARE_TRIP' | 'CHECK_STATUS' | 'COACH_POSITION' | string;
  pnr: string;
  trainNumber: string;
}

/**
 * Parses journey date string and departure time into an absolute UTC/local epoch milliseconds timestamp.
 * Examples:
 * - dateStr: "08 Oct 2026", timeStr: "06:25 AM"
 * - dateStr: "2026-10-08", timeStr: "18:30"
 */
export function parseDepartureTimestamp(
  dateStr?: string,
  departureTimeStr?: string
): number | null {
  if (!dateStr) return null;

  const baseDate = parseTicketJourneyDate(dateStr);
  if (!baseDate) return null;

  let hours = 6;
  let minutes = 0;

  if (departureTimeStr && departureTimeStr.trim().length > 0) {
    const timeClean = departureTimeStr.trim().toUpperCase();
    const isPM = timeClean.includes('PM');
    const isAM = timeClean.includes('AM');

    // Extract numbers: e.g. "06:25"
    const match = timeClean.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      let rawHours = parseInt(match[1], 10);
      const rawMinutes = parseInt(match[2], 10);

      if (isPM && rawHours < 12) {
        rawHours += 12;
      } else if (isAM && rawHours === 12) {
        rawHours = 0;
      }

      hours = rawHours;
      minutes = rawMinutes;
    }
  }

  const departureDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    0,
    0
  );

  const timestamp = departureDate.getTime();
  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Schedules 2-hour and 1-hour pre-departure reminder alarms in Android AlarmManager.
 */
function resolveReminderPlatform(ticket: NormalizedTicket): string {
  if ((ticket.journey as any)?.platform) return String((ticket.journey as any).platform);
  if ((ticket as any)?.platform) return String((ticket as any).platform);
  const trainNo = (ticket.train?.number || '').trim();
  const fromCode = (ticket.journey?.from || '').toUpperCase().trim();
  if (trainNo === '11039') return '2';
  if (trainNo === '26101') return '5';
  if (fromCode.includes('PUNE')) return '2';
  return '1';
}

export async function scheduleJourneyReminders(
  ticket: NormalizedTicket
): Promise<boolean> {
  const mod = getNotificationModule();
  if (Platform.OS !== 'android' || !mod?.scheduleJourneyReminders) {
    return false;
  }

  if (!ticket || ticket.status === 'CANCELLED' || ticket.status === 'COMPLETED') {
    return false;
  }

  const departureEpoch = parseDepartureTimestamp(
    ticket.journey?.date,
    ticket.journey?.departure
  );

  if (!departureEpoch || departureEpoch <= Date.now()) {
    return false;
  }

  try {
    const payload = {
      pnr: ticket.pnr,
      status: ticket.status || 'CONFIRMED',
      platform: resolveReminderPlatform(ticket),
      pillar: '11',
      train: {
        number: ticket.train?.number || '',
        name: ticket.train?.name || '',
      },
      journey: {
        from: ticket.journey?.from || '',
        fromName: ticket.journey?.fromName || '',
        to: ticket.journey?.to || '',
        toName: ticket.journey?.toName || '',
        date: ticket.journey?.date || '',
        departure: ticket.journey?.departure || '',
        arrival: ticket.journey?.arrival || '',
      },
      passenger: {
        coach: ticket.passenger?.coach || '',
        seat: ticket.passenger?.seat || '',
        bookingStatus: ticket.passenger?.bookingStatus || ticket.status || 'CONFIRMED',
      },
    };

    await mod.scheduleJourneyReminders(payload, departureEpoch);
    return true;
  } catch (err) {
    console.log('[NORA] scheduleJourneyReminders error:', err);
    return false;
  }
}

/**
 * Cancels active alarms for the specified PNR.
 */
export async function cancelJourneyReminders(pnr: string): Promise<boolean> {
  const mod = getNotificationModule();
  if (Platform.OS !== 'android' || !mod?.cancelJourneyReminders) {
    return false;
  }

  try {
    await mod.cancelJourneyReminders(pnr);
    return true;
  } catch (err) {
    console.log('[NORA] cancelJourneyReminders error:', err);
    return false;
  }
}

/**
 * Posts an immediate system notification shade alert for newly detected tickets
 * with customized contextual actions (Confirmed, WL/RAC, Chart Prepared).
 */
export async function showTicketDetectedNotification(
  ticket: NormalizedTicket
): Promise<boolean> {
  const mod = getNotificationModule();
  if (Platform.OS !== 'android' || !mod?.showTicketDetectedNotification) {
    return false;
  }

  try {
    const payload = {
      pnr: ticket.pnr,
      status: ticket.status || 'CONFIRMED',
      platform: resolveReminderPlatform(ticket),
      pillar: '11',
      train: {
        number: ticket.train?.number || '',
        name: ticket.train?.name || '',
      },
      journey: {
        from: ticket.journey?.from || '',
        fromName: ticket.journey?.fromName || '',
        to: ticket.journey?.to || '',
        toName: ticket.journey?.toName || '',
        date: ticket.journey?.date || '',
        departure: ticket.journey?.departure || '',
        arrival: ticket.journey?.arrival || '',
      },
      passenger: {
        coach: ticket.passenger?.coach || '',
        seat: ticket.passenger?.seat || '',
        bookingStatus: ticket.passenger?.bookingStatus || ticket.status || 'CONFIRMED',
      },
    };

    await mod.showTicketDetectedNotification(payload);
    return true;
  } catch (err) {
    console.log('[NORA] showTicketDetectedNotification error:', err);
    return false;
  }
}

/**
 * Checks if the app was launched by tapping an action button in a notification (cold start).
 */
export async function getInitialNotificationAction(): Promise<NotificationActionPayload | null> {
  const mod = getNotificationModule();
  if (Platform.OS !== 'android' || !mod?.getInitialNotificationAction) {
    return null;
  }

  try {
    const action = await mod.getInitialNotificationAction();
    return action || null;
  } catch (err) {
    console.log('[NORA] getInitialNotificationAction error:', err);
    return null;
  }
}

/**
 * Subscribes to notification action clicks when the app is already running or resumed (warm start).
 */
export function subscribeToNotificationActions(
  onAction: (payload: NotificationActionPayload) => void
): () => void {
  const mod = getNotificationModule();
  if (Platform.OS !== 'android' || !mod) {
    return () => {};
  }

  const emitter = new NativeEventEmitter(mod);
  const subscription = emitter.addListener('onNotificationActionClicked', (event: any) => {
    try {
      if (event && event.actionType) {
        onAction({
          actionType: event.actionType,
          pnr: event.pnr || '',
          trainNumber: event.trainNumber || '',
        });
      }
    } catch (err) {
      console.log('[NORA] onNotificationActionClicked handling error:', err);
    }
  });

  return () => {
    subscription.remove();
  };
}

export interface LiveJourneyPayload {
  statusBadgeText?: string;
  nextStationCode?: string;
  nextStationName?: string;
  nextStationTime?: string;
  nextStationPlatform?: string;
  currentSpeed?: string;
  currentStationName?: string;
  isAtStation?: boolean;
}

/**
 * Pins or updates an ongoing persistent Live Activity notification on the Android lock screen.
 */
export async function showLiveJourneyNotification(
  ticket: NormalizedTicket,
  liveData?: LiveJourneyPayload
): Promise<boolean> {
  const mod = getNotificationModule();
  if (Platform.OS !== 'android' || !mod?.showLiveJourney) {
    return true;
  }
  try {
    await mod.showLiveJourney(ticket, liveData || null);
    return true;
  } catch (err) {
    console.log('[NORA] showLiveJourney error:', err);
    return false;
  }
}

/**
 * Dismisses the persistent Live Activity from the lock screen and notification shade.
 */
export async function dismissLiveJourneyNotification(): Promise<boolean> {
  const mod = getNotificationModule();
  if (Platform.OS !== 'android' || !mod?.dismissLiveJourney) {
    return true;
  }
  try {
    await mod.dismissLiveJourney();
    return true;
  } catch (err) {
    console.log('[NORA] dismissLiveJourney error:', err);
    return false;
  }
}

/**
 * Returns whether the Live Journey ongoing activity is currently active.
 */
export async function isLiveJourneyNotificationActive(): Promise<boolean> {
  const mod = getNotificationModule();
  if (Platform.OS !== 'android' || !mod?.isLiveJourneyActive) {
    return false;
  }
  try {
    const active = await mod.isLiveJourneyActive();
    return Boolean(active);
  } catch (err) {
    console.log('[NORA] isLiveJourneyActive error:', err);
    return false;
  }
}
