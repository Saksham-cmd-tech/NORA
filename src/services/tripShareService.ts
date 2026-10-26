/* eslint-disable no-bitwise */
import { Share } from 'react-native';
import { NormalizedTicket } from '../types/ticket';
import { getTrainName, getStationName } from '../utils/stationLookup';

export const TRIP_SHARE_BASE_URL = 'https://nora-privacy-policy.vercel.app/t';
export const TRIP_SHARE_CUSTOM_SCHEME = 'nora://trip';

export interface SharedTripData {
  trainNumber: string;
  trainName?: string;
  trainType?: string;
  dateOfJourney: string; // e.g. "28 Oct 2026" or "2026-10-28"
  fromStation: string; // e.g. "PUNE"
  fromStationName?: string;
  toStation: string; // e.g. "BD"
  toStationName?: string;
  departureTime?: string;
  arrivalTime?: string;
  coach?: string; // Optional: e.g. "C5"
  seat?: string; // Optional: e.g. "64"
  berthType?: string; // Optional: e.g. "WINDOW"
  pnr?: string; // Optional: e.g. "8354766445"
  status?: string;
}

// Compact payload format for URL hash compression
interface CompactTripPayload {
  t: string; // train number
  n?: string; // train name
  tt?: string; // train type
  d: string; // date of journey
  f: string; // from station code
  fn?: string; // from station name
  to: string; // to station code
  tn?: string; // to station name
  dt?: string; // departure time
  at?: string; // arrival time
  c?: string; // coach
  s?: string; // seat
  b?: string; // berth
  p?: string; // pnr
  st?: string; // status
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Pure JavaScript Base64 URL encoder (Zero Node/Buffer dependencies).
 */
function toBase64Url(str: string): string {
  try {
    const utf8 = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    let res = '';
    for (let i = 0; i < utf8.length; i += 3) {
      const a = utf8.charCodeAt(i);
      const b = i + 1 < utf8.length ? utf8.charCodeAt(i + 1) : 0;
      const c = i + 2 < utf8.length ? utf8.charCodeAt(i + 2) : 0;
      res += B64_CHARS[a >> 2];
      res += B64_CHARS[((a & 3) << 4) | (b >> 4)];
      res += i + 1 < utf8.length ? B64_CHARS[((b & 15) << 2) | (c >> 6)] : '';
      res += i + 2 < utf8.length ? B64_CHARS[c & 63] : '';
    }
    return res;
  } catch {
    return encodeURIComponent(str);
  }
}

/**
 * Pure JavaScript Base64 URL decoder.
 */
function fromBase64Url(base64Url: string): string {
  try {
    let str = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let binary = '';
    for (let i = 0; i < str.length; i += 4) {
      const enc1 = B64.indexOf(str.charAt(i));
      const enc2 = B64.indexOf(str.charAt(i + 1));
      const enc3 = B64.indexOf(str.charAt(i + 2));
      const enc4 = B64.indexOf(str.charAt(i + 3));
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      binary += String.fromCharCode(chr1);
      if (enc3 !== 64 && enc3 !== -1) binary += String.fromCharCode(chr2);
      if (enc4 !== 64 && enc4 !== -1) binary += String.fromCharCode(chr3);
    }
    return decodeURIComponent(
      Array.prototype.map.call(binary, (ch: string) => '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
  } catch {
    try {
      return decodeURIComponent(base64Url);
    } catch {
      return '';
    }
  }
}

/**
 * Generates a privacy-conscious, stateless shareable link for a train trip.
 * Uses a URL hash fragment (#data=...) so the journey payload is never transmitted to web servers.
 */
export function generateTripShareUrl(
  ticket: NormalizedTicket,
  options?: {
    includeBerth?: boolean;
    useCustomScheme?: boolean;
  }
): string {
  const trainNum = (ticket.train.number || '').trim();
  const trainName = ticket.train.name || getTrainName(trainNum) || `Train ${trainNum}`;
  const fromCode = (ticket.journey.from || '').trim().toUpperCase();
  const toCode = (ticket.journey.to || '').trim().toUpperCase();
  const fromName = ticket.journey.fromName || getStationName(fromCode) || fromCode;
  const toName = ticket.journey.toName || getStationName(toCode) || toCode;
  const dateOfJourney = ticket.journey.date || '';

  const payload: CompactTripPayload = {
    t: trainNum,
    n: trainName,
    tt: ticket.train.type || 'SUPERFAST',
    d: dateOfJourney,
    f: fromCode,
    fn: fromName,
    to: toCode,
    tn: toName,
    dt: ticket.journey.departure,
    at: ticket.journey.arrival,
  };

  // Only attach coach, seat, and PNR if user explicitly opted in
  if (options?.includeBerth) {
    if (ticket.passenger?.coach) payload.c = ticket.passenger.coach;
    if (ticket.passenger?.seat) payload.s = ticket.passenger.seat;
    if (ticket.pnr) payload.p = ticket.pnr;
    if (ticket.status) payload.st = ticket.status;
  }

  const encoded = toBase64Url(JSON.stringify(payload));

  if (options?.useCustomScheme) {
    return `${TRIP_SHARE_CUSTOM_SCHEME}?data=${encoded}`;
  }

  return `${TRIP_SHARE_BASE_URL}#data=${encoded}`;
}

/**
 * Parses an incoming deep link or web URL into a structured SharedTripData object.
 */
export function parseTripShareUrl(rawUrl: string): SharedTripData | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  try {
    const cleanUrl = rawUrl.trim();

    // 1. Check for hash fragment containing data=
    let rawEncodedData = '';
    const hashIndex = cleanUrl.indexOf('#');
    if (hashIndex !== -1) {
      const hashContent = cleanUrl.substring(hashIndex + 1);
      if (hashContent.startsWith('data=')) {
        rawEncodedData = hashContent.substring(5);
      } else if (!hashContent.includes('=')) {
        rawEncodedData = hashContent;
      }
    }

    // 2. Check for query parameter data=
    if (!rawEncodedData) {
      const queryMatch = cleanUrl.match(/[?&]data=([^&#]+)/);
      if (queryMatch) {
        rawEncodedData = queryMatch[1];
      }
    }

    // 3. Decode base64 payload if present
    if (rawEncodedData) {
      const decodedJson = fromBase64Url(rawEncodedData);
      if (decodedJson) {
        const p: CompactTripPayload = JSON.parse(decodedJson);
        if (p?.t && p?.f && p?.to) {
          const trainNum = p.t.trim();
          const fromCode = p.f.trim().toUpperCase();
          const toCode = p.to.trim().toUpperCase();

          return {
            trainNumber: trainNum,
            trainName: p.n || getTrainName(trainNum) || `Train ${trainNum}`,
            trainType: p.tt || 'SUPERFAST',
            dateOfJourney: p.d || '',
            fromStation: fromCode,
            fromStationName: p.fn || getStationName(fromCode) || fromCode,
            toStation: toCode,
            toStationName: p.tn || getStationName(toCode) || toCode,
            departureTime: p.dt || '--:--',
            arrivalTime: p.at || '--:--',
            coach: p.c,
            seat: p.s,
            berthType: p.b,
            pnr: p.p,
            status: p.st || 'CONFIRMED',
          };
        }
      }
    }

    // 4. Fallback: Parse standard URL query parameters (e.g. ?train=12951&date=2026-10-28&from=BCT&to=NDLS)
    const trainMatch = cleanUrl.match(/[?&]train=([^&#]+)/);
    const fromMatch = cleanUrl.match(/[?&]from=([^&#]+)/);
    const toMatch = cleanUrl.match(/[?&]to=([^&#]+)/);
    const dateMatch = cleanUrl.match(/[?&]date=([^&#]+)/);

    if (trainMatch && fromMatch && toMatch) {
      const trainNum = decodeURIComponent(trainMatch[1]).trim();
      const fromCode = decodeURIComponent(fromMatch[1]).trim().toUpperCase();
      const toCode = decodeURIComponent(toMatch[1]).trim().toUpperCase();
      const dateVal = dateMatch ? decodeURIComponent(dateMatch[1]) : '';

      return {
        trainNumber: trainNum,
        trainName: getTrainName(trainNum) || `Train ${trainNum}`,
        trainType: 'SUPERFAST',
        dateOfJourney: dateVal,
        fromStation: fromCode,
        fromStationName: getStationName(fromCode) || fromCode,
        toStation: toCode,
        toStationName: getStationName(toCode) || toCode,
        departureTime: '--:--',
        arrivalTime: '--:--',
      };
    }
  } catch (err) {
    console.log('[tripShareService] parseTripShareUrl error:', err);
  }

  return null;
}

/**
 * Converts a SharedTripData into a NormalizedTicket for importing into the user's local wallet.
 */
export function convertSharedTripToTicket(shared: SharedTripData): NormalizedTicket {
  const trainNum = shared.trainNumber.trim();
  const trainName = shared.trainName || getTrainName(trainNum) || `Train ${trainNum}`;
  const fromCode = shared.fromStation.trim().toUpperCase();
  const toCode = shared.toStation.trim().toUpperCase();

  const id = `shared_${trainNum}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  return {
    id,
    source: 'SHARED_LINK',
    pnr: shared.pnr || `SHARED-${trainNum}`,
    train: {
      number: trainNum,
      name: trainName,
      type: shared.trainType || 'SUPERFAST',
    },
    journey: {
      from: fromCode,
      fromName: shared.fromStationName || getStationName(fromCode) || fromCode,
      to: toCode,
      toName: shared.toStationName || getStationName(toCode) || toCode,
      date: shared.dateOfJourney || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      departure: shared.departureTime && shared.departureTime !== '--:--' ? shared.departureTime : '06:00 AM',
      arrival: shared.arrivalTime && shared.arrivalTime !== '--:--' ? shared.arrivalTime : '12:00 PM',
    },
    passenger: {
      name: 'Passenger',
      coach: shared.coach?.trim() || undefined,
      seat: shared.seat?.trim() || undefined,
      class: shared.coach
        ? shared.coach.startsWith('C') || shared.coach.startsWith('E')
          ? 'CC'
          : shared.coach.startsWith('B')
          ? '3A'
          : shared.coach.startsWith('A')
          ? '2A'
          : 'SL'
        : undefined,
      bookingStatus: shared.status || 'CONFIRMED',
    },
    status: 'CONFIRMED',
    createdAt: nowIso,
    updatedAt: nowIso,
    isUpcoming: true,
  };
}

/**
 * Triggers native system share dialog with pre-filled message and tracking link.
 */
export async function shareTripLink(
  ticket: NormalizedTicket,
  options?: { includeBerth?: boolean }
): Promise<boolean> {
  try {
    const url = generateTripShareUrl(ticket, options);
    const trainNum = ticket.train.number;
    const trainName = ticket.train.name || getTrainName(trainNum) || `Train ${trainNum}`;
    const fromCode = ticket.journey.from;
    const toCode = ticket.journey.to;
    const date = ticket.journey.date;

    const berthText =
      options?.includeBerth && ticket.passenger?.coach
        ? `\n💺 Coach ${ticket.passenger.coach} · Seat ${ticket.passenger.seat || ''}`
        : '';

    const message = [
      `Track my train journey live on NORA:`,
      `🚆 ${trainNum} ${trainName}`,
      `📍 ${fromCode} → ${toCode} · 📅 ${date}${berthText}`,
      ``,
      `Live Status & Route:`,
      `${url}`,
    ].join('\n');

    const res = await Share.share({
      title: `Track Train ${trainNum} - NORA`,
      message,
    });

    return res.action === Share.sharedAction;
  } catch (err) {
    console.log('[tripShareService] shareTripLink error:', err);
    return false;
  }
}
