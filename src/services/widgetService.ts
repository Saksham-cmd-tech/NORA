import { NativeModules, Platform } from 'react-native';
import { NormalizedTicket } from '../types/ticket';

const { NoraWidgetModule } = NativeModules;

export interface WidgetTicketPayload {
  hasTicket: boolean;
  pnr?: string;
  trainNumber?: string;
  trainName?: string;
  from?: string;
  fromName?: string;
  to?: string;
  toName?: string;
  departure?: string;
  arrival?: string;
  coach?: string;
  seat?: string;
  seatType?: string;
  date?: string;
  platform?: string;
  status?: string;
}

export function formatTicketForWidget(ticket: NormalizedTicket | null): WidgetTicketPayload {
  if (!ticket) {
    return { hasTicket: false };
  }

  return {
    hasTicket: true,
    pnr: ticket.pnr || '',
    trainNumber: ticket.train?.number || '',
    trainName: ticket.train?.name || '',
    from: ticket.journey?.from || '',
    fromName: ticket.journey?.fromName || ticket.journey?.from || '',
    to: ticket.journey?.to || '',
    toName: ticket.journey?.toName || ticket.journey?.to || '',
    departure: ticket.journey?.departure || '--:--',
    arrival: ticket.journey?.arrival || '--:--',
    coach: ticket.passenger?.coach || '',
    seat: ticket.passenger?.seat || '',
    seatType: ticket.passenger?.className || ticket.passenger?.class || '',
    date: ticket.journey?.date || '',
    platform: '',
    status: ticket.status || 'CONFIRMED',
  };
}

/**
 * Updates the native Android Home Screen App Widget with the current active ticket.
 * If ticket is null, clears the active ticket so the widget displays "No Active Ticket".
 */
export async function updateActiveTicketWidget(ticket: NormalizedTicket | null): Promise<boolean> {
  const widgetModule = NativeModules.NoraWidgetModule;
  if (Platform.OS !== 'android' || !widgetModule) {
    return false;
  }

  try {
    if (!ticket) {
      await widgetModule.clearActiveTicket();
      return true;
    }

    const payload = formatTicketForWidget(ticket);
    await widgetModule.updateActiveTicket(JSON.stringify(payload));
    return true;
  } catch (error) {
    console.log('[WidgetService] Failed to update home screen widget:', error);
    return false;
  }
}
