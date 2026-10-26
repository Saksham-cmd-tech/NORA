const MONTHS_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export interface ParsedDateComponents {
  day: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  year: number;
}

/**
 * Robustly parses any raw date string into day, month (0-indexed), and 4-digit year.
 * Handles:
 * - dd-mm-yy, dd-mm-yyyy, dd/mm/yy, dd/mm/yyyy, dd.mm.yy, dd.mm.yyyy
 * - dd-MMM-yy, dd-MMM-yyyy, dd/MMM/yy, dd/MMM/yyyy (e.g. 24-Sep-26, 24-SEP-2026, 08-Oct-2026)
 * - dd MMM yyyy, d MMM yyyy, dd MMM, yyyy (e.g. 08 Oct 2026, 8 Oct 2026)
 * - MMM dd yyyy, MMM dd, yyyy (e.g. Oct 08, 2026)
 * - yyyy-mm-dd, yyyy/mm/dd (ISO format: 2026-10-08)
 */
export function parseDateComponents(rawDate?: string): ParsedDateComponents | null {
  if (!rawDate) return null;
  const clean = rawDate.trim().replace(/,/g, '');
  if (!clean) return null;

  // 1. ISO format: yyyy-mm-dd or yyyy/mm/dd
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }

  // 2. Delimiter separated: dd-mm-yy, dd-MMM-yy, etc.
  const delimParts = clean.split(/[-/.]/);
  if (delimParts.length === 3) {
    const p0 = delimParts[0].trim();
    const p1 = delimParts[1].trim();
    const p2 = delimParts[2].trim();

    // Year first: yyyy-mm-dd fallback
    if (p0.length === 4 && !isNaN(Number(p0))) {
      const year = parseInt(p0, 10);
      let month = -1;
      if (!isNaN(Number(p1))) {
        month = parseInt(p1, 10) - 1;
      } else {
        const mKey = p1.toLowerCase();
        month = MONTHS_MAP[mKey] ?? MONTHS_MAP[mKey.slice(0, 3)] ?? -1;
      }
      const day = parseInt(p2, 10);
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        return { day, month, year };
      }
    }

    // Day first: dd-mm-yy, dd-MMM-yy, dd-mm-yyyy, dd-MMM-yyyy
    const day = parseInt(p0, 10);
    if (!isNaN(day) && day >= 1 && day <= 31) {
      let month = -1;
      if (!isNaN(Number(p1))) {
        month = parseInt(p1, 10) - 1;
      } else {
        const mKey = p1.toLowerCase();
        month = MONTHS_MAP[mKey] ?? MONTHS_MAP[mKey.slice(0, 3)] ?? -1;
      }

      let year = parseInt(p2, 10);
      if (!isNaN(year) && month >= 0 && month <= 11) {
        if (year < 100) year += 2000;
        return { day, month, year };
      }
    }
  }

  // 3. Space separated: "08 Oct 2026" or "Oct 08 2026"
  const spaceParts = clean.split(/\s+/);
  if (spaceParts.length === 3) {
    const s0 = spaceParts[0].trim();
    const s1 = spaceParts[1].trim();
    const s2 = spaceParts[2].trim();

    // "Oct 08 2026"
    if (isNaN(Number(s0))) {
      const mKey = s0.toLowerCase();
      const month = MONTHS_MAP[mKey] ?? MONTHS_MAP[mKey.slice(0, 3)] ?? -1;
      const day = parseInt(s1, 10);
      let year = parseInt(s2, 10);
      if (!isNaN(year) && year < 100) year += 2000;
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && !isNaN(year)) {
        return { day, month, year };
      }
    } else {
      // "08 Oct 2026" or "08 10 2026"
      const day = parseInt(s0, 10);
      let month = -1;
      if (!isNaN(Number(s1))) {
        month = parseInt(s1, 10) - 1;
      } else {
        const mKey = s1.toLowerCase();
        month = MONTHS_MAP[mKey] ?? MONTHS_MAP[mKey.slice(0, 3)] ?? -1;
      }
      let year = parseInt(s2, 10);
      if (!isNaN(year) && year < 100) year += 2000;
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && !isNaN(year)) {
        return { day, month, year };
      }
    }
  }

  return null;
}

/**
 * Format any raw date string (dd-mm-yy, dd-mm-yyyy, 24-Sep-26, Oct 08 2026, etc.)
 * to standard NORA display format: "08 Oct 2026"
 */
export function formatDoj(rawDoj?: string): string {
  if (!rawDoj) return '';
  const parsed = parseDateComponents(rawDoj);
  if (!parsed) return rawDoj.trim();
  const dayStr = parsed.day.toString().padStart(2, '0');
  const monthStr = MONTH_NAMES[parsed.month] || 'Jan';
  return `${dayStr} ${monthStr} ${parsed.year}`;
}

/**
 * Parses a ticket date string (and optional departure time) into a Date object.
 */
export function parseTicketJourneyDate(dateStr?: string, departureTime?: string): Date | null {
  if (!dateStr) return null;
  const parsed = parseDateComponents(dateStr);
  if (!parsed) return null;

  let hours = 23;
  let minutes = 59;
  let seconds = 59;
  let ms = 999;

  if (departureTime && departureTime.trim().length > 0) {
    const timeClean = departureTime.trim().toUpperCase();
    const timeMatch = timeClean.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const period = timeMatch[3];
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        hours = h;
        minutes = m;
        seconds = 0;
        ms = 0;
      }
    }
  }

  const d = new Date(parsed.year, parsed.month, parsed.day, hours, minutes, seconds, ms);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns true ONLY if ticket is upcoming / still valid.
 * - Missing or unparseable dates return FALSE (strictly invalid).
 * - Cancelled or completed tickets return FALSE.
 * - Dates in the past (yesterday or earlier) return FALSE.
 * - For today's date, if departure happened > 12 hours ago, returns FALSE.
 */
export function isTicketValidAndUpcoming(
  dateStr?: string,
  status?: string,
  departureTime?: string
): boolean {
  if (status === 'CANCELLED' || status === 'COMPLETED') return false;
  if (!dateStr || dateStr.trim().length === 0) return false;

  const parsed = parseDateComponents(dateStr);
  if (!parsed) return false;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const journeyMidnight = new Date(parsed.year, parsed.month, parsed.day, 0, 0, 0, 0);

  // 1. Strict past check: if journey date was yesterday or earlier, it's expired
  if (journeyMidnight.getTime() < todayMidnight.getTime()) {
    return false;
  }

  // 2. Future check: if journey date is tomorrow or later, it's definitely upcoming
  if (journeyMidnight.getTime() > todayMidnight.getTime()) {
    return true;
  }

  // 3. Journey is TODAY: check departure time if available
  if (departureTime) {
    const depDate = parseTicketJourneyDate(dateStr, departureTime);
    if (depDate) {
      const hoursSinceDeparture = (now.getTime() - depDate.getTime()) / (1000 * 60 * 60);
      // If departure happened more than 12 hours ago today, journey is completed/expired
      if (hoursSinceDeparture > 12) {
        return false;
      }
    }
  }

  return true;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Returns formatted date with day name: e.g. "Thursday, 08 Oct 2026"
 */
export function getDetailedDateString(dateStr?: string): string {
  if (!dateStr) return '';
  const parsed = parseTicketJourneyDate(dateStr);
  if (!parsed) return formatDoj(dateStr);
  const dayName = DAYS[parsed.getDay()];
  return `${dayName}, ${formatDoj(dateStr)}`;
}

/**
 * Returns true if the journey date is not of today, or if departure time is greater than 1 hour away.
 * When true, live radar telemetry and station fetching should NOT be triggered.
 */
export function isEarlyJourney(dateStr?: string, departureTime?: string): boolean {
  if (!dateStr && !departureTime) return false;
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();

  if (dateStr && dateStr.trim().toLowerCase() !== 'today') {
    const parsed = parseDateComponents(dateStr);
    if (parsed) {
      year = parsed.year;
      month = parsed.month;
      day = parsed.day;
    } else {
      const p = new Date(dateStr);
      if (!isNaN(p.getTime())) {
        year = /\d{4}/.test(dateStr) ? p.getFullYear() : now.getFullYear();
        month = p.getMonth();
        day = p.getDate();
      }
    }
  }

  let hours = 0;
  let minutes = 0;
  if (departureTime && departureTime.trim().length > 0) {
    const timeClean = departureTime.trim().toUpperCase();
    const timeMatch = timeClean.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const period = timeMatch[3];
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      hours = h;
      minutes = m;
    }
  }

  const journeyDate = new Date(year, month, day, hours, minutes, 0, 0);
  const diffMs = journeyDate.getTime() - now.getTime();
  return diffMs > 60 * 60 * 1000;
}


