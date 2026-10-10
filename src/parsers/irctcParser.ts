import { NormalizedTicket, TicketStatus } from '../types/ticket';
import { NotificationParser } from './types';
import { getStationName, getTrainName } from '../utils/stationLookup';
import { formatDoj, isTicketValidAndUpcoming } from '../utils/dateUtils';

export const irctcParser: NotificationParser = {
  name: 'IRCTC',

  canParse(text: string, packageName?: string): boolean {
    const lower = text.toLowerCase();
    const pkg = (packageName || '').toLowerCase();
    if (pkg.includes('irctc') || pkg.includes('cris') || pkg.includes('irsms')) return true;
    if (
      lower.includes('irctc') ||
      lower.includes('ir-cris') ||
      lower.includes('irsms') ||
      lower.includes('indianrail') ||
      lower.includes('chart prep')
    ) {
      return true;
    }
    return /pnr\s*[:=-]?\s*\d{10}/i.test(text) && /tr(?:n|ain)\s*[:=-]?\s*\d{5}/i.test(text);
  },

  parse(text: string): Partial<NormalizedTicket> | null {
    try {
      // 1. PNR
      const pnrMatch = text.match(/pnr\s*(?:no)?\s*[:=\-]?\s*(\d{10})/i);
      if (!pnrMatch) return null;
      const pnr = pnrMatch[1];

      // Cancellation check
      const isCancelled = /cancelled|canceled/i.test(text);

      // 2. Train Number
      const trainMatch = text.match(/tr(?:n|ain)\s*(?:no)?\s*[:=\-]?\s*(\d{5})/i);
      const trainNumber = trainMatch ? trainMatch[1] : '';
      const trainName = getTrainName(trainNumber);

      // 3. DOJ / Travel Date (DOJ:12-10-2026, Dt:24-09-26, Dt:24-Sep-26, etc.)
      const dojMatch =
        text.match(/(?:doj|dt|date\s*of\s*journey|travel\s*date|\bdate)\s*[:=\-]?\s*([0-9]{1,2}[-/.](?:[0-9]{1,2}|[A-Za-z]{3,9})[-/.][0-9]{2,4})/i) ||
        text.match(/(?:doj|dt|date\s*of\s*journey|travel\s*date|\bdate)\s*[:=\-]?\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4})/i) ||
        text.match(/(?:doj|dt|date\s*of\s*journey|travel\s*date|\bdate)\s*[:=\-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{2,4})/i) ||
        text.match(/(?:doj|dt|\bdate)\s*[:=\-]?\s*([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2})/i);
      const rawDoj = dojMatch ? dojMatch[1] : '';
      const formattedDate = formatDoj(rawDoj);

      // 4. Status (CONFIRMED, WAITLISTED, RAC, CANCELLED)
      const statusMatch =
        text.match(/current\s*status\s*[:=\-]?\s*([A-Za-z0-9]+)/i) ||
        text.match(/\bstatus\s*[:=\-]?\s*([A-Za-z0-9]+)/i);
      const rawStatus = (statusMatch ? statusMatch[1] : '').toUpperCase();

      let bookingStatus = 'CONFIRMED';
      let ticketStatus: TicketStatus = 'CONFIRMED';

      if (isCancelled) {
        bookingStatus = 'CANCELLED';
        ticketStatus = 'CANCELLED';
      } else if (rawStatus.includes('WL')) {
        bookingStatus = rawStatus;
        ticketStatus = 'WAITLISTED';
      } else if (rawStatus.includes('RAC')) {
        bookingStatus = rawStatus;
        ticketStatus = 'RAC';
      } else if (rawStatus.includes('CNF')) {
        bookingStatus = 'CONFIRMED';
        ticketStatus = 'CONFIRMED';
      }

      // 5. Class (CLASS:3A, Cls:SL, ,CC,, etc.)
      const classMatch =
        text.match(/\b(?:class|cls)\s*[:=\-]?\s*([1-3A-Za-z]{2,3})\b/i) ||
        text.match(/\b(1A|2A|3A|3E|CC|EC|EA|SL|2S)\b/i);
      const travelClass = classMatch ? classMatch[1].toUpperCase() : 'SL';

      // 6. Route
      let fromStation = '';
      let toStation = '';

      const fromToKV = text.match(/from\s*:\s*([A-Za-z]{2,5})\s+to\s*:\s*([A-Za-z]{2,5})/i);
      const frmTo = text.match(/(?:frm|from)\s+([A-Za-z]{2,5})\s+to\s+([A-Za-z]{2,5})/i);
      const toSep = text.match(/\b([A-Z]{2,5})\s+TO\s+([A-Z]{2,5})\b/);

      if (fromToKV) {
        fromStation = fromToKV[1].toUpperCase();
        toStation = fromToKV[2].toUpperCase();
      } else if (frmTo) {
        fromStation = frmTo[1].toUpperCase();
        toStation = frmTo[2].toUpperCase();
      } else if (toSep) {
        fromStation = toSep[1].toUpperCase();
        toStation = toSep[2].toUpperCase();
      } else {
        const hyphenMatches = Array.from(text.matchAll(/\b([A-Z]{2,5})\s*[-–]\s*([A-Z]{2,5})\b/g));
        for (const match of hyphenMatches) {
          const a = match[1].toUpperCase();
          const b = match[2].toUpperCase();
          const ignoredCodes = ['IR', 'CRIS', 'TRN', 'PNR', 'DEP', 'CLS', 'SMS', 'URL'];
          if (!ignoredCodes.includes(a) && !ignoredCodes.includes(b)) {
            fromStation = a;
            toStation = b;
            break;
          }
        }
      }

      // 7. Departure time (TIME:20:10, DP:06:25, Dep.Time-00:15 Hrs.)
      const depMatch = text.match(/(?:time|dp|dep\.?\s*time)\s*[:=\-]?\s*([0-9]{1,2}:[0-9]{2})/i);
      let departureTime = depMatch ? depMatch[1] : '';
      if (departureTime && !departureTime.includes('AM') && !departureTime.includes('PM')) {
        const [h, m] = departureTime.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedH = (h % 12 || 12).toString().padStart(2, '0');
        departureTime = `${formattedH}:${m.toString().padStart(2, '0')} ${ampm}`;
      }

      // 8. Boarding station
      const boardingMatch = text.match(/boarding\s+(?:at|allowed\s+from)\s+([A-Za-z]{2,10})/i);
      const boardingStation = boardingMatch ? boardingMatch[1].toUpperCase() : fromStation;

      // 9. Coach & Seat
      let coach = '-';
      let seat = '-';

      const coachMatch = text.match(/\bcoach\s*[:=\-]?\s*([A-Z][0-9]{1,2})\b/i);
      const seatMatch = text.match(/\bseat\s*[:=\-]?\s*([0-9]{1,3})\b/i);

      if (coachMatch) {
        coach = coachMatch[1].toUpperCase();
      }
      if (seatMatch) {
        seat = seatMatch[1];
      }

      if (coach === '-' || seat === '-') {
        // Match patterns like P1-B6,32 or C5 64
        const pSeatMatch = text.match(/(?:[P0-9]+-)?([A-Z][0-9]{1,2})[\s,]+([0-9]{1,3})\b/);
        if (pSeatMatch) {
          if (coach === '-') coach = pSeatMatch[1].toUpperCase();
          if (seat === '-') seat = pSeatMatch[2];
        }
      }

      // 10. Passenger name ("hey if there no name for pasinger show -")
      let passengerName = '-';
      const nameMatch =
        text.match(/\bname\s*[:=\-]?\s*([A-Za-z\s]+?)\+?(?:,|$|\n)/i) ||
        text.match(/\bpassenger\s*[:=\-]?\s*([A-Za-z\s]+?)(?:,|$|\n)/i) ||
        text.match(/(?:only,\s*|\n)([A-Z\s]{3,30}),\s*[A-Z0-9]/i) ||
        text.match(/\bdear\s+([A-Za-z\s]{3,30}),/i);

      if (nameMatch) {
        const cleanName = nameMatch[1].replace('+', '').trim();
        if (cleanName && cleanName.length >= 2 && !cleanName.includes(':')) {
          passengerName = cleanName;
        }
      }

      // 11. Fare & Convenience fee
      const fareMatch = text.match(/\bfare\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
      const totalFare = fareMatch ? parseFloat(fareMatch[1]) : undefined;

      const feeMatch = text.match(/\b(?:sc|c\s*fee)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
      const fee = feeMatch ? parseFloat(feeMatch[1]) : undefined;
      const baseFare = totalFare && fee ? Math.round(totalFare - fee) : totalFare;

      const classDisplayNames: Record<string, string> = {
        CC: 'CC Chair Car',
        EC: 'EC Executive Chair',
        SL: 'SL Sleeper Class',
        '2S': '2S Second Sitting',
        '3A': '3A 3-Tier AC',
        '2A': '2A 2-Tier AC',
        '1A': '1A First AC',
        '3E': '3E AC Economy',
      };

      const isUpcoming = isTicketValidAndUpcoming(formattedDate, ticketStatus, departureTime);

      return {
        id: `ticket_${pnr}`,
        source: 'IRCTC',
        pnr,
        train: {
          number: trainNumber,
          name: trainName,
          type: trainNumber ? `SUPERFAST ${trainNumber}` : 'EXPRESS',
        },
        journey: {
          from: fromStation,
          fromName: getStationName(fromStation),
          to: toStation,
          toName: getStationName(toStation),
          date: formattedDate,
          departure: departureTime || undefined,
          boardingStation: boardingStation || fromStation,
        },
        passenger: {
          name: passengerName,
          coach: coach !== '-' ? coach : undefined,
          seat: seat !== '-' ? seat : undefined,
          class: travelClass,
          className: classDisplayNames[travelClass] || `${travelClass} Class`,
          bookingStatus,
        },
        fare: totalFare
          ? {
              base: baseFare,
              convenienceFee: fee,
              total: totalFare,
            }
          : undefined,
        status: ticketStatus,
        rawMessage: text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isUpcoming,
      };
    } catch {
      return null;
    }
  },
};
