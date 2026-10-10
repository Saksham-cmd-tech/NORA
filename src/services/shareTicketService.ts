import { NativeModules, Share, Platform } from 'react-native';
import { NormalizedTicket } from '../types/ticket';
import { getTrainName, getStationName } from '../utils/stationLookup';

const { NoraShareModule } = NativeModules;

export interface ShareTicketData {
  trainNumber: string;
  trainName: string;
  trainType?: string;
  fromCode: string;
  fromTime: string;
  toCode: string;
  toTime: string;
  coach: string;
  seat: string;
  platform?: string;
  pillar?: string;
  pnr: string;
  status?: string;
  isLive?: boolean;
  shareText?: string;
}

/**
 * Maps a NormalizedTicket to the ShareTicketData structure.
 */
export function buildShareTicketData(
  ticket: NormalizedTicket,
  options?: {
    platform?: string;
    pillar?: string;
    isLive?: boolean;
  }
): ShareTicketData {
  const trainNum = ticket.train.number || '26101';
  const rawTrainName = ticket.train.name || getTrainName(trainNum) || 'Ajni Vande Bharat Express';
  const cleanTrainName =
    rawTrainName.replace(new RegExp(`^${trainNum}\\s*[-·•:]?\\s*`, 'i'), '').trim() ||
    rawTrainName;
  const trainName = cleanTrainName;
  const trainType =
    cleanTrainName.toUpperCase().includes('VANDE BHARAT')
      ? 'VANDE BHARAT'
      : (ticket.train.type || 'SUPERFAST').toUpperCase();

  const fromCode = (ticket.journey.from || 'PUNE').trim().toUpperCase();
  const toCode = (ticket.journey.to || 'BD').trim().toUpperCase();
  const fromName =
    ticket.journey.fromName || getStationName(fromCode) || `${fromCode} Junction`;
  const toName =
    ticket.journey.toName || getStationName(toCode) || `${toCode} Junction`;

  const journeyDate = ticket.journey.date || '08 Oct 2026';
  const fromTime = ticket.journey.departure || '06:25 AM';
  const toTime = ticket.journey.arrival || '03:48 PM';

  const coach = (ticket.passenger.coach || 'C5').trim().toUpperCase();
  const seat = ticket.passenger.seat || '64';
  const platform = options?.platform || '5';
  const pillar = options?.pillar || '11';
  const pnr = ticket.pnr || '8354766445';

  const rawStatus = (ticket.passenger.bookingStatus || ticket.status || 'Confirmed').trim();
  let displayStatus = 'Confirmed';
  const upperStatus = rawStatus.toUpperCase();
  if (upperStatus === 'CONFIRMED' || upperStatus === 'CNF') {
    displayStatus = 'Confirmed';
  } else if (upperStatus === 'RAC') {
    displayStatus = 'RAC';
  } else if (upperStatus.includes('WL') || upperStatus === 'WAITLISTED') {
    displayStatus = 'Waitlisted';
  } else if (rawStatus.length > 0) {
    displayStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
  }

  const status = upperStatus === 'CONFIRMED' ? 'CNF' : rawStatus;
  const isLive = options?.isLive ?? false;

  const platformLine = pillar
    ? `Platform ${platform} · Pillar ${pillar}`
    : `Platform ${platform}`;

  const shareText = [
    `${trainNum} · ${cleanTrainName}`,
    `${fromCode} → ${toCode}`,
    `${fromName} → ${toName}`,
    `${journeyDate} · ${fromTime}`,
    `Coach ${coach}`,
    `Seat ${seat}`,
    platformLine,
    `PNR ${pnr}`,
    `Status · ${displayStatus}`,
  ].join('\n');

  return {
    trainNumber: trainNum,
    trainName,
    trainType,
    fromCode,
    fromTime,
    toCode,
    toTime,
    coach,
    seat,
    platform,
    pillar,
    pnr,
    status,
    isLive,
    shareText,
  };
}

/**
 * Triggers the native image creation and shares the generated ticket card
 * directly to external apps via Android Intent with FileProvider.
 */
export async function shareTicketImage(
  data: ShareTicketData
): Promise<{ success: boolean; filePath?: string }> {
  try {
    if (Platform.OS === 'android' && NoraShareModule?.shareTicketImage) {
      const res = await NoraShareModule.shareTicketImage(data);
      return res;
    }

    // Fallback for environments without native module (e.g. testing)
    await Share.share({
      title: `Train Ticket - ${data.trainNumber}`,
      message: data.shareText || `Train ${data.trainNumber} • PNR ${data.pnr}`,
    });
    return { success: true };
  } catch (error) {
    console.log('[shareTicketService] shareTicketImage error:', error);
    // Fallback to text share
    try {
      await Share.share({
        title: `Train Ticket - ${data.trainNumber}`,
        message: data.shareText || `Train ${data.trainNumber} • PNR ${data.pnr}`,
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }
}

/**
 * Returns Base64 of the generated ticket card for preview.
 */
export async function getTicketImageBase64(
  data: ShareTicketData
): Promise<string | null> {
  try {
    if (Platform.OS === 'android' && NoraShareModule?.getTicketImageBase64) {
      return await NoraShareModule.getTicketImageBase64(data);
    }
    return null;
  } catch (error) {
    console.log('[shareTicketService] getTicketImageBase64 error:', error);
    return null;
  }
}
