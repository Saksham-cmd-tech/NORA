import { NormalizedTicket } from '../types/ticket';
import { irctcParser } from './irctcParser';
import { redRailParser } from './redRailParser';
import { isTicketValidAndUpcoming } from '../utils/dateUtils';

const PARSERS = [irctcParser, redRailParser];

function createNormalizedTicketFromParsed(parsed: Partial<NormalizedTicket>): NormalizedTicket {
  return {
    id: parsed.id || `ticket_${parsed.pnr}`,
    source: parsed.source || 'MANUAL',
    bookingId: parsed.bookingId,
    pnr: parsed.pnr || '',
    train: {
      number: parsed.train?.number || '',
      name: parsed.train?.name || '',
      type: parsed.train?.type || (parsed.train?.number ? `TRAIN ${parsed.train.number}` : 'SUPERFAST'),
    },
    journey: {
      from: parsed.journey?.from || '',
      fromName: parsed.journey?.fromName,
      to: parsed.journey?.to || '',
      toName: parsed.journey?.toName,
      date: parsed.journey?.date || '',
      departure: parsed.journey?.departure,
      arrival: parsed.journey?.arrival,
      duration: parsed.journey?.duration,
      boardingStation: parsed.journey?.boardingStation || parsed.journey?.from,
    },
    passenger: {
      name: parsed.passenger?.name || '',
      coach: parsed.passenger?.coach,
      seat: parsed.passenger?.seat,
      class: parsed.passenger?.class || 'CC',
      className: parsed.passenger?.className || 'CC Chair Car',
      bookingStatus: parsed.passenger?.bookingStatus || 'CONFIRMED',
    },
    fare: parsed.fare,
    status: parsed.status || 'CONFIRMED',
    rawMessage: parsed.rawMessage,
    createdAt: parsed.createdAt || new Date().toISOString(),
    updatedAt: parsed.updatedAt || new Date().toISOString(),
    isUpcoming:
      parsed.isUpcoming !== undefined
        ? parsed.isUpcoming
        : parsed.journey?.date
        ? isTicketValidAndUpcoming(parsed.journey?.date, parsed.status, parsed.journey?.departure)
        : false,
  };
}

export function parseBookingNotification(
  text: string,
  packageName?: string
): NormalizedTicket | null {
  if (!text || text.trim().length === 0) return null;

  for (const parser of PARSERS) {
    if (parser.canParse(text, packageName)) {
      const parsed = parser.parse(text);
      if (parsed && parsed.pnr) {
        return createNormalizedTicketFromParsed(parsed);
      }
    }
  }

  // Fallback: try each parser directly even if canParse was ambiguous
  for (const parser of PARSERS) {
    const parsed = parser.parse(text);
    if (parsed && parsed.pnr) {
      return createNormalizedTicketFromParsed(parsed);
    }
  }

  return null;
}
