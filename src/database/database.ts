import { NativeModules, Platform } from 'react-native';
import { NormalizedTicket } from '../types/ticket';

const STORAGE_KEY_ONBOARDING = 'nora_onboarding_completed';
const STORAGE_KEY_TICKETS = 'nora_tickets_v1';

// In-memory cache backed by persistent storage
let ticketsStore: NormalizedTicket[] = [];
let hasCompletedOnboardingFlag = false;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

const getNotificationModule = () => NativeModules?.NoraNotificationModule;

export async function initDatabase(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 1. Load persistent onboarding & tickets from native storage
      const mod = getNotificationModule();
      if (Platform.OS === 'android' && mod?.getStoredData) {
        const onboardingVal = await mod.getStoredData(STORAGE_KEY_ONBOARDING);
        if (onboardingVal === 'true') {
          hasCompletedOnboardingFlag = true;
        }

        const ticketsRaw = await mod.getStoredData(STORAGE_KEY_TICKETS);
        if (ticketsRaw) {
          try {
            const parsed = JSON.parse(ticketsRaw);
            if (Array.isArray(parsed)) {
              ticketsStore = parsed;
            }
          } catch (_) {}
        }
      }

    // 2. Initialize op-sqlite table if available
    try {
      const { open } = require('@op-engineering/op-sqlite');
      const db = open({ name: 'nora_tickets.sqlite' });
      db.execute(`
        CREATE TABLE IF NOT EXISTS tickets (
          id TEXT PRIMARY KEY,
          pnr TEXT UNIQUE,
          source TEXT,
          booking_id TEXT,
          train_number TEXT,
          train_name TEXT,
          from_station TEXT,
          to_station TEXT,
          journey_date TEXT,
          departure_time TEXT,
          arrival_time TEXT,
          passenger_name TEXT,
          coach TEXT,
          seat TEXT,
          class TEXT,
          fare_total REAL,
          status TEXT,
          is_upcoming INTEGER,
          raw_json TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);
    } catch (_) {
      // Safe fallback
    }
  } catch (err) {
    console.log('[NORA DB] Persistence init warning:', err);
  } finally {
    isInitialized = true;
  }
})();

  return initPromise;
}

export function getLocalStore(): NormalizedTicket[] {
  return [...ticketsStore];
}

export function updateLocalStore(updated: NormalizedTicket[]): void {
  const seenPnr = new Map<string, NormalizedTicket>();
  const deduplicated: NormalizedTicket[] = [];

  for (const t of updated) {
    const pnrKey = (t.pnr || '').replace(/[\s-]+/g, '').trim().toUpperCase();
    if (pnrKey) {
      if (seenPnr.has(pnrKey)) {
        const existing = seenPnr.get(pnrKey)!;
        // Merge without duplicating
        const merged = { ...existing, ...t, updatedAt: new Date().toISOString() };
        seenPnr.set(pnrKey, merged);
        const idx = deduplicated.findIndex(
          (x) => (x.pnr || '').replace(/[\s-]+/g, '').trim().toUpperCase() === pnrKey
        );
        if (idx !== -1) {
          deduplicated[idx] = merged;
        }
      } else {
        seenPnr.set(pnrKey, t);
        deduplicated.push(t);
      }
    } else {
      if (!deduplicated.some((x) => x.id === t.id)) {
        deduplicated.push(t);
      }
    }
  }

  ticketsStore = deduplicated;

  // Persist to native storage asynchronously
  try {
    const mod = getNotificationModule();
    if (Platform.OS === 'android' && mod?.setStoredData) {
      mod.setStoredData(STORAGE_KEY_TICKETS, JSON.stringify(deduplicated)).catch(() => {});
    }
  } catch (_) {}
}

export function getOnboardingStatus(): boolean {
  return hasCompletedOnboardingFlag;
}

export function setOnboardingStatus(completed: boolean): void {
  hasCompletedOnboardingFlag = completed;
  try {
    const mod = getNotificationModule();
    if (Platform.OS === 'android' && mod?.setStoredData) {
      mod.setStoredData(STORAGE_KEY_ONBOARDING, completed ? 'true' : 'false').catch(() => {});
    }
  } catch (_) {}
}
