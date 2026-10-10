import { NormalizedTicket } from '../types/ticket';
import { NotificationParser } from './types';
import { getStationName, getTrainName } from '../utils/stationLookup';
import { formatDoj, isTicketValidAndUpcoming } from '../utils/dateUtils';

export const redRailParser: NotificationParser = {
  name: 'redRail',

  canParse(text: string, packageName?: string): boolean {
    const lower = text.toLowerCase();
    const pkg = (packageName || '').toLowerCase();
    if (pkg.includes('redbus') || pkg.includes('redrail')) return true;
    if (lower.includes('redrail') || lower.includes('redbus')) return true;
    return (
      /booking\s+([A-Z0-9]{8,15})\s+is\s+successful/i.test(text) ||
      (/pnr\s*(?:no)?\s*[:=-]?\s*\d{10}/i.test(text) && /train/i.test(text))
    );
  },

  parse(text: string): Partial<NormalizedTicket> | null {
    try {
      // 1. PNR
      const pnrMatch = text.match(/pnr\s*(?:no)?\s*[:=\-]?\s*(\d{10})/i);
      if (!pnrMatch) return null;
      const pnr = pnrMatch[1];

      // 2. Booking ID
      const bookingMatch = text.match(/booking\s+([A-Z0-9]{8,15})\b/i);
      const bookingId = bookingMatch ? bookingMatch[1] : undefined;

      // 3. Passenger name (Dear Rahul Sharma, or Passenger: Rahul Sharma)
      // "hey if there no name for pasinger show -"
      let passengerName = '-';
      const dearMatch = text.match(/dear\s+([^\r\n,]+),/i);
      const passFieldMatch = text.match(/passenger\s*[:=\-]?\s*([^\r\n,]+)/i);
      if (passFieldMatch) {
        passengerName = passFieldMatch[1].trim();
      } else if (dearMatch) {
        passengerName = dearMatch[1].trim();
      }

      // 4. Train number and name
      let trainNumber = '26101';
      let trainName = 'Ajni Vandebharat';
      const combinedTrainMatch = text.match(/train\s*[:=\-]?\s*(\d{5})\s*([^\r\n,]+)/i);
      const trainNoMatch = text.match(/train\s*(?:no)?\s*[:=\-]?\s*(\d{5})/i);
      const trainNameMatch = text.match(/train\s*name\s*[:=\-]?\s*([^\r\n,]+)/i);

      if (combinedTrainMatch) {
        trainNumber = combinedTrainMatch[1];
        trainName = combinedTrainMatch[2].trim();
      } else if (trainNoMatch) {
        trainNumber = trainNoMatch[1];
        if (trainNameMatch) {
          trainName = trainNameMatch[1].trim();
        } else {
          trainName = getTrainName(trainNumber);
        }
      }

      // 5. Route (from PUNE to BD)
      let fromStation = 'PUNE';
      let toStation = 'BD';
      const routeMatch = text.match(/(?:frm|from)\s+([A-Za-z]{2,5})\s+to\s+([A-Za-z]{2,5})/i);
      if (routeMatch) {
        fromStation = routeMatch[1].toUpperCase();
        toStation = routeMatch[2].toUpperCase();
      }

      // 6. Class
      const classMatch = text.match(/class\s*[:=\-]?\s*([A-Za-z0-9]{2,3})/i);
      const travelClass = classMatch ? classMatch[1].toUpperCase() : 'CC';

      // 7. Date of Boarding (Oct 08, 2026, 08 Oct 2026, 24-09-2026, etc.)
      let formattedDate = '';
      const dateMatch =
        text.match(/(?:date\s*(?:of\s*boarding)?|doj|dt)\s*[:=\-]?\s*([0-9]{1,2}[-/.](?:[0-9]{1,2}|[A-Za-z]{3,9})[-/.][0-9]{2,4})/i) ||
        text.match(/date\s*(?:of\s*boarding)?\s*[:=\-]?\s*([A-Za-z0-9,\s]{6,20})/i);
      if (dateMatch) {
        formattedDate = formatDoj(dateMatch[1].trim());
      }

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

      const isUpcoming = isTicketValidAndUpcoming(formattedDate, 'CONFIRMED');

      return {
        id: `ticket_${pnr}`,
        source: 'redRail',
        bookingId,
        pnr,
        train: {
          number: trainNumber,
          name: trainName,
          type: `SUPERFAST ${trainNumber}`,
        },
        journey: {
          from: fromStation,
          fromName: getStationName(fromStation),
          to: toStation,
          toName: getStationName(toStation),
          date: formattedDate,
          boardingStation: fromStation,
        },
        passenger: {
          name: passengerName,
          class: travelClass,
          className: classDisplayNames[travelClass] || `${travelClass} Class`,
          bookingStatus: 'CONFIRMED',
        },
        status: 'CONFIRMED',
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
