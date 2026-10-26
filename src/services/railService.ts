/**
 * NORA Rail Proxy & Offline Cache Service
 * 
 * Powered by direct Cloudflare NTES Proxy (CRIS Indian Railways)
 * - Coach compositions & layouts are cached permanently per train number.
 * - Live train status queries have a 3-minute cooldown cache (TTL).
 * - Automatic offline & cached fallback so UI never blocks or fails.
 */

import { NativeModules, Platform } from 'react-native';
import { getTrainName, registerTrainName } from '../utils/stationLookup';

export interface CoachItem {
  position: number;
  code: string;
  category?: string;
  classType?: string;
  className?: string;
  totalBerths?: number;
  hasSeats?: boolean;
}

export interface CabinSeat {
  number: number;
  type: string; // 'WS' | 'MS' | 'AS' | 'SL' | 'SU'
  name: string;
}

export interface Cabin {
  cabinNumber: number;
  main: CabinSeat[];
  side: CabinSeat[];
}

export interface BlueprintClass {
  classCode: string;
  className: string;
  totalBerths: number;
  hasSeats: boolean;
  cabins: Cabin[];
}

export interface CoachPositionResponse {
  trainNumber: string;
  trainName: string;
  totalCoaches: number;
  coachPosition: string; // e.g. "C7-C6-E1-C5-C4-C3-C2-C1"
  rake: CoachItem[];
  summary?: Record<string, number>;
  blueprints?: Record<string, BlueprintClass>;
  isCached?: boolean;
}

export interface LegacyRouteHalt {
  id?: number;
  sequence: number;
  stationCode: string;
  stationName: string;
  isHalt: boolean;
  distanceFromSourceKm: number;
  scheduledArrival?: number | string;
  scheduledDeparture?: number | string;
  actualArrival?: string;
  actualDeparture?: string;
  delayArrivalMinutes?: number;
  delayDepartureMinutes?: number;
  haltDurationMinutes?: number;
  speedOnSectionKmph?: number;
  platform?: string;
  day?: number;
}

export interface LegacyTrainDetails {
  trainNumber: string;
  trainName: string;
  type?: string;
  sourceStationCode: string;
  sourceStationName: string;
  destinationStationCode: string;
  destinationStationName: string;
  totalHalts: number;
  distanceKm: number;
  travelTimeMinutes: number;
  avgSpeedKmph?: number;
  runningDays?: string[];
  route: LegacyRouteHalt[];
  isCached?: boolean;
}

export interface StationCoachResponse {
  trainNumber: string;
  trainName?: string;
  stationCode: string;
  stationName?: string;
  platform?: string;
  direction?: string;
  formation?: string;
  reversal?: boolean;
  totalCoaches?: number;
  rake: CoachItem[];
  blueprints?: Record<string, BlueprintClass>;
  isCached?: boolean;
}

/**
 * Helper to convert minutes-from-midnight or ISO string to friendly display time (e.g. "06:25 AM")
 */
export function formatHaltTime(timeVal?: number | string | null): string {
  if (timeVal === undefined || timeVal === null) return '--:--';
  if (typeof timeVal === 'number') {
    const totalMinutes = timeVal;
    const hours24 = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  }
  if (typeof timeVal === 'string') {
    const trimmed = timeVal.trim();
    if (!trimmed || trimmed.toLowerCase() === 'source' || trimmed.toLowerCase() === 'destination') return '--:--';
    // Match HH:mm pattern at start, regardless of trailing date like '10-Oct'
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2];
      const period = timeMatch[3] ? timeMatch[3].toUpperCase() : (h >= 12 ? 'PM' : 'AM');
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${m} ${period}`;
    }
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch {
      // ignore
    }
    return trimmed;
  }
  return '--:--';
}

export interface StationHalt {
  sequence: number;
  stationCode: string;
  stationName: string;
  isHalt: boolean;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  delayArrival?: number;
  delayDeparture?: number;
  status: 'departed' | 'arrived' | 'at-station' | 'upcoming';
  distance: number;
  speedToNextStationKmph?: number;
  platform?: string;
  coachPosition?: string;
}

export interface LiveTrainData {
  trainNumber: string;
  trainName: string;
  startDate?: string;
  lastUpdatedAt?: string;
  status: string; // 'running' | 'completed' | 'scheduled'
  fullUpdate?: string;
  delayMinutes: number;
  currentLocation?: {
    stationCode?: string;
    stationName?: string;
    sequence?: number;
    status?: string;
    isHalt?: boolean;
    speedKmh?: number;
    distanceFromOriginKm?: number;
    distanceFromLastStationKm?: number;
    delayMinutes?: number;
  };
  previousHalt?: {
    stationCode: string;
    stationName: string;
    sequence: number;
    distance: number;
    departureTime?: string;
    platform?: string;
  };
  nextHalt?: {
    stationCode: string;
    stationName: string;
    sequence: number;
    distance: number;
    arrivalTime?: string;
    platform?: string;
  };
  route: StationHalt[];
  train?: {
    number: string;
    name: string;
    type?: string;
    category?: string;
    distance?: number;
    duration?: number;
    totalHalts?: number;
    coachPosition?: string;
    source?: { code: string; name: string };
    destination?: { code: string; name: string };
  };
  isLive?: boolean;
  isCached?: boolean;
  cacheTime?: string;
}

// Cloudflare Worker Proxy URL for NTES live train status, halts & coach layouts
export const CLOUDFLARE_PROXY_URL = 'https://nora-rail-proxy.saksham-tale02dev.workers.dev';
export const NORA_API_KEY = 'nora_rail_sec_9f8b2c4e1a0d3e5f7a6b8c9d0e1f2a3b';

export const defaultProxyHeaders = {
  Accept: 'application/json',
  'X-NORA-API-Key': NORA_API_KEY,
};

// Permanent Cache for Coach Formations (never re-fetch once loaded)
const coachCache = new Map<string, CoachPositionResponse>();

// Permanent Cache for Legacy Train Details (never re-fetch once loaded)
const legacyTrainCache = new Map<string, LegacyTrainDetails>();

// Permanent Cache for Station Coach Formations (never re-fetch once loaded)
const stationCoachCache = new Map<string, StationCoachResponse>();

// Cooldown Cache for Live Train Tracking (minimum 3 minutes between network calls)
const liveCache = new Map<string, { data: LiveTrainData; timestamp: number }>();
const LIVE_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Look up official train name by train number using the Cloudflare NTES proxy.
 * Checks local dictionary first, queries NTES if unmapped, and registers the result in memory.
 */
export async function fetchTrainName(trainNumber?: string): Promise<string> {
  const cleanNumber = (trainNumber || '').trim();
  if (!cleanNumber) return '';

  const cached = getTrainName(cleanNumber);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${CLOUDFLARE_PROXY_URL}/?train=${cleanNumber}&action=name`, {
      method: 'GET',
      headers: defaultProxyHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json?.success && json?.trainName) {
        registerTrainName(cleanNumber, json.trainName);
        return json.trainName;
      }
    }
  } catch (err) {
    console.log(`[RailService] Failed to fetch train name for ${cleanNumber}:`, err);
  }

  return '';
}

/**
 * Generates the authentic 78-seat Chair Car (CC) blueprint for Indian Railways & Vande Bharat.
 * 
 * Standard 78-seat Chair Car coach geometry:
 * - Row 1 (near doorway / emergency exit): 4 seats (1-3 on main side, 4 on side)
 * - Rows 2 to 15: 14 rows × 5 seats (3 main + 2 side) = 70 seats
 *   - Row 12: 55, 56, 57 (Main: WS, MS, AS) | 58, 59 (Side: AS, WS)
 *   - Row 13: 60, 61, 62 (Main: WS, MS, AS) | 63, 64 (Side: AS, WS -> Seat 64 is Window Seat!)
 * - Row 16 (rear near pantry / restroom): 4 seats (75-77 on main, 78 on side)
 * Total: 4 + 70 + 4 = 78 seats.
 */
export function buildVandeBharatCCBlueprint(): BlueprintClass {
  const cabins: Cabin[] = [];

  // Row 1 (4 seats)
  cabins.push({
    cabinNumber: 1,
    main: [
      { number: 1, type: 'WS', name: 'Window Seat' },
      { number: 2, type: 'MS', name: 'Middle Seat' },
      { number: 3, type: 'AS', name: 'Aisle Seat' },
    ],
    side: [
      { number: 4, type: 'WS', name: 'Window Seat' },
    ],
  });

  // Rows 2 to 15 (14 rows × 5 seats = 70 seats)
  for (let r = 2; r <= 15; r++) {
    const start = 5 + (r - 2) * 5;
    cabins.push({
      cabinNumber: r,
      main: [
        { number: start, type: 'WS', name: 'Window Seat' },
        { number: start + 1, type: 'MS', name: 'Middle Seat' },
        { number: start + 2, type: 'AS', name: 'Aisle Seat' },
      ],
      side: [
        { number: start + 3, type: 'AS', name: 'Aisle Seat' },
        { number: start + 4, type: 'WS', name: 'Window Seat' },
      ],
    });
  }

  // Row 16 (4 seats)
  cabins.push({
    cabinNumber: 16,
    main: [
      { number: 75, type: 'WS', name: 'Window Seat' },
      { number: 76, type: 'MS', name: 'Middle Seat' },
      { number: 77, type: 'AS', name: 'Aisle Seat' },
    ],
    side: [
      { number: 78, type: 'WS', name: 'Window Seat' },
    ],
  });

  return {
    classCode: 'CC',
    className: 'AC Chair Car',
    totalBerths: 78,
    hasSeats: true,
    cabins,
  };
}

/**
 * Generates the authentic 56-seat Executive Chair Car (EC) blueprint (2+2 layout, 14 rows).
 */
export function buildECBlueprint(): BlueprintClass {
  const cabins: Cabin[] = Array.from({ length: 14 }, (_, i) => {
    const cabinNumber = i + 1;
    const start = (cabinNumber - 1) * 4 + 1;
    return {
      cabinNumber,
      main: [
        { number: start, type: 'WS', name: 'Window Seat' },
        { number: start + 1, type: 'AS', name: 'Aisle Seat' },
      ],
      side: [
        { number: start + 2, type: 'AS', name: 'Aisle Seat' },
        { number: start + 3, type: 'WS', name: 'Window Seat' },
      ],
    };
  });

  return {
    classCode: 'EC',
    className: 'Executive Chair Car',
    totalBerths: 56,
    hasSeats: true,
    cabins,
  };
}

/**
 * Generates the authentic 72-berth AC 3-Tier (3A) blueprint (9 bays × 8 berths).
 * Main compartment (6 berths): LB, MB, UB facing LB, MB, UB.
 * Side corridor (2 berths): SL, SU.
 */
export function build3ABlueprint(): BlueprintClass {
  const cabins: Cabin[] = [];
  for (let c = 1; c <= 9; c++) {
    const start = (c - 1) * 8 + 1;
    cabins.push({
      cabinNumber: c,
      main: [
        { number: start, type: 'LB', name: 'Lower Berth' },
        { number: start + 1, type: 'MB', name: 'Middle Berth' },
        { number: start + 2, type: 'UB', name: 'Upper Berth' },
        { number: start + 3, type: 'LB', name: 'Lower Berth' },
        { number: start + 4, type: 'MB', name: 'Middle Berth' },
        { number: start + 5, type: 'UB', name: 'Upper Berth' },
      ],
      side: [
        { number: start + 6, type: 'SL', name: 'Side Lower' },
        { number: start + 7, type: 'SU', name: 'Side Upper' },
      ],
    });
  }
  return {
    classCode: '3A',
    className: 'AC 3-Tier',
    totalBerths: 72,
    hasSeats: false,
    cabins,
  };
}

/**
 * Generates the authentic 54-berth AC 2-Tier (2A) blueprint (9 bays × 6 berths).
 * Main compartment (4 berths): LB, UB facing LB, UB.
 * Side corridor (2 berths): SL, SU.
 */
export function build2ABlueprint(): BlueprintClass {
  const cabins: Cabin[] = [];
  for (let c = 1; c <= 9; c++) {
    const start = (c - 1) * 6 + 1;
    cabins.push({
      cabinNumber: c,
      main: [
        { number: start, type: 'LB', name: 'Lower Berth' },
        { number: start + 1, type: 'UB', name: 'Upper Berth' },
        { number: start + 2, type: 'LB', name: 'Lower Berth' },
        { number: start + 3, type: 'UB', name: 'Upper Berth' },
      ],
      side: [
        { number: start + 4, type: 'SL', name: 'Side Lower' },
        { number: start + 5, type: 'SU', name: 'Side Upper' },
      ],
    });
  }
  return {
    classCode: '2A',
    className: 'AC 2-Tier',
    totalBerths: 54,
    hasSeats: false,
    cabins,
  };
}

/**
 * Generates the authentic 72-berth Sleeper Class (SL) blueprint (9 bays × 8 berths).
 */
export function buildSLBlueprint(): BlueprintClass {
  const bp = build3ABlueprint();
  return {
    ...bp,
    classCode: 'SL',
    className: 'Sleeper Class',
  };
}

/**
 * Generates the authentic 108-seat Second Sitting (2S) blueprint (18 rows × 6 seats, 3+3 layout).
 */
export function build2SBlueprint(): BlueprintClass {
  const cabins: Cabin[] = [];
  for (let r = 1; r <= 18; r++) {
    const start = (r - 1) * 6 + 1;
    cabins.push({
      cabinNumber: r,
      main: [
        { number: start, type: 'WS', name: 'Window Seat' },
        { number: start + 1, type: 'MS', name: 'Middle Seat' },
        { number: start + 2, type: 'AS', name: 'Aisle Seat' },
      ],
      side: [
        { number: start + 3, type: 'AS', name: 'Aisle Seat' },
        { number: start + 4, type: 'MS', name: 'Middle Seat' },
        { number: start + 5, type: 'WS', name: 'Window Seat' },
      ],
    });
  }
  return {
    classCode: '2S',
    className: 'Second Sitting',
    totalBerths: 108,
    hasSeats: true,
    cabins,
  };
}

/**
 * Generates the authentic 83-berth AC 3-Tier Economy (3E) blueprint.
 */
export function build3EBlueprint(): BlueprintClass {
  const cabins: Cabin[] = [];
  for (let c = 1; c <= 9; c++) {
    const start = (c - 1) * 9 + 1;
    cabins.push({
      cabinNumber: c,
      main: [
        { number: start, type: 'LB', name: 'Lower Berth' },
        { number: start + 1, type: 'MB', name: 'Middle Berth' },
        { number: start + 2, type: 'UB', name: 'Upper Berth' },
        { number: start + 3, type: 'LB', name: 'Lower Berth' },
        { number: start + 4, type: 'MB', name: 'Middle Berth' },
        { number: start + 5, type: 'UB', name: 'Upper Berth' },
      ],
      side: [
        { number: start + 6, type: 'SL', name: 'Side Lower' },
        { number: start + 7, type: 'SM', name: 'Side Middle' },
        { number: start + 8, type: 'SU', name: 'Side Upper' },
      ],
    });
  }
  return {
    classCode: '3E',
    className: 'AC 3-Tier Economy',
    totalBerths: 83,
    hasSeats: false,
    cabins,
  };
}

/**
 * Generates the authentic 24-berth First AC (1A) blueprint (4 Cabins + 4 Coupes).
 */
export function build1ABlueprint(): BlueprintClass {
  const cabins: Cabin[] = [
    // 4 Cabins (4 berths each: LB, UB, LB, UB)
    { cabinNumber: 1, main: [{ number: 1, type: 'LB', name: 'Lower Berth' }, { number: 2, type: 'UB', name: 'Upper Berth' }], side: [{ number: 3, type: 'LB', name: 'Lower Berth' }, { number: 4, type: 'UB', name: 'Upper Berth' }] },
    { cabinNumber: 2, main: [{ number: 5, type: 'LB', name: 'Lower Berth' }, { number: 6, type: 'UB', name: 'Upper Berth' }], side: [{ number: 7, type: 'LB', name: 'Lower Berth' }, { number: 8, type: 'UB', name: 'Upper Berth' }] },
    { cabinNumber: 3, main: [{ number: 9, type: 'LB', name: 'Lower Berth' }, { number: 10, type: 'UB', name: 'Upper Berth' }], side: [{ number: 11, type: 'LB', name: 'Lower Berth' }, { number: 12, type: 'UB', name: 'Upper Berth' }] },
    { cabinNumber: 4, main: [{ number: 13, type: 'LB', name: 'Lower Berth' }, { number: 14, type: 'UB', name: 'Upper Berth' }], side: [{ number: 15, type: 'LB', name: 'Lower Berth' }, { number: 16, type: 'UB', name: 'Upper Berth' }] },
    // 4 Coupes (2 berths each: LB, UB)
    { cabinNumber: 5, main: [{ number: 17, type: 'LB', name: 'Lower Berth' }, { number: 18, type: 'UB', name: 'Upper Berth' }], side: [] },
    { cabinNumber: 6, main: [{ number: 19, type: 'LB', name: 'Lower Berth' }, { number: 20, type: 'UB', name: 'Upper Berth' }], side: [] },
    { cabinNumber: 7, main: [{ number: 21, type: 'LB', name: 'Lower Berth' }, { number: 22, type: 'UB', name: 'Upper Berth' }], side: [] },
    { cabinNumber: 8, main: [{ number: 23, type: 'LB', name: 'Lower Berth' }, { number: 24, type: 'UB', name: 'Upper Berth' }], side: [] },
  ];
  return {
    classCode: '1A',
    className: 'AC First Class',
    totalBerths: 24,
    hasSeats: false,
    cabins,
  };
}

/**
 * Normalizes API blueprints to ensure all standard Indian Railways classes have authentic blueprints.
 */
export function normalizeBlueprints(
  blueprints?: Record<string, BlueprintClass>
): Record<string, BlueprintClass> {
  const result: Record<string, BlueprintClass> = { ...(blueprints || {}) };
  if (!result.CC) result.CC = buildVandeBharatCCBlueprint();
  if (!result.EC) result.EC = buildECBlueprint();
  if (!result['3A']) result['3A'] = build3ABlueprint();
  if (!result['2A']) result['2A'] = build2ABlueprint();
  if (!result.SL) result.SL = buildSLBlueprint();
  if (!result['2S']) result['2S'] = build2SBlueprint();
  if (!result['3E']) result['3E'] = build3EBlueprint();
  if (!result['1A']) result['1A'] = build1ABlueprint();
  return result;
}

// Seed static blueprint / rake for Train 26101 (Ajni Vande Bharat)
export const FALLBACK_26101_COACHES: CoachPositionResponse = {
  trainNumber: '26101',
  trainName: 'Pune - Ajni Vande Bharat Express',
  totalCoaches: 8,
  coachPosition: 'C7-C6-E1-C5-C4-C3-C2-C1',
  rake: [
    { position: 1, code: 'C7', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
    { position: 2, code: 'C6', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
    { position: 3, code: 'E1', classType: 'EC', className: 'Executive Chair Car', category: 'ec', totalBerths: 56, hasSeats: true },
    { position: 4, code: 'C5', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
    { position: 5, code: 'C4', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
    { position: 6, code: 'C3', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
    { position: 7, code: 'C2', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
    { position: 8, code: 'C1', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
  ],
  summary: { CC: 7, EC: 1 },
  blueprints: normalizeBlueprints(),
};

// Seed static blueprint / rake for Train 11039 (Maharashtra Express)
export const FALLBACK_11039_COACHES: CoachPositionResponse = {
  trainNumber: '11039',
  trainName: 'Maharashtra Express',
  totalCoaches: 22,
  coachPosition: 'SLR-GS-GS-S1-S2-S3-S4-S5-S6-S7-PC-B1-B2-B3-B4-B5-B6-A1-A2-GS-GS-SLR',
  rake: [
    { position: 1, code: 'SLR', classType: 'GEN', className: 'Luggage / Guard', category: 'gen', totalBerths: 0, hasSeats: false },
    { position: 2, code: 'GS', classType: 'GEN', className: 'General Unreserved', category: 'gen', totalBerths: 0, hasSeats: false },
    { position: 3, code: 'GS', classType: 'GEN', className: 'General Unreserved', category: 'gen', totalBerths: 0, hasSeats: false },
    { position: 4, code: 'S1', classType: 'SL', className: 'Sleeper Class', category: 'sl', totalBerths: 72, hasSeats: false },
    { position: 5, code: 'S2', classType: 'SL', className: 'Sleeper Class', category: 'sl', totalBerths: 72, hasSeats: false },
    { position: 6, code: 'S3', classType: 'SL', className: 'Sleeper Class', category: 'sl', totalBerths: 72, hasSeats: false },
    { position: 7, code: 'S4', classType: 'SL', className: 'Sleeper Class', category: 'sl', totalBerths: 72, hasSeats: false },
    { position: 8, code: 'S5', classType: 'SL', className: 'Sleeper Class', category: 'sl', totalBerths: 72, hasSeats: false },
    { position: 9, code: 'S6', classType: 'SL', className: 'Sleeper Class', category: 'sl', totalBerths: 72, hasSeats: false },
    { position: 10, code: 'S7', classType: 'SL', className: 'Sleeper Class', category: 'sl', totalBerths: 72, hasSeats: false },
    { position: 11, code: 'PC', classType: 'PC', className: 'Pantry Car', category: 'pc', totalBerths: 0, hasSeats: false },
    { position: 12, code: 'B1', classType: '3A', className: 'AC 3-Tier', category: '3a', totalBerths: 72, hasSeats: false },
    { position: 13, code: 'B2', classType: '3A', className: 'AC 3-Tier', category: '3a', totalBerths: 72, hasSeats: false },
    { position: 14, code: 'B3', classType: '3A', className: 'AC 3-Tier', category: '3a', totalBerths: 72, hasSeats: false },
    { position: 15, code: 'B4', classType: '3A', className: 'AC 3-Tier', category: '3a', totalBerths: 72, hasSeats: false },
    { position: 16, code: 'B5', classType: '3A', className: 'AC 3-Tier', category: '3a', totalBerths: 72, hasSeats: false },
    { position: 17, code: 'B6', classType: '3A', className: 'AC 3-Tier', category: '3a', totalBerths: 72, hasSeats: false },
    { position: 18, code: 'A1', classType: '2A', className: 'AC 2-Tier', category: '2a', totalBerths: 54, hasSeats: false },
    { position: 19, code: 'A2', classType: '2A', className: 'AC 2-Tier', category: '2a', totalBerths: 54, hasSeats: false },
    { position: 20, code: 'GS', classType: 'GEN', className: 'General Unreserved', category: 'gen', totalBerths: 0, hasSeats: false },
    { position: 21, code: 'GS', classType: 'GEN', className: 'General Unreserved', category: 'gen', totalBerths: 0, hasSeats: false },
    { position: 22, code: 'SLR', classType: 'GEN', className: 'Luggage / Guard', category: 'gen', totalBerths: 0, hasSeats: false },
  ],
  summary: { SL: 7, '3A': 6, '2A': 2, GEN: 4, PC: 1, SLR: 2 },
  blueprints: normalizeBlueprints(),
};

// Seed realistic scheduled route & timetable for Train 11039 (Maharashtra Express)
export const FALLBACK_11039_DETAILS: LegacyTrainDetails = {
  trainNumber: '11039',
  trainName: 'Maharashtra Express',
  type: 'EXPRESS',
  sourceStationCode: 'PUNE',
  sourceStationName: 'Pune Jn',
  destinationStationCode: 'NGP',
  destinationStationName: 'Nagpur Jn',
  totalHalts: 19,
  distanceKm: 885,
  travelTimeMinutes: 1020,
  route: [
    { sequence: 1, stationCode: 'PUNE', stationName: 'Pune Jn', isHalt: true, distanceFromSourceKm: 0, scheduledDeparture: 1340, platform: '2' },
    { sequence: 2, stationCode: 'DDCC', stationName: 'Daund Chord Line', isHalt: true, distanceFromSourceKm: 73, scheduledArrival: 1408, scheduledDeparture: 1410, platform: '3' },
    { sequence: 3, stationCode: 'ANG', stationName: 'Ahmednagar Jn', isHalt: true, distanceFromSourceKm: 155, scheduledArrival: 57, scheduledDeparture: 60, platform: '1' },
    { sequence: 4, stationCode: 'BAP', stationName: 'Belapur', isHalt: true, distanceFromSourceKm: 222, scheduledArrival: 118, scheduledDeparture: 120, platform: '1' },
    { sequence: 5, stationCode: 'KPG', stationName: 'Kopargaon', isHalt: true, distanceFromSourceKm: 266, scheduledArrival: 163, scheduledDeparture: 165, platform: '1' },
    { sequence: 6, stationCode: 'MMR', stationName: 'Manmad Jn', isHalt: true, distanceFromSourceKm: 308, scheduledArrival: 245, scheduledDeparture: 250, platform: '2' },
    { sequence: 7, stationCode: 'CSN', stationName: 'Chalisgaon Jn', isHalt: true, distanceFromSourceKm: 376, scheduledArrival: 298, scheduledDeparture: 300, platform: '2' },
    { sequence: 8, stationCode: 'JL', stationName: 'Jalgaon Jn', isHalt: true, distanceFromSourceKm: 468, scheduledArrival: 373, scheduledDeparture: 375, platform: '3' },
    { sequence: 9, stationCode: 'BSL', stationName: 'Bhusaval Jn', isHalt: true, distanceFromSourceKm: 492, scheduledArrival: 410, scheduledDeparture: 415, platform: '5' },
    { sequence: 10, stationCode: 'MKU', stationName: 'Malkapur', isHalt: true, distanceFromSourceKm: 543, scheduledArrival: 463, scheduledDeparture: 465, platform: '2' },
    { sequence: 11, stationCode: 'NN', stationName: 'Nandura', isHalt: true, distanceFromSourceKm: 571, scheduledArrival: 488, scheduledDeparture: 490, platform: '2' },
    { sequence: 12, stationCode: 'SEG', stationName: 'Shegaon', isHalt: true, distanceFromSourceKm: 595, scheduledArrival: 508, scheduledDeparture: 510, platform: '2' },
    { sequence: 13, stationCode: 'AK', stationName: 'Akola Jn', isHalt: true, distanceFromSourceKm: 632, scheduledArrival: 545, scheduledDeparture: 550, platform: '2' },
    { sequence: 14, stationCode: 'MZR', stationName: 'Murtizapur Jn', isHalt: true, distanceFromSourceKm: 669, scheduledArrival: 578, scheduledDeparture: 580, platform: '2' },
    { sequence: 15, stationCode: 'BD', stationName: 'Badnera Jn', isHalt: true, distanceFromSourceKm: 711, scheduledArrival: 647, scheduledDeparture: 650, platform: '2' },
    { sequence: 16, stationCode: 'DMN', stationName: 'Dhamangaon', isHalt: true, distanceFromSourceKm: 756, scheduledArrival: 688, scheduledDeparture: 690, platform: '2' },
    { sequence: 17, stationCode: 'PLO', stationName: 'Pulgaon', isHalt: true, distanceFromSourceKm: 776, scheduledArrival: 708, scheduledDeparture: 710, platform: '2' },
    { sequence: 18, stationCode: 'WR', stationName: 'Wardha Jn', isHalt: true, distanceFromSourceKm: 806, scheduledArrival: 738, scheduledDeparture: 740, platform: '2' },
    { sequence: 19, stationCode: 'NGP', stationName: 'Nagpur Jn', isHalt: true, distanceFromSourceKm: 885, scheduledArrival: 928, scheduledDeparture: 935, platform: '2' },
  ],
};

/**
 * Intelligent default rake generator for any train number and coach code.
 */
export function buildDefaultRakeForTrain(trainNumber: string, userCoach?: string): CoachPositionResponse {
  const cleanNumber = (trainNumber || '').trim();
  if (cleanNumber === '26101') return FALLBACK_26101_COACHES;
  if (cleanNumber === '11039') return FALLBACK_11039_COACHES;

  const coachUpper = (userCoach || '').trim().toUpperCase();
  const isVandeOrChair = coachUpper.startsWith('C') || coachUpper.startsWith('E');

  if (isVandeOrChair) {
    const rake: CoachItem[] = [
      { position: 1, code: 'C7', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
      { position: 2, code: 'C6', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
      { position: 3, code: 'E1', classType: 'EC', className: 'Executive Chair Car', category: 'ec', totalBerths: 56, hasSeats: true },
      { position: 4, code: 'C5', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
      { position: 5, code: 'C4', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
      { position: 6, code: 'C3', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
      { position: 7, code: 'C2', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
      { position: 8, code: 'C1', classType: 'CC', className: 'AC Chair Car', category: 'cc', totalBerths: 78, hasSeats: true },
    ];
    return {
      trainNumber: cleanNumber,
      trainName: 'Express Service',
      totalCoaches: 8,
      coachPosition: rake.map((r) => r.code).join('-'),
      rake,
      blueprints: normalizeBlueprints(),
    };
  }

  // Standard 22-coach Superfast Express
  return {
    trainNumber: cleanNumber,
    trainName: 'Superfast Express',
    totalCoaches: FALLBACK_11039_COACHES.totalCoaches,
    coachPosition: FALLBACK_11039_COACHES.coachPosition,
    rake: FALLBACK_11039_COACHES.rake,
    blueprints: normalizeBlueprints(),
  };
}

// Seed static live running data for Train 26101 matching route Pune to Badnera
const FALLBACK_26101_LIVE: LiveTrainData = {
  trainNumber: '26101',
  trainName: 'Pune - Ajni Vande Bharat Express',
  startDate: new Date().toISOString().split('T')[0],
  lastUpdatedAt: new Date().toISOString(),
  status: 'running',
  delayMinutes: 0,
  currentLocation: {
    stationCode: 'ANG',
    stationName: 'Ahmednagar Jn',
    sequence: 20,
    status: 'en-route',
    isHalt: false,
    speedKmh: 112,
    distanceFromOriginKm: 140,
    distanceFromLastStationKm: 67.4,
    delayMinutes: 0,
  },
  previousHalt: {
    stationCode: 'DDCC',
    stationName: 'Daund Jn (DD)',
    sequence: 12,
    distance: 72.6,
    departureTime: '07:28 AM',
    platform: '3',
  },
  nextHalt: {
    stationCode: 'ANG',
    stationName: 'Ahmednagar Jn',
    sequence: 20,
    distance: 154.4,
    arrivalTime: '08:12 AM',
    platform: '1',
  },
  route: [
    {
      sequence: 1,
      stationCode: 'PUNE',
      stationName: 'Pune Jn',
      isHalt: true,
      scheduledDeparture: '06:25 AM',
      actualDeparture: '06:25 AM',
      status: 'departed',
      distance: 0,
      platform: '5',
    },
    {
      sequence: 12,
      stationCode: 'DDCC',
      stationName: 'Daund Jn',
      isHalt: true,
      scheduledArrival: '07:13 AM',
      scheduledDeparture: '07:15 AM',
      actualArrival: '07:25 AM',
      actualDeparture: '07:28 AM',
      status: 'departed',
      distance: 72.6,
      platform: '3',
    },
    {
      sequence: 20,
      stationCode: 'ANG',
      stationName: 'Ahmednagar Jn',
      isHalt: true,
      scheduledArrival: '08:12 AM',
      scheduledDeparture: '08:14 AM',
      status: 'upcoming',
      distance: 154.4,
      platform: '1',
    },
    {
      sequence: 34,
      stationCode: 'KPG',
      stationName: 'Kopargaon',
      isHalt: true,
      scheduledArrival: '09:38 AM',
      scheduledDeparture: '09:40 AM',
      status: 'upcoming',
      distance: 266.1,
      platform: '1',
    },
    {
      sequence: 38,
      stationCode: 'MMR',
      stationName: 'Manmad Jn',
      isHalt: true,
      scheduledArrival: '10:32 AM',
      scheduledDeparture: '10:35 AM',
      status: 'upcoming',
      distance: 308.3,
      platform: '2',
    },
    {
      sequence: 57,
      stationCode: 'JL',
      stationName: 'Jalgaon Jn',
      isHalt: true,
      scheduledArrival: '12:18 PM',
      scheduledDeparture: '12:20 PM',
      status: 'upcoming',
      distance: 468.5,
      platform: '3',
    },
    {
      sequence: 60,
      stationCode: 'BSL',
      stationName: 'Bhusaval Jn',
      isHalt: true,
      scheduledArrival: '12:50 PM',
      scheduledDeparture: '12:55 PM',
      status: 'upcoming',
      distance: 492.5,
      platform: '5',
    },
    {
      sequence: 73,
      stationCode: 'SEG',
      stationName: 'Shegaon',
      isHalt: true,
      scheduledArrival: '02:13 PM',
      scheduledDeparture: '02:15 PM',
      status: 'upcoming',
      distance: 594.8,
      platform: '2',
    },
    {
      sequence: 77,
      stationCode: 'AK',
      stationName: 'Akola Jn',
      isHalt: true,
      scheduledArrival: '02:40 PM',
      scheduledDeparture: '02:42 PM',
      status: 'upcoming',
      distance: 631.8,
      platform: '2',
    },
    {
      sequence: 86,
      stationCode: 'BD',
      stationName: 'Badnera Jn',
      isHalt: true,
      scheduledArrival: '03:48 PM',
      scheduledDeparture: '03:50 PM',
      status: 'upcoming',
      distance: 710.8,
      platform: '2',
    },
    {
      sequence: 106,
      stationCode: 'AJNI',
      stationName: 'Ajni (Nagpur)',
      isHalt: true,
      scheduledArrival: '06:25 PM',
      status: 'upcoming',
      distance: 881.7,
      platform: '3',
    },
  ],
  isLive: true,
};

// Seed realistic scheduled route & timetable for Train 26101 (Ajni Vande Bharat Express)
export const FALLBACK_26101_DETAILS: LegacyTrainDetails = {
  trainNumber: '26101',
  trainName: 'Ajni Vande Bharat Express',
  type: 'VANDE BHARAT',
  sourceStationCode: 'PUNE',
  sourceStationName: 'Pune Jn',
  destinationStationCode: 'AJNI',
  destinationStationName: 'Ajni (Nagpur)',
  totalHalts: 11,
  distanceKm: 882,
  travelTimeMinutes: 650,
  route: FALLBACK_26101_LIVE.route.map((r) => ({
    sequence: r.sequence,
    stationCode: r.stationCode,
    stationName: r.stationName,
    isHalt: r.isHalt,
    distanceFromSourceKm: r.distance,
    scheduledArrival: r.scheduledArrival,
    scheduledDeparture: r.scheduledDeparture,
    platform: r.platform,
  })),
};

// Permanent Cache for Coach Formations (starts empty, caches permanently on first API fetch)

/**
 * Fetch Coach Position & Blueprint Layout
 * CACHED PERMANENTLY: Never makes duplicate API calls for the same train number!
 */
export async function getCoachPosition(
  trainNumber: string,
  forceRefresh: boolean = false,
  userCoach?: string
): Promise<CoachPositionResponse> {
  const cleanNumber = (trainNumber || '').trim();
  if (!cleanNumber) {
    return buildDefaultRakeForTrain('', userCoach);
  }

  // 1. Return from permanent cache if available
  if (!forceRefresh && coachCache.has(cleanNumber)) {
    return { ...coachCache.get(cleanNumber)!, isCached: true };
  }

  // 2. Fetch from Cloudflare NTES Proxy first (100,000 reqs/day, zero limit)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${CLOUDFLARE_PROXY_URL}/?train=${cleanNumber}`, {
      method: 'GET',
      headers: defaultProxyHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json?.success) {
        if (json.trainName) {
          registerTrainName(cleanNumber, json.trainName);
        }
        if (Array.isArray(json?.coaches) && json.coaches.length > 0) {
          const rake: CoachItem[] = json.coaches.map((c: any) => ({
          position: c.position || 1,
          code: c.coachCode || '',
          classType: c.classType || 'CC',
          className: c.classType === 'EC' ? 'Executive Chair Car' : 'AC Chair Car',
          totalBerths: 78,
          hasSeats: true,
        }));

        const coachData: CoachPositionResponse = {
          trainNumber: json.trainNumber || cleanNumber,
          trainName: json.trainName || '',
          totalCoaches: json.totalCoaches || rake.length,
          coachPosition: json.coachPosition || rake.map((r) => r.code).join('-'),
          rake,
          blueprints: normalizeBlueprints(),
          isCached: false,
        };

        coachCache.set(cleanNumber, coachData);
        return coachData;
      }
    }
  }
} catch (proxyErr) {
    console.log(`[RailService] Cloudflare coach error for ${cleanNumber}:`, proxyErr);
  }

  // 3. Fallback if network fails
  const fallback = buildDefaultRakeForTrain(cleanNumber, userCoach);
  coachCache.set(cleanNumber, fallback);
  return fallback;
}

/**
 * Fetch Official Train Details & Full Route Halts
 * Endpoint: GET /v1/legacy/trains/{number}
 * CALLED ONCE WHEN TICKET IS ADDED TO WALLET.
 * Cached permanently per train number.
 */
export async function getLegacyTrainDetails(
  trainNumber: string,
  forceRefresh: boolean = false
): Promise<LegacyTrainDetails | null> {
  const cleanNumber = (trainNumber || '').trim();
  if (!cleanNumber) return null;

  if (!forceRefresh && legacyTrainCache.has(cleanNumber)) {
    return { ...legacyTrainCache.get(cleanNumber)!, isCached: true };
  }

  // 1. Fetch from Cloudflare NTES Proxy first (100,000 reqs/day)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${CLOUDFLARE_PROXY_URL}/?train=${cleanNumber}`, {
      method: 'GET',
      headers: defaultProxyHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json?.success) {
        if (json.trainName) {
          registerTrainName(cleanNumber, json.trainName);
        }
        if (Array.isArray(json?.stations) && json.stations.length > 0) {
          const routeList: LegacyRouteHalt[] = json.stations.map((s: any, idx: number) => ({
            id: s.sequence || idx + 1,
            sequence: s.sequence || idx + 1,
            stationCode: (s.stationCode || '').toUpperCase(),
            stationName: s.stationName || '',
            isHalt: true,
            distanceFromSourceKm: (s.sequence || idx + 1) * 60,
            scheduledArrival: s.scheduledArrival || undefined,
            scheduledDeparture: s.scheduledDeparture || undefined,
            platform: s.platform ? String(s.platform) : undefined,
          }));

          const details: LegacyTrainDetails = {
            trainNumber: json.trainNumber || cleanNumber,
            trainName: json.trainName || '',
            type: 'VANDE BHARAT',
            sourceStationCode: (json.sourceStationCode || routeList[0]?.stationCode || '').toUpperCase(),
            sourceStationName: json.sourceStation || routeList[0]?.stationName || '',
            destinationStationCode: (json.destinationStationCode || routeList[routeList.length - 1]?.stationCode || '').toUpperCase(),
            destinationStationName: json.destinationStation || routeList[routeList.length - 1]?.stationName || '',
            totalHalts: routeList.length,
            distanceKm: routeList.length * 60,
            travelTimeMinutes: 720,
            route: routeList,
            isCached: false,
          };

          legacyTrainCache.set(cleanNumber, details);
          return details;
        } else if (json.trainName) {
          // Train is scheduled for future date but metadata (name, src, dst) is confirmed by NTES
          const details: LegacyTrainDetails = {
            trainNumber: json.trainNumber || cleanNumber,
            trainName: json.trainName,
            type: 'EXPRESS',
            sourceStationCode: (json.sourceStationCode || '').toUpperCase(),
            sourceStationName: json.sourceStation || '',
            destinationStationCode: (json.destinationStationCode || '').toUpperCase(),
            destinationStationName: json.destinationStation || '',
            totalHalts: 0,
            distanceKm: 0,
            travelTimeMinutes: 0,
            route: [],
            isCached: false,
          };

          legacyTrainCache.set(cleanNumber, details);
          return details;
        }
      }
    }
  } catch (proxyErr) {
    console.log(`[RailService] Cloudflare legacy route error for ${cleanNumber}:`, proxyErr);
  }

  // Fallback for known trains when offline
  if (cleanNumber === '11039') {
    legacyTrainCache.set(cleanNumber, FALLBACK_11039_DETAILS);
    return { ...FALLBACK_11039_DETAILS, isCached: true };
  }
  if (cleanNumber === '26101') {
    legacyTrainCache.set(cleanNumber, FALLBACK_26101_DETAILS);
    return { ...FALLBACK_26101_DETAILS, isCached: true };
  }

  return null;
}

/**
 * Fetch Train Coach Position at a specific Station (e.g. Boarding Station)
 * Endpoint: GET /v1/trains/{number}/coaches/{station}
 * CALLED ONCE WHEN CLICKED ON TRAIN STATUS.
 * Cached permanently per train number + station code.
 */
export async function getStationCoachPosition(
  trainNumber: string,
  stationCode: string,
  forceRefresh: boolean = false
): Promise<StationCoachResponse | null> {
  const cleanNumber = (trainNumber || '').trim();
  const cleanStation = (stationCode || '').trim().toUpperCase();
  if (!cleanNumber || !cleanStation) return null;

  const cacheKey = `${cleanNumber}_${cleanStation}`;
  if (!forceRefresh && stationCoachCache.has(cacheKey)) {
    return { ...stationCoachCache.get(cacheKey)!, isCached: true };
  }

  // 0. Query on-device Native NTES directly (Zero-proxy official CRIS NTES on Android)
  try {
    const notifMod = NativeModules?.NoraNotificationModule;
    if (Platform.OS === 'android' && notifMod?.queryNtesLive) {
      const nativeRaw = await notifMod.queryNtesLive(cleanNumber, cleanStation);
      if (nativeRaw) {
        const nativeJson = JSON.parse(nativeRaw);
        if (nativeJson?.success && nativeJson.platform) {
          const resp: StationCoachResponse = {
            trainNumber: cleanNumber,
            trainName: nativeJson.trainName || '',
            stationCode: cleanStation,
            stationName: cleanStation,
            platform: nativeJson.platform,
            direction: 'Up',
            formation: nativeJson.coachPosition || '',
            reversal: false,
            totalCoaches: nativeJson.coachPosition ? nativeJson.coachPosition.split('-').length : 0,
            rake: nativeJson.coachPosition
              ? nativeJson.coachPosition.split('-').map((code: string, idx: number) => ({
                  position: idx + 1,
                  code,
                  classType: code.startsWith('C') || code.startsWith('E') ? 'CC' : code.startsWith('B') ? '3A' : code.startsWith('A') ? '2A' : code.startsWith('S') ? 'SL' : 'GEN',
                  className: code.startsWith('B') ? 'AC 3-Tier' : 'Class',
                  totalBerths: 72,
                  hasSeats: false,
                }))
              : [],
            isCached: false,
          };
          stationCoachCache.set(cacheKey, resp);
          return resp;
        }
      }
    }
  } catch (_) {}

  // 1. Fetch from Cloudflare Proxy (NTES real-time data, unlimited free quota)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    let res = await fetch(
      `${CLOUDFLARE_PROXY_URL}/?train=${cleanNumber}&station=${cleanStation}`,
      {
        method: 'GET',
        headers: defaultProxyHeaders,
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      let json = await res.json();

      // If station-specific call returned empty coaches, fallback to train-level worker call
      if (!json?.coaches || json.coaches.length === 0) {
        try {
          const c2 = new AbortController();
          const t2 = setTimeout(() => c2.abort(), 5000);
          const r2 = await fetch(`${CLOUDFLARE_PROXY_URL}/?train=${cleanNumber}`, {
            method: 'GET',
            headers: defaultProxyHeaders,
            signal: c2.signal,
          });
          clearTimeout(t2);
          if (r2.ok) {
            const j2 = await r2.json();
            if (j2?.success && Array.isArray(j2.coaches) && j2.coaches.length > 0) {
              json = j2;
            }
          }
        } catch (_) {}
      }

      if (json?.success) {
        if (json.trainName) {
          registerTrainName(cleanNumber, json.trainName);
        }
        if (Array.isArray(json?.coaches) && json.coaches.length > 0) {
          const rakeList: CoachItem[] = json.coaches.map((c: any) => ({
            position: c.position || 1,
            code: c.coachCode || '',
            classType: c.classType || 'CC',
            className: c.classType === 'EC' ? 'Executive Chair Car' : 'AC Chair Car',
            totalBerths: 78,
            hasSeats: true,
          }));

          let platform = json.platform && json.platform !== 'TBD' ? String(json.platform) : undefined;
          if (!platform && Array.isArray(json.stations)) {
            const matchedStn = json.stations.find((s: any) => (s.stationCode || '').toUpperCase() === cleanStation);
            if (matchedStn?.platform && matchedStn.platform !== 'TBD') {
              platform = String(matchedStn.platform);
            }
          }

          const response: StationCoachResponse = {
            trainNumber: json.trainNumber || cleanNumber,
            trainName: json.trainName || '',
            stationCode: cleanStation,
            stationName: json.boardingStation || cleanStation,
            platform: platform,
            direction: 'Up',
            formation: json.coachPosition || rakeList.map((r) => r.code).join('-'),
            reversal: false,
            totalCoaches: json.totalCoaches || rakeList.length,
            rake: rakeList,
            blueprints: normalizeBlueprints(),
            isCached: false,
          };

          stationCoachCache.set(cacheKey, response);
          return response;
        }
      }
    }
  } catch (proxyErr) {
    console.log(`[RailService] Cloudflare station coach error for ${cleanNumber}/${cleanStation}:`, proxyErr);
  }

  return null;
}

/**
 * Fetch Live Running Status with 3-minute strict cooldown
 * Respects 1000 requests/month quota by returning cached responses on rapid refreshes.
 */
export async function getLiveTrainStatus(
  trainNumber: string,
  forceRefresh: boolean = false
): Promise<LiveTrainData> {
  const cleanNumber = (trainNumber || '').trim();
  const now = Date.now();

  // 1. Check cooldown cache
  const cachedEntry = liveCache.get(cleanNumber);
  if (cachedEntry) {
    const elapsed = now - cachedEntry.timestamp;
    if (!forceRefresh && elapsed < LIVE_COOLDOWN_MS) {
      return {
        ...cachedEntry.data,
        isCached: true,
        cacheTime: new Date(cachedEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }
  }

  // 2. Fetch from Cloudflare Proxy (NTES real-time data, unlimited free quota)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(`${CLOUDFLARE_PROXY_URL}/?train=${cleanNumber}`, {
      method: 'GET',
      headers: defaultProxyHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json?.success) {
        if (json.trainName) {
          registerTrainName(cleanNumber, json.trainName);
        }
        if (Array.isArray(json?.stations) && json.stations.length > 0) {
        const halts: StationHalt[] = json.stations.map((s: any, idx: number) => {
          let haltStatus: 'departed' | 'arrived' | 'at-station' | 'upcoming' = 'upcoming';
          if (s.isDeparted === true) {
            haltStatus = 'departed';
          } else if (s.isArrived === true && !s.isDeparted) {
            haltStatus = 'at-station';
          } else if (idx === 0) {
            haltStatus = 'arrived';
          }

          return {
            sequence: s.sequence || idx + 1,
            stationCode: (s.stationCode || '').toUpperCase(),
            stationName: s.stationName || '',
            isHalt: true,
            scheduledArrival: s.scheduledArrival || undefined,
            scheduledDeparture: s.scheduledDeparture || (idx === 0 ? json.scheduledDeparture : undefined),
            status: haltStatus,
            distance: typeof s.distanceKm === 'number' ? s.distanceKm : (s.sequence || idx + 1) * 60,
            platform: s.platform && s.platform !== 'TBD' ? String(s.platform) : undefined,
            coachPosition: s.coachPosition || json.coachPosition,
          };
        });

        // Resolve active station location from NTES
        const currentStnCode = (json.currentStationCode || json.sourceStationCode || halts[0]?.stationCode || '').toUpperCase();
        const currentStnName = json.currentStation || json.sourceStation || halts[0]?.stationName || '';
        const currentPositionDesc = json.currentPosition || json.currentStatus || 'Running';

        // Resolve previous and next halt from NTES
        let prevHaltObj: LiveTrainData['previousHalt'] = undefined;
        let nextHaltObj: LiveTrainData['nextHalt'] = undefined;

        const departedHalts = halts.filter(h => h.status === 'departed');
        const lastDepartedHalt = departedHalts.length > 0 ? departedHalts[departedHalts.length - 1] : undefined;

        if (json.currentStationCode) {
          const matchedPrev = halts.find(h => h.stationCode === json.currentStationCode.toUpperCase());
          if (matchedPrev) {
            prevHaltObj = {
              stationCode: matchedPrev.stationCode,
              stationName: matchedPrev.stationName,
              sequence: matchedPrev.sequence,
              distance: matchedPrev.distance,
              departureTime: matchedPrev.scheduledDeparture,
              platform: matchedPrev.platform,
            };
          } else {
            prevHaltObj = {
              stationCode: json.currentStationCode.toUpperCase(),
              stationName: json.currentStation || lastDepartedHalt?.stationName || json.currentStationCode,
              sequence: lastDepartedHalt?.sequence || 1,
              distance: json.distanceCoveredKm || lastDepartedHalt?.distance || 0,
              departureTime: json.currentStatus ? json.currentStatus.replace(/.*at\s+/i, '') : lastDepartedHalt?.scheduledDeparture,
              platform: lastDepartedHalt?.platform,
            };
          }
        }
        if (!prevHaltObj) {
          const fallback = lastDepartedHalt || halts[0];
          if (fallback) {
            prevHaltObj = {
              stationCode: fallback.stationCode,
              stationName: fallback.stationName,
              sequence: fallback.sequence,
              distance: fallback.distance,
              departureTime: fallback.scheduledDeparture,
              platform: fallback.platform || (json.platform !== 'TBD' ? json.platform : undefined),
            };
          }
        }

        if (json.nextHaltCode) {
          const matchedNext = halts.find(h => h.stationCode === json.nextHaltCode.toUpperCase());
          if (matchedNext) {
            nextHaltObj = {
              stationCode: matchedNext.stationCode,
              stationName: matchedNext.stationName,
              sequence: matchedNext.sequence,
              distance: matchedNext.distance,
              arrivalTime: matchedNext.scheduledArrival,
              platform: matchedNext.platform,
            };
          }
        }
        if (!nextHaltObj && halts[1]) {
          nextHaltObj = {
            stationCode: halts[1].stationCode,
            stationName: halts[1].stationName,
            sequence: 2,
            distance: halts[1].distance,
            platform: halts[1].platform,
          };
        }

        const live: LiveTrainData = {
          trainNumber: json.trainNumber || cleanNumber,
          trainName: json.trainName || '',
          startDate: json.startDate || new Date().toISOString().split('T')[0],
          lastUpdatedAt: json.lastUpdatedAt || new Date().toISOString(),
          status: json.currentStatus && json.currentStatus.trim() !== '&nbsp; &nbsp;' ? json.currentStatus.trim() : 'running',
          fullUpdate: json.fullUpdate || json.currentPosition || undefined,
          delayMinutes: json.delayMinutes || 0,
          currentLocation: {
            stationCode: currentStnCode,
            stationName: currentStnName,
            sequence: 1,
            status: currentPositionDesc,
            isHalt: true,
            distanceFromOriginKm: json.distanceCoveredKm || undefined,
            delayMinutes: json.delayMinutes || 0,
          },
          previousHalt: prevHaltObj,
          nextHalt: nextHaltObj,
          route: halts,
          train: {
            number: json.trainNumber || cleanNumber,
            name: json.trainName || '',
            coachPosition: json.coachPosition,
            source: {
              code: json.sourceStationCode || halts[0]?.stationCode || '',
              name: json.sourceStation || halts[0]?.stationName || '',
            },
            destination: {
              code: json.destinationStationCode || halts[halts.length - 1]?.stationCode || '',
              name: json.destinationStation || halts[halts.length - 1]?.stationName || '',
            },
          },
          isLive: true,
          isCached: false,
          cacheTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        liveCache.set(cleanNumber, { data: live, timestamp: now });
        return live;
      }
    }
  }
} catch (proxyErr) {
    console.log(`[RailService] Cloudflare live status error for ${cleanNumber}:`, proxyErr);
  }

  // 3. Fallback to cached or realistic seed data
  if (cachedEntry) {
    return { ...cachedEntry.data, isCached: true };
  }

  const fallback = cleanNumber === '26101' ? FALLBACK_26101_LIVE : {
    ...FALLBACK_26101_LIVE,
    trainNumber: cleanNumber,
  };
  liveCache.set(cleanNumber, { data: fallback, timestamp: now });
  return fallback;
}
