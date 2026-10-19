import {
  parseSharedOrClipboardText,
  checkClipboardForTicket,
  resetLastClipboardText,
} from '../src/services/shareAndClipboardService';
import Clipboard from '@react-native-clipboard/clipboard';

jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(),
  setString: jest.fn(),
}));

describe('Share and Clipboard Service Suite', () => {
  beforeEach(() => {
    resetLastClipboardText();
    jest.clearAllMocks();
  });

  const SAMPLE_IRCTC_SMS =
    'PNR:4341568676,TRAIN:12626,DOJ:12-10-2026,TIME:20:10,CLASS:3A,NDLS TO SBC,NAME:RAKESH KUMAR+,COACH:B1,SEAT:22,FARE:2450,SC:11.80.';

  const SAMPLE_REDRAIL_SMS =
    'Your redRail booking is confirmed! PNR: 2451239870, Train: 12952 / MMCT TEJAS RAJ, Date: 20-10-2026, From: NDLS To: MMCT, Passenger: AMIT SHARMA, Coach: B2, Seat: 45, Status: CNF.';

  test('Parses full IRCTC SMS from share sheet', () => {
    const ticket = parseSharedOrClipboardText(SAMPLE_IRCTC_SMS, 'share');
    expect(ticket).not.toBeNull();
    expect(ticket?.pnr).toBe('4341568676');
    expect(ticket?.train.number).toBe('12626');
    expect(ticket?.passenger.name).toBe('RAKESH KUMAR');
    expect(ticket?.passenger.coach).toBe('B1');
    expect(ticket?.passenger.seat).toBe('22');
  });

  test('Parses redRail SMS from clipboard', () => {
    const ticket = parseSharedOrClipboardText(SAMPLE_REDRAIL_SMS, 'clipboard');
    expect(ticket).not.toBeNull();
    expect(ticket?.pnr).toBe('2451239870');
    expect(ticket?.train.number).toBe('12952');
    expect(ticket?.passenger.name).toBe('AMIT SHARMA');
  });

  test('Parses raw 10-digit PNR into a NormalizedTicket stub', () => {
    const rawPnr = '8354766445';
    const ticket = parseSharedOrClipboardText(rawPnr, 'clipboard');
    expect(ticket).not.toBeNull();
    expect(ticket?.pnr).toBe('8354766445');
    expect(ticket?.source).toBe('CLIPBOARD');
    expect(ticket?.status).toBe('CONFIRMED');
  });

  test('Parses PNR prefix with train number in text', () => {
    const sharedText = 'Hey, check my train booking: PNR 6451238901 on Train 26101';
    const ticket = parseSharedOrClipboardText(sharedText, 'share');
    expect(ticket).not.toBeNull();
    expect(ticket?.pnr).toBe('6451238901');
    expect(ticket?.train.number).toBe('26101');
    expect(['SHARE', 'IRCTC']).toContain(ticket?.source);
  });

  test('Returns null for non-ticket random strings', () => {
    expect(parseSharedOrClipboardText('hello how are you', 'clipboard')).toBeNull();
    expect(parseSharedOrClipboardText('12345', 'clipboard')).toBeNull();
    expect(parseSharedOrClipboardText('', 'share')).toBeNull();
  });

  test('checkClipboardForTicket reads clipboard and deduplicates identical string', async () => {
    (Clipboard.getString as jest.Mock).mockResolvedValueOnce(SAMPLE_IRCTC_SMS);

    const firstCheck = await checkClipboardForTicket();
    expect(firstCheck).not.toBeNull();
    expect(firstCheck?.pnr).toBe('4341568676');

    // Second consecutive check with same clipboard content returns null to avoid spamming the user
    (Clipboard.getString as jest.Mock).mockResolvedValueOnce(SAMPLE_IRCTC_SMS);
    const secondCheck = await checkClipboardForTicket();
    expect(secondCheck).toBeNull();

    // Forced check still returns the ticket when not duplicate
    (Clipboard.getString as jest.Mock).mockResolvedValueOnce(SAMPLE_IRCTC_SMS);
    const forcedCheck = await checkClipboardForTicket(true);
    expect(forcedCheck).not.toBeNull();
    expect(forcedCheck?.pnr).toBe('4341568676');
  });

  test('Suppresses prompt if ticket is already saved in wallet even with force=true', async () => {
    const { ticketRepository } = require('../src/database/repositories/ticketRepository');
    jest.spyOn(ticketRepository, 'isDuplicatePNR').mockResolvedValueOnce(true);

    (Clipboard.getString as jest.Mock).mockResolvedValueOnce(SAMPLE_IRCTC_SMS);
    const result = await checkClipboardForTicket(true);
    expect(result).toBeNull();
  });
});
